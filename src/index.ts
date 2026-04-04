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
import { ProgressBar } from './layout/ProgressBar';
import { InTransitBar } from './layout/InTransitBar';
import { StopListOverlay } from './layout/StopListOverlay';
import { OverviewControls } from './layout/OverviewControls';
import { buildMobileLayout } from './layout/buildMobileLayout';
import { buildDesktopLayout } from './layout/buildDesktopLayout';
import { createJourneyHandler } from './orchestrator/journeyHandler';
import { setStrings } from './i18n';
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
  const progressBar = new ProgressBar();
  container.appendChild(progressBar.getElement());

  // === Layout ===
  const mapPane = document.createElement('div');
  mapPane.className = 'maptour-map-pane';
  const layoutDeps = { container, mapPane, menuBarEl: menuBar.getElement(), progressBarEl: progressBar.getElement() };
  const layout = isMobile ? buildMobileLayout(layoutDeps) : buildDesktopLayout(layoutDeps);
  const { mapPanel, sheet, sheetContentEl, cardEl, stopListWrapper, stopListEl, resetScrollHint } = layout;

  // === Card system ===
  const cardHost = new CardHost(cardEl);
  const navPreference = new NavAppPreference();
  const stopCardRenderer = new StopCardRenderer(navPreference);
  stopCardRenderer.setTourNavMode(tour.tour.nav_mode);
  const journeyCardRenderer = new JourneyCardRenderer(navPreference);
  journeyCardRenderer.setTourNavMode(tour.tour.nav_mode);

  // === UI components ===
  const transitBar = new InTransitBar(container);
  const stopListOverlay = new StopListOverlay(container);
  const overviewControls = new OverviewControls();
  const mapView = new MapView(mapPane, tour);
  const gpsTracker = new GpsTracker();

  // === Shared state ===
  let viewingSystemCard: string | null = null;
  let gpsOverviewApplied = false;
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
    mapPanel.onToggle((isOpen) => {
      menuBar.close();
      if (journeyState.getState() === 'tour_start') menuBar.getElement().style.display = isOpen ? 'none' : '';
      mapView.invalidateSize();
      if (isOpen && !mapPanelCentred) {
        mapPanelCentred = true;
        requestAnimationFrame(() => {
          if (journeyState.getState() === 'at_stop') {
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

    const mapOpenBtn = mapPanel.getOpenButton();
    new MutationObserver(() => {
      if (viewingSystemCard) return;
      const header = cardEl.querySelector('.maptour-card__header');
      if (header && !header.contains(mapOpenBtn)) header.appendChild(mapOpenBtn);
    }).observe(cardEl, { childList: true });
  }

  // === NavController ===
  const navController = new NavController(tour, session, {
    onNavigate: (stop, index) => {
      setStopListOpen(false);
      const nextStop = navController.getNextStop(index);
      cardHost.render((c) => stopCardRenderer.render(c, stop, index + 1, tour.stops.length, nextStop));
      stopCardRenderer.setSuppressGettingHereNote(false);
      mapView.setActiveStop(stop);
      mapView.setVisitedStops(session.getVisited());
      progressBar.setPrevDisabled(index === session.startIndex);
      progressBar.setNextDisabled(false);
      progressBar.update(session.getVisited().size, tour.stops.length);
      stopListOverlay.update(tour.stops, index, session.getVisited(), session.tourOrder);
      if (mapPanel) mapPanel.setActiveStop(stop, tour.tour.nav_mode);
      resetScrollHint?.();
    },
    onJourneyStart: (destinationStop) => {
      cardHost.render((c) => journeyCardRenderer.render(c, destinationStop, () => {
        stopCardRenderer.setSuppressGettingHereNote(true);
        navController.completeJourney();
      }));
    },
    onTourEnd: () => {
      const lastIdx = session.reversed ? 0 : tour.stops.length - 1;
      session.markVisited(tour.stops[lastIdx].id);
      journeyState.transition('tour_complete');
    },
  });

  stopCardRenderer.onNext(() => navController.next());
  if (tour.stops.length > 1) {
    stopCardRenderer.onReturnToStart(() => {
      stopCardRenderer.onReturnToStart(null);
      navController.returnToStart();
    });
  }

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
      progressBar.hide();
      cardHost.render((c) => renderGettingHereCard(c, { blocks: tour.tour.getting_here!, onBack: dismissSystemCard }));
    } : undefined,
  }));

  const renderGoodbye = () => cardHost.render((c) => renderGoodbyeCard(c, {
    goodbye: tour.tour.goodbye, visitedCount: session.getVisited().size,
    totalStops: tour.stops.length, closeUrl: tour.tour.close_url,
    onReview: () => { journeyState.clearSaved(); journeyState.transition('tour_start'); },
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
      viewingSystemCard = 'getting_here'; progressBar.hide();
      cardHost.render((c) => renderGettingHereCard(c, { blocks: tour.tour.getting_here!, onBack: dismissSystemCard }));
    } else if (action === 'start_tour') { viewingSystemCard = null; journeyState.transition('tour_start'); }
    else if (action === 'tour_stops') { stopListOverlay.open(); }
    else if (action === 'about') {
      viewingSystemCard = 'about'; progressBar.hide();
      cardHost.render((c) => renderAboutCard(c, { onBack: dismissSystemCard }));
    }
  });

  // === Event wiring ===
  progressBar.onPrev(() => navController.prev());
  progressBar.onNext(() => navController.next());
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
    progressBar, overviewControls, stopListOverlay, transitBar,
    sheetContentEl, isMobile, setStopListOpen, setViewingSystemCard: (c) => { viewingSystemCard = c; },
    renderWelcome, renderGoodbye,
    onStopActivated: (stopIndex) => { proximityDetector?.setCurrentStop(stopIndex); },
    onOverviewEnter: () => { gpsOverviewApplied = false; },
  }));

  // === GPS ===
  let proximityDetector: ProximityDetector | null = null;
  if (gpsTracker.isAvailable()) {
    proximityDetector = new ProximityDetector(tour.stops, 0, tour.tour.gps);
    proximityDetector.onArrival((stopIndex) => journeyState.transition('at_stop', stopIndex));
    const bsCfg = tour.tour.gps?.battery_saver;
    if (bsCfg !== false && bsCfg !== undefined) gpsTracker.enableBatterySaver(typeof bsCfg === 'object' ? bsCfg : undefined);
    gpsTracker.onPosition((pos) => {
      if (pos) {
        mapView.updateGpsPosition(pos.lat, pos.lng);
        const d = proximityDetector?.getDistanceToNextStop(pos);
        if (d !== null && d !== undefined) gpsTracker.setNextStopDistance(d);
        proximityDetector?.checkPosition(pos);
        if (!gpsOverviewApplied && journeyState.getState() === 'tour_start') {
          const acc = tour.tour.gps?.max_accuracy ?? 50, dist = tour.tour.gps?.max_distance ?? 500;
          if (pos.accuracy <= acc) { const n = nearestStop(pos.lat, pos.lng, tour.stops); if (n.distance <= dist) { gpsOverviewApplied = true; updateOverviewSelection(n.index); } }
        }
      } else { mapView.clearGpsPosition(); }
    });
    gpsTracker.onHeading((heading) => mapView.updateGpsHeading(heading));
    gpsTracker.start();
  }

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
