import '@fortawesome/fontawesome-free/css/all.min.css';
import '../styles/maptour.css';
import { loadTour } from './loader';
import { MapView } from './map/MapView';
import { StopCard } from './card/StopCard';
import { NavController } from './navigation/NavController';
import { GpsTracker } from './gps/GpsTracker';
import { nearestStop } from './gps/nearestStop';
import { ProximityDetector } from './gps/proximityDetector';
import { Breadcrumb } from './breadcrumb/Breadcrumb';
import { showError } from './errors/ErrorDisplay';
import { JourneyStateManager } from './journey/JourneyStateManager';
import { BottomSheet } from './layout/BottomSheet';
import { MapPanel } from './layout/MapPanel';
import { MenuBar } from './layout/MenuBar';
import { ProgressBar } from './layout/ProgressBar';
import { InTransitBar } from './layout/InTransitBar';
import { StopListOverlay } from './layout/StopListOverlay';
import { setStrings, t } from './i18n';
import type { MapTourInitOptions } from './types';

export type { MapTourInitOptions };

function resolveContainer(containerArg: string | HTMLElement): HTMLElement | null {
  if (typeof containerArg === 'string') {
    return document.querySelector<HTMLElement>(containerArg);
  }
  return containerArg;
}

async function init(options: MapTourInitOptions): Promise<void> {
  const { container: containerArg, tourUrl, startStop } = options;
  const container = resolveContainer(containerArg);

  if (!container) {
    console.error(`MapTour: container "${containerArg}" not found`);
    return;
  }

  container.innerHTML = '<div class="maptour-loading"><div class="maptour-spinner"></div>Loading tour…</div>';

  const result = await loadTour(tourUrl);
  if (result.error) {
    showError(container, result.error);
    return;
  }

  const { tour } = result;

  // Initialise i18n with tour-level string overrides
  setStrings(tour.tour.strings);

  // === Build layout ===
  container.innerHTML = '';
  container.className = (container.className + ' maptour-container').trim();

  const isMobile = typeof window?.matchMedia === 'function'
    && !window.matchMedia('(min-width: 768px)').matches;

  // Map pane
  const mapPane = document.createElement('div');
  mapPane.className = 'maptour-map-pane';

  // Sheet content (card + nav)
  const sheetContentEl = document.createElement('div');
  sheetContentEl.className = 'maptour-sheet-content';

  // Stop list (used on desktop inline, and by StopListOverlay on mobile)
  const stopListWrapper = document.createElement('div');
  stopListWrapper.className = 'maptour-stop-list-wrapper';

  const stopListEl = document.createElement('div');
  stopListEl.id = 'maptour-stop-list';

  stopListWrapper.appendChild(stopListEl);

  // Stop card
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';

  // Nav element (detached — NavController renders into it but we use progress bar arrows)
  const navEl = document.createElement('div');

  // Layout branching: mobile vs desktop
  let sheet: BottomSheet | null = null;
  let mapPanel: MapPanel | null = null;
  let navController: NavController | null = null;
  let resetScrollHint: (() => void) | null = null;

  // === Menu bar and progress bar (both mobile and desktop) ===
  const hasGettingHere = !!(tour.tour.getting_here && tour.tour.getting_here.length > 0);
  const menuBar = new MenuBar(container, tour.tour.header_html);
  menuBar.setGettingHereVisible(hasGettingHere);

  const progressBar = new ProgressBar();
  container.appendChild(progressBar.getElement());

  // System card state — when set, we're viewing a non-stop card
  let viewingSystemCard: 'getting_here' | 'about' | null = null;

  // Stop list open state (desktop inline)
  let stopListOpen = false;
  function setStopListOpen(open: boolean): void {
    stopListOpen = open;
    stopListEl.style.display = open ? '' : 'none';
    if (isMobile) stopListWrapper.style.display = open ? '' : 'none';
  }

  sheetContentEl.appendChild(stopListWrapper);
  sheetContentEl.appendChild(cardEl);

  if (isMobile) {
    const cardView = document.createElement('div');
    cardView.className = 'maptour-card-view';
    // Padding-top accounts for menu bar (56px) + progress bar (44px when visible)
    cardView.style.paddingTop = '56px';
    cardView.appendChild(stopListWrapper);
    cardView.appendChild(cardEl);

    // Scroll hint — fade gradient or explicit indicator for accessibility
    const scrollHint = document.createElement('div');
    scrollHint.className = 'maptour-scroll-hint';
    const usesContrast = window.matchMedia?.('(prefers-contrast: more)').matches;
    if (usesContrast) {
      scrollHint.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i> ' + t('scroll_more');
    }
    cardView.appendChild(scrollHint);

    // Hide scroll hint once user scrolls, show again on new stop
    const updateScrollHint = () => {
      const scrollable = cardEl;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 10;
      const hasOverflow = scrollable.scrollHeight > scrollable.clientHeight + 10;
      if (!hasOverflow || scrollable.scrollTop > 20 || atBottom) {
        scrollHint.classList.add('maptour-scroll-hint--hidden');
      } else {
        scrollHint.classList.remove('maptour-scroll-hint--hidden');
      }
    };
    cardEl.addEventListener('scroll', updateScrollHint, { passive: true });
    const cardContentObserver = new MutationObserver(() => {
      requestAnimationFrame(updateScrollHint);
    });
    cardContentObserver.observe(cardEl, { childList: true, subtree: true });
    resetScrollHint = () => {
      scrollHint.classList.remove('maptour-scroll-hint--hidden');
      requestAnimationFrame(updateScrollHint);
    };

    container.appendChild(cardView);

    // Map panel wraps the map pane and adds the close FAB
    mapPanel = new MapPanel(container, mapPane);
    let mapPanelCentred = false;
    mapPanel.onToggle((isOpen) => {
      menuBar.close();
      mapView.invalidateSize();
      if (isOpen && !mapPanelCentred) {
        mapPanelCentred = true;
        requestAnimationFrame(() => {
          const state = journeyState.getState();
          if (state === 'at_stop') {
            const idx = navController?.getCurrentIndex() ?? journeyState.getActiveStopIndex();
            if (tour.stops[idx]) {
              mapView.flyToStop(tour.stops[idx], 18);
            }
          } else if (state === 'tour_start') {
            mapView.fitBounds();
          }
        });
      }
      if (!isOpen) {
        mapPanelCentred = false;
      }
    });

    // Inject the map open button into the card header after each render
    const mapOpenBtn = mapPanel.getOpenButton();
    const injectMapButton = () => {
      const header = cardEl.querySelector('.maptour-card__header');
      if (header && !header.contains(mapOpenBtn)) {
        header.appendChild(mapOpenBtn);
      }
    };
    const cardObserver = new MutationObserver(injectMapButton);
    cardObserver.observe(cardEl, { childList: true });

    // Update card view padding when progress bar shows/hides
    const updateCardViewPadding = () => {
      cardView.style.paddingTop = progressBar.getElement().hidden ? '56px' : '100px';
    };
    // Observe progress bar hidden attribute changes
    const progressObserver = new MutationObserver(updateCardViewPadding);
    progressObserver.observe(progressBar.getElement(), { attributes: true, attributeFilter: ['hidden'] });

    // Also update map panel header position
    const updateMapPanelTop = () => {
      const panelHeader = container.querySelector('.maptour-map-panel__header') as HTMLElement | null;
      if (panelHeader) {
        panelHeader.style.top = progressBar.getElement().hidden ? '56px' : '100px';
      }
      // Also update map pane top
      const mapPaneInPanel = container.querySelector('.maptour-map-panel .maptour-map-pane') as HTMLElement | null;
      if (mapPaneInPanel) {
        mapPaneInPanel.style.top = progressBar.getElement().hidden ? '104px' : '148px';
      }
    };
    const mapPanelTopObserver = new MutationObserver(updateMapPanelTop);
    mapPanelTopObserver.observe(progressBar.getElement(), { attributes: true, attributeFilter: ['hidden'] });
  } else {
    // Desktop: existing side-by-side layout with BottomSheet as side panel
    container.appendChild(mapPane);

    // Move menu bar and progress bar inside the sheet content (before stop list)
    sheetContentEl.insertBefore(progressBar.getElement(), sheetContentEl.firstChild);
    // Menu bar is already appended to container by its constructor,
    // but on desktop we need it inside the sheet. Move it.
    const menuBarEl = menuBar.getElement();
    menuBarEl.remove();
    sheetContentEl.insertBefore(menuBarEl, sheetContentEl.firstChild);

    sheet = new BottomSheet(container, sheetContentEl);
  }

  // Mobile-only: In-transit bar and stop list overlay
  const transitBar = new InTransitBar(container);
  const stopListOverlay = new StopListOverlay(container);

  // === Journey state ===
  const storage = (() => { try { return localStorage; } catch { return null; } })();
  const journeyState = new JourneyStateManager(tour.tour.id, tour.stops.length, storage);

  // === Initialise core components ===
  const mapView = new MapView(mapPane, tour);

  const stopCard = new StopCard(cardEl);
  stopCard.setTourNavMode(tour.tour.nav_mode);
  stopCard.onNext(() => navController.next());
  const breadcrumb = new Breadcrumb(tour.tour.id);
  const gpsTracker = new GpsTracker();

  // Arrow mode: 'picker' during welcome (cycle stops to choose start), 'nav' during tour
  let arrowMode: 'nav' | 'picker' = 'nav';
  let pickerIndex = 0;
  let tourStartIndex = 0;
  let gpsPickerApplied = false;
  let tourReversed = false;
  const returning = breadcrumb.getVisited().size > 0;

  function setMobileMapPadding(): void {
    mapView.setMapPadding(0);
  }

  function updatePickerSelection(index: number): void {
    pickerIndex = index;
    const stop = tour.stops[index];
    stopCard.updateWelcomeSelection(stop, index, tour.stops.length, returning);
    mapView.flyToStop(stop, 16);
    progressBar.setPrevDisabled(index === 0);
    progressBar.setNextDisabled(index === tour.stops.length - 1);
  }

  // Helper to dismiss system card and return to current state
  function dismissSystemCard(): void {
    if (!viewingSystemCard) return;
    viewingSystemCard = null;
    // Re-render the current journey state card
    const state = journeyState.getState();
    if (state === 'tour_start') {
      journeyState.transition('tour_start');
    } else if (state === 'at_stop') {
      journeyState.transition('at_stop', journeyState.getActiveStopIndex());
    } else if (state === 'tour_complete') {
      journeyState.transition('tour_complete');
    }
  }

  // === Menu actions ===
  menuBar.onAction((action) => {
    if (mapPanel) mapPanel.hide();

    if (action === 'getting_here') {
      viewingSystemCard = 'getting_here';
      progressBar.hide();
      stopCard.renderGettingHere({
        blocks: tour.tour.getting_here!,
        onBack: dismissSystemCard,
      });
    } else if (action === 'start_tour') {
      viewingSystemCard = null;
      // Pre-set picker to current stop if mid-tour
      const currentIdx = journeyState.getState() === 'at_stop'
        ? journeyState.getActiveStopIndex()
        : 0;
      pickerIndex = currentIdx;
      journeyState.transition('tour_start');
      // After welcome renders, select the current stop
      if (currentIdx > 0) {
        updatePickerSelection(currentIdx);
      }
    } else if (action === 'tour_stops') {
      if (isMobile) {
        stopListOverlay.open();
      } else {
        setStopListOpen(!stopListOpen);
      }
    } else if (action === 'about') {
      viewingSystemCard = 'about';
      progressBar.hide();
      stopCard.renderAbout({
        onBack: dismissSystemCard,
      });
    }
  });

  // === Progress bar arrows ===
  progressBar.onPrev(() => {
    if (arrowMode === 'picker') {
      if (tourReversed) {
        if (pickerIndex < tour.stops.length - 1) updatePickerSelection(pickerIndex + 1);
      } else {
        if (pickerIndex > 0) updatePickerSelection(pickerIndex - 1);
      }
    } else {
      navController.prev();
    }
  });
  progressBar.onNext(() => {
    if (arrowMode === 'picker') {
      if (tourReversed) {
        if (pickerIndex > 0) updatePickerSelection(pickerIndex - 1);
      } else {
        if (pickerIndex < tour.stops.length - 1) updatePickerSelection(pickerIndex + 1);
      }
    } else {
      navController.next();
    }
  });

  // Pin click on map selects that stop during welcome picker
  mapView.onPinClick((index) => {
    if (arrowMode === 'picker') {
      updatePickerSelection(index);
    }
  });

  // === State change handler ===
  journeyState.onStateChange((state, stopIndex) => {
    transitBar.hide();
    mapView.setPulsingPin(null);
    viewingSystemCard = null;

    if (state === 'tour_start') {
      arrowMode = 'picker';
      gpsPickerApplied = false;
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      setMobileMapPadding();
      mapView.fitBounds();
      progressBar.hide();

      // Reset reverse state on fresh tour start
      tourReversed = false;
      pickerIndex = 0;
      stopCard.renderWelcome({
        title: tour.tour.title,
        description: tour.tour.description,
        duration: tour.tour.duration,
        stopCount: tour.stops.length,
        welcome: tour.tour.welcome,
        returning,
        stops: tour.stops,
        selectedIndex: 0,
        reversed: false,
        onReverseToggle: (reversed) => {
          tourReversed = reversed;
          navController.setReversed(reversed);
        },
        onBegin: (idx) => {
          tourStartIndex = idx;
          stopCard.setStartingStop(idx);
          navController.setStartIndex(idx);
          journeyState.transition('at_stop', idx);
        },
        gettingHereAvailable: hasGettingHere,
        onGettingHere: hasGettingHere ? () => {
          viewingSystemCard = 'getting_here';
          progressBar.hide();
          stopCard.renderGettingHere({
            blocks: tour.tour.getting_here!,
            onBack: dismissSystemCard,
          });
        } : undefined,
      });
      // Centre map on first stop
      mapView.setActiveStop(tour.stops[0]);
    } else if (state === 'at_stop') {
      arrowMode = 'nav';
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) {
        mapPanel.hide();
        mapPanel.setActiveStop(tour.stops[stopIndex], tour.tour.nav_mode);
      }
      if (isMobile) setStopListOpen(false);
      setMobileMapPadding();
      navController.goTo(stopIndex);
      stopListOverlay.update(tour.stops, stopIndex, breadcrumb.getVisited());

      // Show progress bar
      progressBar.show();
      progressBar.update(breadcrumb.getVisited().size, tour.stops.length);
      progressBar.setPrevDisabled(stopIndex === tourStartIndex);
      progressBar.setNextDisabled(false);

      // Update proximity detector to monitor the next stop from this one
      proximityDetector?.setCurrentStop(stopIndex);
    } else if (state === 'in_transit') {
      if (sheet) sheet.setPosition('collapsed', true);
      const nextIndex = tourReversed
        ? Math.max(stopIndex - 1, 0)
        : Math.min(stopIndex + 1, tour.stops.length - 1);
      const nextStop = tour.stops[nextIndex];
      const nextDisplayNum = tourReversed ? (tour.stops.length - nextIndex) : (nextIndex + 1);
      transitBar.show(nextDisplayNum, nextStop.title);
      mapView.setPulsingPin(nextStop.id);

      // Progress bar stays visible during transit
      progressBar.show();
      progressBar.setPrevDisabled(true);
      progressBar.setNextDisabled(true);

      proximityDetector?.setCurrentStop(stopIndex);
    } else if (state === 'tour_complete') {
      arrowMode = 'nav';
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      setMobileMapPadding();
      progressBar.hide();
      stopCard.renderGoodbye({
        goodbye: tour.tour.goodbye,
        visitedCount: breadcrumb.getVisited().size,
        totalStops: tour.stops.length,
        closeUrl: tour.tour.close_url,
        onReview: () => {
          journeyState.clearSaved();
          journeyState.transition('tour_start');
        },
      });
    }
  });

  // Transit bar "I'm here" -> advance to next stop
  transitBar.onArrived(() => {
    const current = journeyState.getActiveStopIndex();
    const next = tourReversed
      ? Math.max(current - 1, 0)
      : Math.min(current + 1, tour.stops.length - 1);
    journeyState.transition('at_stop', next);
  });

  // Stop list overlay selection
  stopListOverlay.onSelect((index) => {
    journeyState.transition('at_stop', index);
  });

  // === Navigation controller ===
  navController = new NavController(
    tour,
    mapView,
    stopCard,
    breadcrumb,
    navEl,
    stopListEl,
    {
      onStopChange: (stop, index) => {
        if (isMobile) setStopListOpen(false);
        progressBar.setPrevDisabled(index === tourStartIndex);
        progressBar.update(breadcrumb.getVisited().size, tour.stops.length);
        mapView.setVisitedStops(breadcrumb.getVisited());
        stopListOverlay.update(tour.stops, index, breadcrumb.getVisited());
        if (mapPanel) mapPanel.setActiveStop(stop, tour.tour.nav_mode);
        resetScrollHint?.();
      },
      onNextFromLast: () => {
        const lastStopIndex = tourReversed ? 0 : tour.stops.length - 1;
        breadcrumb.markVisited(tour.stops[lastStopIndex].id);
        journeyState.transition('tour_complete');
      },
      onJourneyChange: (inJourney) => {
        if (inJourney) {
          // Progress bar stays visible during journey
        }
      },
    }
  );

  // Set up return-to-start on last stop (only for tours with 2+ stops)
  if (tour.stops.length > 1) {
    stopCard.onReturnToStart(() => navController.returnToStart());
  }

  // === GPS ===
  let proximityDetector: ProximityDetector | null = null;

  if (gpsTracker.isAvailable()) {
    proximityDetector = new ProximityDetector(tour.stops, 0, tour.tour.gps);
    proximityDetector.onArrival((stopIndex) => {
      journeyState.transition('at_stop', stopIndex);
    });

    const batterySaverConfig = tour.tour.gps?.battery_saver;
    if (batterySaverConfig !== false && batterySaverConfig !== undefined) {
      gpsTracker.enableBatterySaver(
        typeof batterySaverConfig === 'object' ? batterySaverConfig : undefined
      );
    }

    gpsTracker.onPosition((pos) => {
      if (pos) {
        mapView.updateGpsPosition(pos.lat, pos.lng);

        const distToNext = proximityDetector?.getDistanceToNextStop(pos);
        if (distToNext !== null && distToNext !== undefined) {
          gpsTracker.setNextStopDistance(distToNext);
        }

        proximityDetector?.checkPosition(pos);

        if (!gpsPickerApplied && arrowMode === 'picker') {
          const maxAccuracy = tour.tour.gps?.max_accuracy ?? 50;
          const maxDistance = tour.tour.gps?.max_distance ?? 500;
          if (pos.accuracy <= maxAccuracy) {
            const nearResult = nearestStop(pos.lat, pos.lng, tour.stops);
            if (nearResult.distance <= maxDistance) {
              gpsPickerApplied = true;
              stopCard.showNearestIndicator(nearResult.index, tour.stops[nearResult.index].title, (idx) => {
                updatePickerSelection(idx);
              });
            }
          }
        }
      } else {
        mapView.clearGpsPosition();
      }
    });
    gpsTracker.onHeading((heading) => {
      mapView.updateGpsHeading(heading);
    });
    gpsTracker.start();
  }

  // === Restore or start ===
  const restored = journeyState.restore();
  if (restored && journeyState.getState() !== 'tour_start') {
    journeyState.transition(journeyState.getState(), journeyState.getActiveStopIndex());
  } else {
    if (startStop !== undefined) {
      const idx = tour.stops.findIndex((s) => s.id === startStop);
      if (idx >= 0) {
        journeyState.transition('at_stop', idx);
        return;
      }
    }
    journeyState.transition('tour_start');
  }
}

const MapTour = { init };

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).MapTour = MapTour;
}

export default MapTour;
export { init };
