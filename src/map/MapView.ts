import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tour, Stop, Waypoint } from '../types';
import { createPinIcon, getLegStyle } from './layers';

export class MapView {
  private map: L.Map;
  private markers: Map<number, L.Marker> = new Map();
  private polylines: L.Polyline[] = [];
  private gpsDot: L.Marker | null = null;
  private tour: Tour;
  private activeStopId: number;
  private pulsingStopId: number | null = null;
  private visitedStopIds: Set<number> = new Set();
  private paddingBottom = 0;
  private pinClickCallbacks: Array<(index: number) => void> = [];
  private pinNumberMap: Map<number, number> | null = null;
  private overviewMode = false;
  private overviewReversed = false;
  private selectedStopId: number | null = null;
  private endStopId: number | null = null;
  private sequencePulseTimer: ReturnType<typeof setInterval> | null = null;
  private waypointLayer: L.LayerGroup | null = null;
  private waypointMarkers: L.CircleMarker[] = [];

  constructor(container: HTMLElement, tour: Tour) {
    this.tour = tour;
    this.activeStopId = tour.stops[0]?.id ?? 0;

    // Initialise Leaflet map
    this.map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', `Map for ${tour.tour.title}`);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.renderPins();
    this.renderPolylines();
    this.fitBounds();

    // Allow the browser to settle layout before recalculating map size.
    // Without this, Leaflet reads a zero or stale container size and
    // renders tiles in misaligned strips that overflow the map pane.
    requestAnimationFrame(() => {
      this.map.invalidateSize();
      this.fitBounds();
    });
  }

  private renderPins(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();

    this.tour.stops.forEach((stop, index) => {
      const displayNumber = this.pinNumberMap?.get(index) ?? (index + 1);
      const marker = L.marker(stop.coords, {
        icon: createPinIcon({
          number: displayNumber,
          active: stop.id === this.activeStopId,
          visited: this.visitedStopIds.has(stop.id),
          pulsing: stop.id === this.pulsingStopId,
          selected: stop.id === this.selectedStopId,
          end: stop.id === this.endStopId,
        }),
        title: stop.title,
        alt: `Stop ${displayNumber}: ${stop.title}`,
      });

      marker.on('click', () => {
        this.pinClickCallbacks.forEach((cb) => cb(index));
      });
      marker.addTo(this.map);
      this.markers.set(stop.id, marker);
    });
  }

  private renderPolylines(): void {
    this.polylines.forEach((pl) => pl.remove());
    this.polylines = [];

    for (let i = 0; i < this.tour.stops.length - 1; i++) {
      const current = this.tour.stops[i];
      const next = this.tour.stops[i + 1];
      // Mode and route from the destination stop's getting_here
      const gettingHere = next.getting_here;
      const mode = gettingHere?.mode ?? 'walk';
      const style = getLegStyle(mode);
      // Use pre-computed waypoints if available, otherwise straight line
      const path = gettingHere?.route && gettingHere.route.length > 0
        ? gettingHere.route
        : [current.coords, next.coords];

      const polyline = L.polyline(path, {
        color: style.color,
        weight: style.weight,
        dashArray: style.dashArray,
        opacity: style.opacity,
      });

      polyline.addTo(this.map);
      this.polylines.push(polyline);
    }
  }

  fitBounds(): void {
    if (this.tour.stops.length === 0) return;
    const bounds = L.latLngBounds(this.tour.stops.map((s) => s.coords));
    this.map.fitBounds(bounds, {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 40 + this.paddingBottom],
    });
  }

  /** Force Leaflet to recalculate container size (e.g. after the map panel slides in). */
  invalidateSize(): void {
    this.map.invalidateSize();
  }

  /** Set bottom padding (px) so panTo centres the stop in the visible map area above the sheet. */
  setMapPadding(bottom: number): void {
    this.paddingBottom = bottom;
  }

  setActiveStop(stop: Stop): void {
    this.activeStopId = stop.id;
    this.renderPins();

    if (this.paddingBottom > 0) {
      // Offset the target so the stop is centred in the visible map sliver above the sheet
      const zoom = this.map.getZoom();
      const point = this.map.project(stop.coords, zoom);
      point.y += this.paddingBottom / 2;
      const offsetLatLng = this.map.unproject(point, zoom);
      this.map.panTo(offsetLatLng, { animate: true, duration: 0.5 });
    } else {
      this.map.panTo(stop.coords, { animate: true, duration: 0.5 });
    }
  }

  setPulsingPin(stopId: number | null): void {
    this.pulsingStopId = stopId;
    this.renderPins();
  }

  setVisitedStops(visitedIds: Set<number>): void {
    this.visitedStopIds = visitedIds;
    this.renderPins();
  }

  updateGpsPosition(lat: number, lng: number): void {
    const latlng = L.latLng(lat, lng);
    if (this.gpsDot) {
      this.gpsDot.setLatLng(latlng);
    } else {
      const icon = L.divIcon({
        className: 'maptour-gps-icon',
        html: '<span class="maptour-gps-dot" aria-hidden="true"></span><span class="maptour-gps-dot__pulse" aria-hidden="true"></span><span class="maptour-gps-heading-arrow" aria-hidden="true"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      this.gpsDot = L.marker(latlng, { icon, interactive: false, zIndexOffset: -100 });
      this.gpsDot.addTo(this.map);
    }
  }

  updateGpsHeading(heading: number | null): void {
    if (!this.gpsDot) return;
    const el = (this.gpsDot as L.Marker).getElement();
    if (!el) return;
    const arrow = el.querySelector<HTMLElement>('.maptour-gps-heading-arrow');
    if (!arrow) return;
    if (heading === null) {
      arrow.style.display = 'none';
    } else {
      arrow.style.display = '';
      arrow.style.transform = `rotate(${heading}deg)`;
    }
  }

  clearGpsPosition(): void {
    if (this.gpsDot) {
      this.gpsDot.remove();
      this.gpsDot = null;
    }
  }

  /** Fly to a stop at a specific zoom level (used for welcome picker preview). */
  flyToStop(stop: Stop, zoom = 16): void {
    this.activeStopId = stop.id;
    this.renderPins();

    if (this.paddingBottom > 0) {
      const point = this.map.project(stop.coords, zoom);
      point.y += this.paddingBottom / 2;
      const offsetLatLng = this.map.unproject(point, zoom);
      this.map.flyTo(offsetLatLng, zoom, { animate: true, duration: 0.8 });
    } else {
      this.map.flyTo(stop.coords, zoom, { animate: true, duration: 0.8 });
    }
  }

  /** Set custom display numbers for pins (index → display number). Pass null to reset. */
  setPinNumberMap(mapping: Map<number, number> | null): void {
    this.pinNumberMap = mapping;
    this.renderPins();
  }

  onPinClick(cb: (index: number) => void): void {
    this.pinClickCallbacks.push(cb);
  }

  // === Overview mode ===

  /** Enable or disable overview mode. Does NOT auto-start pulse — call triggerSequencePulse() separately. */
  setOverviewMode(enabled: boolean): void {
    this.overviewMode = enabled;
    if (!enabled) {
      this.stopSequencePulse();
      this.selectedStopId = null;
      // Keep endStopId — red end pin persists during tour
      this.renderPins();
    }
  }

  /** Set tour direction for the sequential pulse animation. */
  setChevronDirection(reversed: boolean): void {
    this.overviewReversed = reversed;
    if (this.overviewMode) {
      this.stopSequencePulse();
      this.startSequencePulse();
    }
  }

  /** Set the selected starting pin (green). Pass null to clear. Restarts pulse if in overview. */
  setSelectedPin(stopId: number | null): void {
    this.selectedStopId = stopId;
    this.renderPins();
    if (this.overviewMode) {
      this.triggerSequencePulse();
    }
  }

  /** Start the sequential pulse animation (call when map becomes visible). */
  triggerSequencePulse(): void {
    if (this.overviewMode) {
      this.startSequencePulse();
    }
  }

  /** Set the end pin (red). Pass null to clear. */
  setEndPin(stopId: number | null): void {
    this.endStopId = stopId;
    this.renderPins();
  }

  /** Start a single sequential pulse through all stops after a short delay. */
  private startSequencePulse(): void {
    this.stopSequencePulse();
    const stops = this.tour.stops;
    if (stops.length < 2) return;

    // Build order starting from selected stop
    const startIdx = this.selectedStopId !== null
      ? stops.findIndex(s => s.id === this.selectedStopId)
      : 0;
    const order: number[] = [];
    for (let i = 0; i < stops.length; i++) {
      if (this.overviewReversed) {
        order.push((startIdx - i + stops.length) % stops.length);
      } else {
        order.push((startIdx + i) % stops.length);
      }
    }

    let pulseIndex = 0;

    const pulse = () => {
      // Remove previous pulse class
      document.querySelectorAll('.maptour-pin--seq-pulse').forEach((el) => {
        el.classList.remove('maptour-pin--seq-pulse');
      });

      if (pulseIndex >= stops.length) {
        // Animation complete — one full loop done
        this.stopSequencePulse();
        return;
      }

      const stopId = stops[order[pulseIndex]].id;
      const marker = this.markers.get(stopId);
      if (marker) {
        const el = (marker as L.Marker).getElement();
        const pin = el?.querySelector('.maptour-pin');
        if (pin) pin.classList.add('maptour-pin--seq-pulse');
      }

      pulseIndex++;
    };

    // Start after a short delay
    this.sequencePulseTimer = setTimeout(() => {
      pulse();
      this.sequencePulseTimer = setInterval(() => {
        pulse();
      }, 600);
    }, 500) as unknown as ReturnType<typeof setInterval>;
  }

  private stopSequencePulse(): void {
    if (this.sequencePulseTimer) {
      clearInterval(this.sequencePulseTimer);
      this.sequencePulseTimer = null;
    }
    // Clean up any remaining pulse classes
    document.querySelectorAll('.maptour-pin--seq-pulse').forEach((el) => {
      el.classList.remove('maptour-pin--seq-pulse');
    });
  }

  /** Add a locate-me button to the map. Returns the button element for external control. */
  addLocateButton(onClick: () => void): HTMLElement {
    const Control = L.Control.extend({
      onAdd: () => {
        const btn = L.DomUtil.create('button', 'maptour-locate-btn');
        btn.innerHTML = '<i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>';
        btn.setAttribute('aria-label', 'Show my location');
        btn.title = 'Show my location';
        L.DomEvent.disableClickPropagation(btn);
        btn.addEventListener('click', onClick);
        return btn;
      },
    });
    new Control({ position: 'topright' }).addTo(this.map);
    const el = this.map.getContainer().querySelector('.maptour-locate-btn') as HTMLElement;
    return el;
  }

  // === Waypoint markers ===

  /**
   * Render waypoint markers on the map.
   * Active (next target) marker is highlighted, passed are dimmed, future are subtle.
   */
  setWaypoints(waypoints: Waypoint[], activeIndex: number): void {
    this.clearWaypoints();

    this.waypointLayer = L.layerGroup().addTo(this.map);
    this.waypointMarkers = waypoints.map((wp, i) => {
      let className: string;
      let fillColor: string;
      let fillOpacity: number;
      let color: string;

      if (i < activeIndex) {
        // Passed — muted pink
        className = 'maptour-waypoint-marker maptour-waypoint-marker--passed';
        fillColor = '#f9a8d4';
        fillOpacity = 0.5;
        color = '#f9a8d4';
      } else if (i === activeIndex) {
        // Active (next target)
        className = 'maptour-waypoint-marker maptour-waypoint-marker--active';
        fillColor = '#ec4899';
        fillOpacity = 0.9;
        color = '#ec4899';
      } else {
        // Future
        className = 'maptour-waypoint-marker maptour-waypoint-marker--future';
        fillColor = 'transparent';
        fillOpacity = 0;
        color = '#ec4899';
      }

      const marker = L.circleMarker(wp.coords, {
        radius: 6,
        fillColor,
        fillOpacity,
        color,
        weight: 2,
        opacity: i < activeIndex ? 0.4 : 0.7,
        className,
      });

      marker.addTo(this.waypointLayer!);
      return marker;
    });
  }

  /** Remove all waypoint markers from the map. */
  clearWaypoints(): void {
    if (this.waypointLayer) {
      this.waypointLayer.remove();
      this.waypointLayer = null;
    }
    this.waypointMarkers = [];
  }

  /** Fit map bounds to show the segment between two points. */
  zoomToSegment(from: [number, number], to: [number, number], padding = 40): void {
    const bounds = L.latLngBounds([from, to]);
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.map.fitBounds(bounds, {
        paddingTopLeft: [padding, padding],
        paddingBottomRight: [padding, padding + this.paddingBottom],
        animate: false,
      });
    } else {
      this.map.flyToBounds(bounds, {
        paddingTopLeft: [padding, padding],
        paddingBottomRight: [padding, padding + this.paddingBottom],
        duration: 0.6,
      });
    }
  }

  /** Check if map is currently showing waypoint markers. */
  hasWaypoints(): boolean {
    return this.waypointMarkers.length > 0;
  }

  getMap(): L.Map {
    return this.map;
  }

  destroy(): void {
    this.clearWaypoints();
    this.map.remove();
  }
}
