import '../styles/maptour.css';
import { loadTour } from './loader';
import { MapView } from './map/MapView';
import { StopCard } from './card/StopCard';
import { NavController } from './navigation/NavController';
import { GpsTracker } from './gps/GpsTracker';
import { Breadcrumb } from './breadcrumb/Breadcrumb';
import { showError } from './errors/ErrorDisplay';
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

  // Show loading state
  container.innerHTML = '<div class="maptour-loading"><div class="maptour-spinner"></div>Loading tour…</div>';

  // Load tour data
  const result = await loadTour(tourUrl);
  if (result.error) {
    showError(container, result.error);
    return;
  }

  const { tour } = result;

  // Build the layout
  container.innerHTML = '';
  container.className = (container.className + ' maptour-container').trim();

  // Map pane
  const mapPane = document.createElement('div');
  mapPane.className = 'maptour-map-pane';
  container.appendChild(mapPane);

  // Content pane
  const contentPane = document.createElement('div');
  contentPane.className = 'maptour-content-pane';
  container.appendChild(contentPane);

  // Stop list wrapper
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
  stopListToggleBtn.addEventListener('click', () => {
    stopListOpen = !stopListOpen;
    stopListEl.style.display = stopListOpen ? '' : 'none';
    stopListToggleBtn.setAttribute('aria-expanded', String(stopListOpen));
    const icon = stopListToggleBtn.querySelector<HTMLElement>('.maptour-stop-list-toggle__icon');
    if (icon) icon.textContent = stopListOpen ? '▲' : '▼';
  });

  stopListWrapper.appendChild(stopListToggleBtn);
  stopListWrapper.appendChild(stopListEl);
  contentPane.appendChild(stopListWrapper);

  // Card
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';
  contentPane.appendChild(cardEl);

  // Nav buttons
  const navEl = document.createElement('div');
  contentPane.appendChild(navEl);

  // Initialise components
  const mapView = new MapView(mapPane, tour);
  const stopCard = new StopCard(cardEl);
  const breadcrumb = new Breadcrumb(tour.tour.id);
  const gpsTracker = new GpsTracker();

  // GPS
  if (gpsTracker.isAvailable()) {
    gpsTracker.onPosition((pos) => {
      if (pos) {
        mapView.updateGpsPosition(pos.lat, pos.lng);
      } else {
        mapView.clearGpsPosition();
      }
    });
    gpsTracker.start();
  }

  // Navigation
  const navController = new NavController(
    tour,
    mapView,
    stopCard,
    breadcrumb,
    navEl,
    stopListEl,
    {
      onStopChange: (_stop, _index) => {
        // Update visited stops on map when navigating
        mapView.setVisitedStops(breadcrumb.getVisited());
      },
    }
  );

  // Jump to startStop if specified
  if (startStop !== undefined) {
    const idx = tour.stops.findIndex((s) => s.id === startStop);
    if (idx >= 0) {
      navController.goTo(idx);
    }
  }
}

// Public API
const MapTour = { init };

// Auto-assign to window for IIFE usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).MapTour = MapTour;
}

export default MapTour;
export { init };
