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
import { TourStartScreen } from './layout/TourStartScreen';
import { TourCompleteScreen } from './layout/TourCompleteScreen';
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
  stopListToggleBtn.innerHTML = '<span>All Stops</span><span class="maptour-stop-list-toggle__icon" aria-hidden="true">▲</span>';

  const stopListEl = document.createElement('div');
  stopListEl.id = 'maptour-stop-list';

  let stopListOpen = true;

  function setStopListOpen(open: boolean): void {
    stopListOpen = open;
    stopListEl.style.display = open ? '' : 'none';
    stopListToggleBtn.setAttribute('aria-expanded', String(open));
    const icon = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__icon');
    if (icon) icon.textContent = open ? '▲' : '▼';
  }

  stopListToggleBtn.addEventListener('click', () => {
    setStopListOpen(!stopListOpen);
  });

  stopListWrapper.appendChild(stopListToggleBtn);
  stopListWrapper.appendChild(stopListEl);
  sheetContentEl.appendChild(stopListWrapper);

  // Stop card
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';
  sheetContentEl.appendChild(cardEl);

  // Nav buttons
  const navEl = document.createElement('div');
  sheetContentEl.appendChild(navEl);

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
  const breadcrumb = new Breadcrumb(tour.tour.id);
  const gpsTracker = new GpsTracker();

  let startScreen: TourStartScreen | null = null;
  let completeScreen: TourCompleteScreen | null = null;

  // === State change handler ===
  journeyState.onStateChange((state, stopIndex) => {
    // Tear down overlays
    startScreen?.destroy();
    startScreen = null;
    completeScreen?.destroy();
    completeScreen = null;
    transitBar.hide();
    mapView.setPulsingPin(null);

    if (state === 'tour_start') {
      sheet.setPosition('collapsed', false);
      startScreen = new TourStartScreen(container, {
        title: tour.tour.title,
        description: tour.tour.description,
        duration: tour.tour.duration,
        stopCount: tour.stops.length,
        onBegin: () => journeyState.transition('at_stop', 0),
      });
    } else if (state === 'at_stop') {
      sheet.setPosition('expanded', true);
      // On mobile, collapse the stop list so card content has room to scroll
      if (window.innerWidth < 768) {
        setStopListOpen(false);
      }
      navController.goTo(stopIndex);
      stopListOverlay.update(tour.stops, stopIndex, breadcrumb.getVisited());
    } else if (state === 'in_transit') {
      sheet.setPosition('collapsed', true);
      const nextIndex = Math.min(stopIndex + 1, tour.stops.length - 1);
      const nextStop = tour.stops[nextIndex];
      transitBar.show(nextIndex + 1, nextStop.title);
      mapView.setPulsingPin(nextStop.id);
    } else if (state === 'tour_complete') {
      sheet.setPosition('collapsed', false);
      completeScreen = new TourCompleteScreen(container, {
        visitedCount: breadcrumb.getVisited().size,
        totalStops: tour.stops.length,
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
        mapView.setVisitedStops(breadcrumb.getVisited());
        stopListOverlay.update(tour.stops, index, breadcrumb.getVisited());
        // "Take me there" triggers in_transit
        stopCard.onTakeMethere(() => {
          journeyState.transition('in_transit', index);
        });
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
