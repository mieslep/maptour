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

  // Stop list
  const stopListWrapper = document.createElement('div');
  stopListWrapper.className = 'maptour-stop-list-wrapper';

  const stopListToggleBtn = document.createElement('button');
  stopListToggleBtn.className = 'maptour-stop-list-toggle';
  stopListToggleBtn.setAttribute('aria-expanded', 'true');
  stopListToggleBtn.setAttribute('aria-controls', 'maptour-stop-list');
  stopListToggleBtn.innerHTML = '<span class="maptour-stop-list-toggle__label">All Stops</span><span class="maptour-stop-list-toggle__icon" aria-hidden="true">▲</span>';

  const stopListEl = document.createElement('div');
  stopListEl.id = 'maptour-stop-list';

  let stopListOpen = true;
  let currentStopLabel = '';

  function setStopListOpen(open: boolean): void {
    stopListOpen = open;
    stopListEl.style.display = open ? '' : 'none';
    // On mobile, hide the wrapper entirely when list is collapsed (toggle row is in title bar)
    if (isMobile) stopListWrapper.style.display = open ? '' : 'none';
    stopListToggleBtn.setAttribute('aria-expanded', String(open));
    const label = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__label');
    if (label) label.textContent = open ? t('all_stops') : currentStopLabel;
    const icon = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__icon');
    if (icon) icon.textContent = open ? '▲' : '▼';
  }

  stopListToggleBtn.addEventListener('click', () => {
    setStopListOpen(!stopListOpen);
  });

  // Prev/Next arrow buttons (inline in the header bar)
  const prevArrow = document.createElement('button');
  prevArrow.className = 'maptour-nav-arrow';
  prevArrow.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
  prevArrow.setAttribute('aria-label', 'Previous stop');
  prevArrow.disabled = true;

  const nextArrow = document.createElement('button');
  nextArrow.className = 'maptour-nav-arrow';
  nextArrow.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
  nextArrow.setAttribute('aria-label', 'Next stop');

  // Header row: [◀ ▶] [STOP x/y ▼] [✕]
  const toggleRow = document.createElement('div');
  toggleRow.className = 'maptour-stop-list-header';

  // Stop card
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';

  // Nav element (detached — NavController renders into it but we use arrow buttons instead)
  const navEl = document.createElement('div');

  // Layout branching: mobile vs desktop
  let sheet: BottomSheet | null = null;
  let mapPanel: MapPanel | null = null;
  let navController: NavController | null = null;

  // Exit/map toggle button
  const exitBtn = document.createElement('button');
  exitBtn.className = 'maptour-exit-btn';
  exitBtn.textContent = '✕';

  toggleRow.appendChild(prevArrow);
  toggleRow.appendChild(nextArrow);
  toggleRow.appendChild(stopListToggleBtn);
  toggleRow.appendChild(exitBtn);

  stopListWrapper.appendChild(toggleRow);
  stopListWrapper.appendChild(stopListEl);
  sheetContentEl.appendChild(stopListWrapper);
  sheetContentEl.appendChild(cardEl);

  if (isMobile) {
    // Mobile: floating title bar sits outside the scrolling card view
    toggleRow.classList.add('maptour-title-bar');
    container.appendChild(toggleRow);

    const cardView = document.createElement('div');
    cardView.className = 'maptour-card-view';
    cardView.appendChild(stopListWrapper);
    cardView.appendChild(cardEl);

    container.appendChild(cardView);

    // Map panel wraps the map pane and adds the close FAB
    mapPanel = new MapPanel(container, mapPane);
    let mapPanelCentred = false;
    mapPanel.onToggle((isOpen) => {
      mapView.invalidateSize();
      if (isOpen && !mapPanelCentred) {
        mapPanelCentred = true;
        // Wait a frame for Leaflet to process the new container size before animating
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

    // Inject the map open button into the card header after each render.
    const mapOpenBtn = mapPanel.getOpenButton();
    const injectMapButton = () => {
      const header = cardEl.querySelector('.maptour-card__header');
      if (header && !header.contains(mapOpenBtn)) {
        header.appendChild(mapOpenBtn);
      }
    };
    const cardObserver = new MutationObserver(injectMapButton);
    cardObserver.observe(cardEl, { childList: true });

    // On mobile, hide the exit button (no sheet to collapse, map toggle is on card header)
    exitBtn.style.display = 'none';
  } else {
    // Desktop: existing side-by-side layout with BottomSheet as side panel
    container.appendChild(mapPane);
    sheet = new BottomSheet(container, sheetContentEl);

    exitBtn.setAttribute('aria-label', t('minimize'));
    exitBtn.title = t('minimize');
    exitBtn.addEventListener('click', () => {
      sheet!.setPosition('collapsed', true);
    });
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
  // "Next stop" and "Finish Tour" both advance via NavController
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
    updateStopLabel(t('stop_n', { n: index + 1, total: tour.stops.length }));
    prevArrow.disabled = index === 0;
    nextArrow.disabled = index === tour.stops.length - 1;
  }

  function updateStopLabel(text: string): void {
    currentStopLabel = text;
    if (!stopListOpen) {
      const label = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__label');
      if (label) label.textContent = text;
    }
  }

  // === State change handler ===
  journeyState.onStateChange((state, stopIndex) => {
    transitBar.hide();
    mapView.setPulsingPin(null);

    if (state === 'tour_start') {
      arrowMode = 'picker';
      gpsPickerApplied = false;
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      setMobileMapPadding();
      mapView.fitBounds();
      // Show "WELCOME" label, hide the expand/collapse icon
      setStopListOpen(false);
      updateStopLabel(t('welcome'));
      const toggleIcon = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__icon');
      if (toggleIcon) toggleIcon.style.display = 'none';

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
      });
      updateStopLabel(t('welcome'));
      prevArrow.disabled = true;
      nextArrow.disabled = tour.stops.length <= 1;
      // Centre map on first stop
      mapView.setActiveStop(tour.stops[0]);
    } else if (state === 'at_stop') {
      arrowMode = 'nav';
      const toggleIcon = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__icon');
      if (toggleIcon) toggleIcon.style.display = '';
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) {
        mapPanel.hide();
        mapPanel.setActiveStop(tour.stops[stopIndex], tour.tour.nav_mode);
      }
      if (isMobile) setStopListOpen(false);
      setMobileMapPadding();
      updateStopLabel(t('stop_n', { n: stopIndex + 1, total: tour.stops.length }));
      navController.goTo(stopIndex);
      stopListOverlay.update(tour.stops, stopIndex, breadcrumb.getVisited());
      // Update proximity detector to monitor the next stop from this one
      proximityDetector?.setCurrentStop(stopIndex);
    } else if (state === 'in_transit') {
      if (sheet) sheet.setPosition('collapsed', true);
      // On mobile, card view stays visible with transit bar overlay
      const nextIndex = tourReversed
        ? Math.max(stopIndex - 1, 0)
        : Math.min(stopIndex + 1, tour.stops.length - 1);
      const nextStop = tour.stops[nextIndex];
      const nextDisplayNum = tourReversed ? (tour.stops.length - nextIndex) : (nextIndex + 1);
      transitBar.show(nextDisplayNum, nextStop.title);
      mapView.setPulsingPin(nextStop.id);
      // Keep proximity detector monitoring from the current stop
      proximityDetector?.setCurrentStop(stopIndex);
    } else if (state === 'tour_complete') {
      arrowMode = 'nav';
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      setMobileMapPadding();
      if (isMobile) setStopListOpen(false);
      updateStopLabel(t('complete'));
      prevArrow.disabled = true;
      nextArrow.disabled = true;
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
  // Arrow buttons: 'picker' mode cycles stops on welcome, 'nav' mode advances tour
  prevArrow.addEventListener('click', () => {
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
  nextArrow.addEventListener('click', () => {
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
        updateStopLabel(t('stop_n', { n: index + 1, total: tour.stops.length }));
        prevArrow.disabled = index === tourStartIndex;
        mapView.setVisitedStops(breadcrumb.getVisited());
        stopListOverlay.update(tour.stops, index, breadcrumb.getVisited());
        // Keep map panel nav bar in sync with current stop
        if (mapPanel) mapPanel.setActiveStop(stop, tour.tour.nav_mode);
      },
      onNextFromLast: () => {
        // Mark the final stop visited — in reversed mode, the last stop in sequence is stop[0]
        const lastStopIndex = tourReversed ? 0 : tour.stops.length - 1;
        breadcrumb.markVisited(tour.stops[lastStopIndex].id);
        journeyState.transition('tour_complete');
      },
      onJourneyChange: (inJourney) => {
        if (inJourney) {
          updateStopLabel(t('en_route'));
        }
        // When journey ends, onStopChange will set the correct label
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
    // Create proximity detector for arrival detection
    proximityDetector = new ProximityDetector(tour.stops, 0, tour.tour.gps);
    proximityDetector.onArrival((stopIndex) => {
      journeyState.transition('at_stop', stopIndex);
    });

    // Enable battery saver if configured
    const batterySaverConfig = tour.tour.gps?.battery_saver;
    if (batterySaverConfig !== false && batterySaverConfig !== undefined) {
      gpsTracker.enableBatterySaver(
        typeof batterySaverConfig === 'object' ? batterySaverConfig : undefined
      );
    }

    gpsTracker.onPosition((pos) => {
      if (pos) {
        mapView.updateGpsPosition(pos.lat, pos.lng);

        // Update distance to next stop for battery saver mode transitions
        const distToNext = proximityDetector?.getDistanceToNextStop(pos);
        if (distToNext !== null && distToNext !== undefined) {
          gpsTracker.setNextStopDistance(distToNext);
        }

        // Proximity arrival detection
        proximityDetector?.checkPosition(pos);

        // Show nearest stop indicator on welcome screen (once, if accuracy and distance acceptable)
        if (!gpsPickerApplied && arrowMode === 'picker') {
          const maxAccuracy = tour.tour.gps?.max_accuracy ?? 50;
          const maxDistance = tour.tour.gps?.max_distance ?? 500;
          if (pos.accuracy <= maxAccuracy) {
            const result = nearestStop(pos.lat, pos.lng, tour.stops);
            if (result.distance <= maxDistance) {
              gpsPickerApplied = true;
              stopCard.showNearestIndicator(result.index, tour.stops[result.index].title, (idx) => {
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
    // startStop option overrides fresh start
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
