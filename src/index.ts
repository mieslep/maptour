import '@fortawesome/fontawesome-free/css/all.min.css';
import '../styles/maptour.css';
import { loadTour } from './loader';
import { MapView } from './map/MapView';
import { NavController } from './navigation/NavController';
import { NavAppPreference } from './navigation/NavAppPreference';
import { GpsTracker } from './gps/GpsTracker';
import { nearestStop } from './gps/nearestStop';
import { ProximityDetector } from './gps/proximityDetector';
import { showError } from './errors/ErrorDisplay';
import { JourneyStateManager } from './journey/JourneyStateManager';
import { TourSession } from './session/TourSession';
import { CardHost } from './card/CardHost';
import { StopCardRenderer } from './card/StopCardRenderer';
import { JourneyCardRenderer } from './card/JourneyCardRenderer';
import { renderWelcomeCard } from './card/WelcomeCard';
import { renderGoodbyeCard } from './card/GoodbyeCard';
import { renderGettingHereCard } from './card/GettingHereCard';
import { renderAboutCard } from './card/AboutCard';
import { MenuBar } from './layout/MenuBar';
import { TourFooter } from './layout/TourFooter';
import { InTransitBar } from './layout/InTransitBar';
import { StopListOverlay } from './layout/StopListOverlay';
import { OverviewControls } from './layout/OverviewControls';
import { buildMobileLayout } from './layout/buildMobileLayout';
import { buildDesktopLayout } from './layout/buildDesktopLayout';
import { createJourneyHandler } from './orchestrator/journeyHandler';
import { GuidanceBanner } from './waypoint/GuidanceBanner';
import { ArrivingBanner } from './card/ArrivingBanner';
import { setStrings, t } from './i18n';
import type { MapTourInitOptions } from './types';

export type { MapTourInitOptions };

function resolveContainer(containerArg: string | HTMLElement): HTMLElement | null {
  return typeof containerArg === 'string'
    ? document.querySelector<HTMLElement>(containerArg)
    : containerArg;
}

async function init(options: MapTourInitOptions): Promise<void> {
  const { container: containerArg, tourUrl, startStop } = options;
  const container = resolveContainer(containerArg);
  if (!container) { console.error(`MapTour: container "${containerArg}" not found`); return; }

  container.innerHTML = '<div class="maptour-loading"><div class="maptour-spinner"></div>Loading tour…</div>';
  const result = await loadTour(tourUrl);
  if (result.error) { showError(container, result.error); return; }
  const tour = result.tour!;
  setStrings(tour.tour.strings);

  container.innerHTML = '';
  container.className = (container.className + ' maptour-container').trim();
  const isMobile = typeof window?.matchMedia === 'function' && !window.matchMedia('(min-width: 768px)').matches;
  const storage = (() => { try { return localStorage; } catch { return null; } })();

  // === Core state ===
  const session = new TourSession(tour.tour.id, tour.stops.length);
  const journeyState = new JourneyStateManager(tour.tour.id, tour.stops.length, storage);

  // === Menu bar + progress bar ===
  const hasGettingHere = !!(tour.tour.getting_here && tour.tour.getting_here.length > 0);
  const menuBar = new MenuBar(container, tour.tour.header_html);
  menuBar.setGettingHereVisible(hasGettingHere);
  const tourFooter = new TourFooter();


  // === Layout ===
  const mapPane = document.createElement('div');
  mapPane.className = 'maptour-map-pane';
  const layoutDeps = { container, mapPane, menuBarEl: menuBar.getElement() };
  const layout = isMobile ? buildMobileLayout(layoutDeps) : buildDesktopLayout(layoutDeps);
  const { mapPanel, sheet, sheetContentEl, cardEl, stopListWrapper, stopListEl, resetScrollHint } = layout;

  // Append tour footer after card element in the appropriate container
  if (isMobile) {
    // In mobile, card-view contains: stopListWrapper, cardEl, scrollHint — insert footer after cardEl
    cardEl.parentElement!.insertBefore(tourFooter.getElement(), cardEl.nextSibling);
  } else if (sheetContentEl) {
    // In desktop, sheet-content contains: menuBar, stopListWrapper, cardEl — append footer after cardEl
    sheetContentEl.appendChild(tourFooter.getElement());
  }

  // === Card system ===
  const cardHost = new CardHost(cardEl);
  const navPreference = new NavAppPreference();
  const stopCardRenderer = new StopCardRenderer(navPreference);
  stopCardRenderer.setTourNavMode(tour.tour.nav_mode);
  const journeyCardRenderer = new JourneyCardRenderer(navPreference);
  journeyCardRenderer.setTourNavMode(tour.tour.nav_mode);

  // === UI components ===
  const transitBar = new InTransitBar(container);
  const guidanceBanner = new GuidanceBanner();
  const arrivingBanner = new ArrivingBanner();
  mapPane.appendChild(guidanceBanner.getElement());
  container.appendChild(arrivingBanner.getElement());
  const stopListOverlay = new StopListOverlay(container);
  const overviewControls = new OverviewControls();
  const mapView = new MapView(mapPane, tour);
  const gpsTracker = new GpsTracker();

  // === Scroll gate (require_scroll) ===
  const requireScroll = tour.tour.require_scroll === true;
  // On mobile, card-view scrolls; on desktop, the sheet wrapper scrolls
  const scrollContainer = isMobile
    ? (cardEl.closest('.maptour-card-view') as HTMLElement ?? cardEl)
    : (cardEl.closest('.maptour-sheet') as HTMLElement ?? cardEl);
  const checkAtBottom = () => scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10;
  const updateScrollGate = () => {
    if (!requireScroll) return;
    requestAnimationFrame(() => {
      const hasOverflow = scrollContainer.scrollHeight > scrollContainer.clientHeight + 10;
      tourFooter.setScrollGate(hasOverflow && !checkAtBottom());
    });
  };
  if (requireScroll) {
    scrollContainer.addEventListener('scroll', () => {
      if (tourFooter.isScrollGated() && checkAtBottom()) {
        tourFooter.setScrollGate(false);
      }
    }, { passive: true });
  }

  // === Shared state ===
  let viewingSystemCard: string | null = null;
  let gpsOverviewApplied = false;
  let isReturningToStart = false;
  let lastGpsPosition: { lat: number; lng: number } | null = null;
  let stopListOpen = false;
  const setStopListOpen = (open: boolean) => {
    stopListOpen = open;
    stopListEl.style.display = open ? '' : 'none';
    stopListWrapper.style.display = open ? '' : 'none';
  };
  setStopListOpen(false);

  /** Update overview map selection (used by pin click, GPS, and direction toggle). */
  const updateOverviewSelection = (index: number) => {
    session.setOverviewSelection(index);
    mapView.setSelectedPin(tour.stops[index].id);
    mapView.setEndPin(tour.stops[session.endIndex].id);
    mapView.flyToStop(tour.stops[index], 16);
    overviewControls.update(index, tour.stops.length, session.reversed, tour.stops[index].title);
    stopListOverlay.update(tour.stops, index, session.getVisited(), session.tourOrder);
  };

  // === Mobile-specific setup ===
  if (isMobile && mapPanel) {
    overviewControls.enableCloseButton();
    overviewControls.onClose(() => mapPanel.hide());
    mapPanel.getElement().appendChild(overviewControls.getElement());

    let mapPanelCentred = false;
    const mapFab = mapPanel.getOpenButton();
    mapPanel.onToggle((isOpen) => {
      menuBar.close();
      mapFab.hidden = isOpen; // hide FAB when map is open
      if (journeyState.getState() === 'tour_start') menuBar.getElement().style.display = isOpen ? 'none' : '';
      mapView.invalidateSize();
      if (isOpen && !mapPanelCentred) {
        mapPanelCentred = true;
        requestAnimationFrame(() => {
          if (lastGpsPosition) {
            const nearest = nearestStop(lastGpsPosition.lat, lastGpsPosition.lng, tour.stops);
            const maxDist = tour.tour.gps?.max_distance ?? 500;
            if (nearest.distance <= maxDist) {
              // User is near the tour — zoom to their position
              mapView.getMap().flyTo([lastGpsPosition.lat, lastGpsPosition.lng], 17, { animate: true });
            } else if (hasGettingHere && journeyState.getState() === 'tour_start') {
              // User is far from the tour — show Getting Here
              viewingSystemCard = 'getting_here';
              tourFooter.hide();
              cardHost.render((c) => renderGettingHereCard(c, { blocks: tour.tour.getting_here!, onBack: dismissSystemCard }));
              mapView.fitBounds();
            } else {
              mapView.fitBounds();
              mapView.triggerSequencePulse();
            }
          } else if (journeyState.getState() === 'at_stop') {
            const idx = navController.getCurrentIndex();
            if (tour.stops[idx]) mapView.flyToStop(tour.stops[idx], 18);
          } else if (journeyState.getState() === 'tour_start') {
            mapView.fitBounds();
            mapView.triggerSequencePulse();
          }
        });
      }
      if (!isOpen) mapPanelCentred = false;
    });

    // Map open FAB — append to container, positioned by CSS
    container.appendChild(mapFab);
  }

  // === NavController ===
  const navController = new NavController(tour, session, {
    onNavigate: (stop, index) => {
      setStopListOpen(false);
      const nextStop = navController.getNextStop(index);
      cardHost.render((c) => stopCardRenderer.render(c, stop, index + 1, tour.stops.length));
      stopCardRenderer.setSuppressGettingHereNote(false);
      mapView.setActiveStop(stop);
      mapView.setVisitedStops(session.getVisited());
      tourFooter.update(session.getVisited().size, tour.stops.length);
      if (nextStop) {
        tourFooter.setNextStop(nextStop.title);
      } else {
        tourFooter.setLastStop(isReturningToStart);
      }
      stopListOverlay.update(tour.stops, index, session.getVisited(), session.tourOrder);
      if (mapPanel) mapPanel.setActiveStop(stop, tour.tour.nav_mode);
      resetScrollHint?.();
      updateScrollGate();
    },
    onTourEnd: () => {
      const lastIdx = session.reversed ? 0 : tour.stops.length - 1;
      session.markVisited(tour.stops[lastIdx].id);
      journeyState.transition('tour_complete');
    },
  });

  tourFooter.onPrev(() => {
    const idx = navController.getCurrentIndex();
    if (idx === session.startIndex) {
      journeyState.transition('tour_start');
    } else {
      navController.prev();
    }
  });
  tourFooter.onNext(() => {
    const currentIdx = navController.getCurrentIndex();
    const nextStop = navController.getNextStop(currentIdx);
    if (nextStop?.getting_here?.waypoints?.length) {
      // Enter waypoint transit mode
      session.markVisited(tour.stops[currentIdx].id);
      tourFooter.update(session.getVisited().size, tour.stops.length);
      journeyState.transition('in_transit', currentIdx);
    } else {
      navController.next();
    }
  });
  tourFooter.onFinish(async () => {
    // Mark the current stop as visited before finishing
    const currentStop = tour.stops[navController.getCurrentIndex()];
    if (currentStop) session.markVisited(currentStop.id);
    tourFooter.update(session.getVisited().size, tour.stops.length);

    if (isReturningToStart) {
      // Already returning — just end the tour, no modal
      journeyState.transition('tour_complete');
      return;
    }
    const returnToStart = await TourFooter.showFinishModal(container, tour.tour.nudge_return === true);
    if (returnToStart) {
      isReturningToStart = true;
      navController.returnToStart();
    } else {
      journeyState.transition('tour_complete');
    }
  });

  // === Overview controls ===
  overviewControls.onDirectionToggle((reversed) => {
    session.setReversed(reversed);
    mapView.setChevronDirection(reversed);
    mapView.setEndPin(tour.stops[session.endIndex].id);
    overviewControls.update(session.overviewSelectedIndex, tour.stops.length, reversed, tour.stops[session.overviewSelectedIndex].title);
    stopListOverlay.update(tour.stops, session.overviewSelectedIndex, session.getVisited(), session.tourOrder);
  });

  overviewControls.onBegin((index, reversed) => {
    session.setStartIndex(index);
    session.setReversed(reversed);
    stopCardRenderer.setStartingStop(index);
    navController.resetReturnState();
    if (mapPanel) mapPanel.hide();
    journeyState.transition('at_stop', index);
  });

  // === Render helpers for journey handler ===
  const renderWelcome = () => cardHost.render((c) => renderWelcomeCard(c, {
    title: tour.tour.title, description: tour.tour.description,
    duration: tour.tour.duration, stopCount: tour.stops.length,
    welcome: tour.tour.welcome, hideFooterCta: !isMobile,
    onBegin: () => {
      session.setStartIndex(session.overviewSelectedIndex);
      stopCardRenderer.setStartingStop(session.overviewSelectedIndex);
      navController.resetReturnState();
      journeyState.transition('at_stop', session.overviewSelectedIndex);
    },
    onOpenMap: mapPanel ? () => mapPanel!.toggle() : undefined,
    gettingHereAvailable: hasGettingHere,
    onGettingHere: hasGettingHere ? () => {
      viewingSystemCard = 'getting_here';
      tourFooter.hide();
      cardHost.render((c) => renderGettingHereCard(c, { blocks: tour.tour.getting_here!, onBack: dismissSystemCard }));
    } : undefined,
  }));

  const renderGoodbye = () => cardHost.render((c) => renderGoodbyeCard(c, {
    goodbye: tour.tour.goodbye, visitedCount: session.getVisited().size,
    totalStops: tour.stops.length, closeUrl: tour.tour.close_url,
    onRestartTour: () => {
      isReturningToStart = false;
      session.clearVisited();
      journeyState.clearSaved();
      journeyState.transition('tour_start');
    },
    onBrowseStops: () => {
      stopListOverlay.update(tour.stops, -1, session.getVisited(), session.tourOrder);
      stopListOverlay.open();
    },
  }));

  const dismissSystemCard = () => {
    if (!viewingSystemCard) return;
    viewingSystemCard = null;
    const state = journeyState.getState();
    if (state === 'tour_start') journeyState.transition('tour_start');
    else if (state === 'at_stop') journeyState.transition('at_stop', journeyState.getActiveStopIndex());
    else if (state === 'tour_complete') journeyState.transition('tour_complete');
  };

  // === Menu actions ===
  menuBar.onAction((action) => {
    if (mapPanel) mapPanel.hide();
    if (action === 'getting_here') {
      viewingSystemCard = 'getting_here'; tourFooter.hide();
      cardHost.render((c) => renderGettingHereCard(c, { blocks: tour.tour.getting_here!, onBack: dismissSystemCard }));
    } else if (action === 'start_tour') { viewingSystemCard = null; journeyState.transition('tour_start'); }
    else if (action === 'tour_stops') { stopListOverlay.open(); }
    else if (action === 'about') {
      viewingSystemCard = 'about'; tourFooter.hide();
      cardHost.render((c) => renderAboutCard(c, { onBack: dismissSystemCard }));
    }
  });

  // === Event wiring ===
  mapView.onPinClick((index) => { if (journeyState.getState() === 'tour_start') updateOverviewSelection(index); });
  transitBar.onArrived(() => {
    const cur = journeyState.getActiveStopIndex();
    const next = session.reversed ? Math.max(cur - 1, 0) : Math.min(cur + 1, tour.stops.length - 1);
    journeyState.transition('at_stop', next);
  });
  stopListOverlay.onSelect((index) => journeyState.transition('at_stop', index));

  // === Journey state handler ===
  journeyState.onStateChange(createJourneyHandler({
    tour, session, mapView, navController, sheet, mapPanel, menuBar,
    tourFooter, overviewControls, stopListOverlay, transitBar,
    cardHost, journeyCardRenderer, guidanceBanner, arrivingBanner,
    sheetContentEl, isMobile, setStopListOpen, setViewingSystemCard: (c) => { viewingSystemCard = c; },
    renderWelcome, renderGoodbye,
    onStopActivated: (stopIndex) => { proximityDetector?.setCurrentStop(stopIndex); },
    onOverviewEnter: () => { gpsOverviewApplied = false; },
    transitionToStop: (stopIndex) => { journeyState.transition('at_stop', stopIndex); },
    setMapFabVisible: isMobile && mapPanel ? (visible) => { mapPanel!.getOpenButton().hidden = !visible; } : undefined,
  }));

  // === GPS (deferred — starts on user action) ===
  let proximityDetector: ProximityDetector | null = null;
  let gpsStarted = false;
  let gpsDenied = false;
  let gpsInitialZoomDone = false;

  const startGps = () => {
    if (gpsStarted || !gpsTracker.isAvailable()) return;
    gpsStarted = true;

    proximityDetector = new ProximityDetector(tour.stops, 0, tour.tour.gps);
    proximityDetector.onArrival((stopIndex) => journeyState.transition('at_stop', stopIndex));
    const bsCfg = tour.tour.gps?.battery_saver;
    if (bsCfg !== false && bsCfg !== undefined) gpsTracker.enableBatterySaver(typeof bsCfg === 'object' ? bsCfg : undefined);
    gpsTracker.onPosition((pos) => {
      if (pos) {
        lastGpsPosition = { lat: pos.lat, lng: pos.lng };
        mapView.updateGpsPosition(pos.lat, pos.lng);
        const d = proximityDetector?.getDistanceToNextStop(pos);
        if (d !== null && d !== undefined) gpsTracker.setNextStopDistance(d);
        proximityDetector?.checkPosition(pos);
        if (!gpsOverviewApplied && journeyState.getState() === 'tour_start') {
          const acc = tour.tour.gps?.max_accuracy ?? 50, dist = tour.tour.gps?.max_distance ?? 500;
          if (pos.accuracy <= acc) {
            const n = nearestStop(pos.lat, pos.lng, tour.stops);
            if (n.distance <= dist) {
              gpsOverviewApplied = true;
              showGpsNudge(n.index);
            }
          }
        }
        // Update locate button to active state
        locateBtn?.classList.remove('maptour-locate-btn--acquiring', 'maptour-locate-btn--denied');
        locateBtn?.classList.add('maptour-locate-btn--active');
        // Zoom to user on first GPS fix
        if (!gpsInitialZoomDone) {
          gpsInitialZoomDone = true;
          mapView.getMap().flyTo([pos.lat, pos.lng], 17, { animate: true });
        }
      } else {
        // Permission denied or unavailable
        gpsDenied = true;
        locateBtn?.classList.remove('maptour-locate-btn--acquiring', 'maptour-locate-btn--active');
        locateBtn?.classList.add('maptour-locate-btn--denied');
        mapView.clearGpsPosition();
        showGpsToast();
      }
    });
    gpsTracker.onHeading((heading) => mapView.updateGpsHeading(heading));
    gpsTracker.start();
  };

  // Locate button + GPS denied toast
  let locateBtn: HTMLElement | null = null;
  if (gpsTracker.isAvailable()) {
    locateBtn = mapView.addLocateButton(() => {
      if (gpsDenied) {
        showGpsToast();
        return;
      }
      if (!gpsStarted) {
        locateBtn?.classList.add('maptour-locate-btn--acquiring');
        startGps();
      } else if (lastGpsPosition) {
        mapView.getMap().flyTo([lastGpsPosition.lat, lastGpsPosition.lng], 17, { animate: true });
      }
    });
  }

  const showGpsNudge = (stopIndex: number) => {
    const stop = tour.stops[stopIndex];
    if (!stop) return;
    let nudge = container.querySelector('.maptour-gps-nudge') as HTMLElement | null;
    if (nudge) nudge.remove();
    nudge = document.createElement('button');
    nudge.className = 'maptour-gps-nudge';
    nudge.innerHTML = '<i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + t('gps_near_stop', { stop: stop.title });
    nudge.addEventListener('click', () => {
      updateOverviewSelection(stopIndex);
      nudge?.remove();
    });
    container.appendChild(nudge);
    requestAnimationFrame(() => nudge?.classList.add('maptour-gps-nudge--visible'));
    // Auto-dismiss after 10 seconds
    setTimeout(() => nudge?.remove(), 10000);
  };

  const showGpsToast = () => {
    let toast = container.querySelector('.maptour-gps-toast') as HTMLElement | null;
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'maptour-gps-toast';
      toast.textContent = t('gps_denied');
      container.appendChild(toast);
    }
    toast.classList.add('maptour-gps-toast--visible');
    setTimeout(() => toast?.classList.remove('maptour-gps-toast--visible'), 4000);
  };

  // === Restore or start ===
  const restored = journeyState.restore();
  if (restored && journeyState.getState() !== 'tour_start') {
    journeyState.transition(journeyState.getState(), journeyState.getActiveStopIndex());
  } else {
    if (startStop !== undefined) { const idx = tour.stops.findIndex((s) => s.id === startStop); if (idx >= 0) { journeyState.transition('at_stop', idx); return; } }
    journeyState.transition('tour_start');
  }
}

const MapTour = { init };
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).MapTour = MapTour;
export default MapTour;
export { init };
