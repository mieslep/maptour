import '../styles/maptour.css';
import { loadTour } from './loader';
import { MapView } from './map/MapView';
import { StopCard } from './card/StopCard';
import { NavController } from './navigation/NavController';
import { GpsTracker } from './gps/GpsTracker';
import { Breadcrumb } from './breadcrumb/Breadcrumb';
import { showError } from './errors/ErrorDisplay';
import { JourneyStateManager } from './journey/JourneyStateManager';
import { BottomSheet } from './layout/BottomSheet';
import { InTransitBar } from './layout/InTransitBar';
import { StopListOverlay } from './layout/StopListOverlay';
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

  // === Build layout ===
  container.innerHTML = '';
  container.className = (container.className + ' maptour-container').trim();

  // Map pane
  const mapPane = document.createElement('div');
  mapPane.className = 'maptour-map-pane';
  container.appendChild(mapPane);

  // Sheet content (card + nav — lives inside the sheet, which is the content panel on desktop)
  const sheetContentEl = document.createElement('div');
  sheetContentEl.className = 'maptour-sheet-content';

  // Stop list (desktop: shown inside sheet; mobile: hidden in favour of FAB overlay)
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
    stopListToggleBtn.setAttribute('aria-expanded', String(open));
    // Update label: "All Stops" when open, "Stop N / M" when collapsed
    const label = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__label');
    if (label) label.textContent = open ? 'All Stops' : currentStopLabel;
    const icon = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__icon');
    if (icon) icon.textContent = open ? '▲' : '▼';
  }

  stopListToggleBtn.addEventListener('click', () => {
    setStopListOpen(!stopListOpen);
  });

  // Prev/Next arrow buttons (inline in the header bar)
  const prevArrow = document.createElement('button');
  prevArrow.className = 'maptour-nav-arrow';
  prevArrow.innerHTML = '&#8249;';
  prevArrow.setAttribute('aria-label', 'Previous stop');
  prevArrow.disabled = true;

  const nextArrow = document.createElement('button');
  nextArrow.className = 'maptour-nav-arrow';
  nextArrow.innerHTML = '&#8250;';
  nextArrow.setAttribute('aria-label', 'Next stop');

  // Minimize button — collapses the sheet, tour stays active
  const exitBtn = document.createElement('button');
  exitBtn.className = 'maptour-exit-btn';
  exitBtn.setAttribute('aria-label', 'Minimize');
  exitBtn.title = 'Minimize';
  exitBtn.textContent = '✕';
  exitBtn.addEventListener('click', () => {
    sheet.setPosition('collapsed', true);
  });

  // Header row: [◀ ▶] [STOP x/y ▼] [✕]
  const toggleRow = document.createElement('div');
  toggleRow.className = 'maptour-stop-list-header';
  toggleRow.appendChild(prevArrow);
  toggleRow.appendChild(nextArrow);
  toggleRow.appendChild(stopListToggleBtn);
  toggleRow.appendChild(exitBtn);

  stopListWrapper.appendChild(toggleRow);
  stopListWrapper.appendChild(stopListEl);
  sheetContentEl.appendChild(stopListWrapper);

  // Stop card
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';
  sheetContentEl.appendChild(cardEl);

  // Nav element (detached — NavController renders into it but we use arrow buttons instead)
  const navEl = document.createElement('div');

  // Bottom sheet (wraps sheetContentEl; on desktop becomes the side panel)
  const sheet = new BottomSheet(container, sheetContentEl);

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
  stopCard.setCloseUrl(tour.tour.close_url);
  // "Next stop" footer button advances via NavController
  stopCard.onNext(() => navController.next());
  // "Finish Tour" when no close_url — collapse the sheet
  stopCard.onFinish(() => sheet.setPosition('collapsed', true));
  const breadcrumb = new Breadcrumb(tour.tour.id);
  const gpsTracker = new GpsTracker();

  // Arrow mode: 'picker' during welcome (cycle stops to choose start), 'nav' during tour
  let arrowMode: 'nav' | 'picker' = 'nav';
  let pickerIndex = 0;
  const returning = breadcrumb.getVisited().size > 0;

  function setMobileMapPadding(): void {
    if (window.innerWidth < 768) {
      mapView.setMapPadding(container.offsetHeight * 0.75);
    } else {
      mapView.setMapPadding(0);
    }
  }

  function updatePickerSelection(index: number): void {
    pickerIndex = index;
    const stop = tour.stops[index];
    stopCard.updateWelcomeSelection(stop, index, tour.stops.length, returning);
    mapView.setActiveStop(stop);
    updateStopLabel(`Stop ${index + 1} / ${tour.stops.length}`);
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
      sheet.setPosition('expanded', true);
      setMobileMapPadding();
      // Always collapse stop list on welcome — picker is the navigation
      setStopListOpen(false);

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
        onBegin: (idx) => {
          stopCard.setStartingStop(idx);
          journeyState.transition('at_stop', idx);
        },
      });
      updateStopLabel('Welcome');
      prevArrow.disabled = true;
      nextArrow.disabled = tour.stops.length <= 1;
      // Centre map on first stop
      mapView.setActiveStop(tour.stops[0]);
    } else if (state === 'at_stop') {
      arrowMode = 'nav';
      sheet.setPosition('expanded', true);
      if (window.innerWidth < 768) setStopListOpen(false);
      setMobileMapPadding();
      updateStopLabel(`Stop ${stopIndex + 1} / ${tour.stops.length}`);
      navController.goTo(stopIndex);
      stopListOverlay.update(tour.stops, stopIndex, breadcrumb.getVisited());
    } else if (state === 'in_transit') {
      sheet.setPosition('collapsed', true);
      const nextIndex = Math.min(stopIndex + 1, tour.stops.length - 1);
      const nextStop = tour.stops[nextIndex];
      transitBar.show(nextIndex + 1, nextStop.title);
      mapView.setPulsingPin(nextStop.id);
    } else if (state === 'tour_complete') {
      arrowMode = 'nav';
      sheet.setPosition('expanded', true);
      setMobileMapPadding();
      if (window.innerWidth < 768) setStopListOpen(false);
      updateStopLabel('Complete');
      prevArrow.disabled = true;
      nextArrow.disabled = true;
      stopCard.renderGoodbye({
        goodbye: tour.tour.goodbye,
        visitedCount: breadcrumb.getVisited().size,
        totalStops: tour.stops.length,
        closeUrl: tour.tour.close_url,
        onReview: () => {
          journeyState.clearSaved();
          journeyState.transition('at_stop', 0);
        },
      });
    }
  });

  // Transit bar "I'm here" → advance to next stop
  transitBar.onArrived(() => {
    const next = journeyState.getActiveStopIndex() + 1;
    journeyState.transition('at_stop', Math.min(next, tour.stops.length - 1));
  });

  // Stop list overlay selection
  stopListOverlay.onSelect((index) => {
    journeyState.transition('at_stop', index);
  });

  // === Navigation controller ===
  // Arrow buttons: 'picker' mode cycles stops on welcome, 'nav' mode advances tour
  prevArrow.addEventListener('click', () => {
    if (arrowMode === 'picker') {
      if (pickerIndex > 0) updatePickerSelection(pickerIndex - 1);
    } else {
      navController.prev();
    }
  });
  nextArrow.addEventListener('click', () => {
    if (arrowMode === 'picker') {
      if (pickerIndex < tour.stops.length - 1) updatePickerSelection(pickerIndex + 1);
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

  const navController = new NavController(
    tour,
    mapView,
    stopCard,
    breadcrumb,
    navEl,
    stopListEl,
    {
      onStopChange: (stop, index) => {
        // On mobile, collapse stop list to give card content room
        if (window.innerWidth < 768) {
          setStopListOpen(false);
        }
        updateStopLabel(`Stop ${index + 1} / ${tour.stops.length}`);
        prevArrow.disabled = index === 0;
        // Next always enabled — on last stop it triggers tour_complete
        mapView.setVisitedStops(breadcrumb.getVisited());
        stopListOverlay.update(tour.stops, index, breadcrumb.getVisited());
      },
      onNextFromLast: () => {
        breadcrumb.markVisited(tour.stops[tour.stops.length - 1].id);
        journeyState.transition('tour_complete');
      },
    }
  );

  // === GPS ===
  if (gpsTracker.isAvailable()) {
    gpsTracker.onPosition((pos) => {
      if (pos) mapView.updateGpsPosition(pos.lat, pos.lng);
      else mapView.clearGpsPosition();
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
