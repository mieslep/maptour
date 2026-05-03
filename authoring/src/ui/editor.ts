import L from 'leaflet';
import type { Tour, Stop, ContentBlock, LegMode, Waypoint } from '../types';
import { pushUndo, undo, redo, debouncedSave, clearUndoRedo, getOrsApiKey, setOrsApiKey } from '../store';
import { downloadYaml } from '../yaml-io';
import { generateRoute, generateAllRoutes } from '../ors';
import { renderContentBlockEditor } from './content-blocks';

// i18n default keys for the string overrides editor.
// IMPORTANT: Keep sorted alphabetically. Must match DEFAULTS in src/i18n.ts —
// if you add/remove a key there, update this list too. A test enforces parity.
const I18N_DEFAULTS: Record<string, { default: string; desc: string }> = {
  about_description:  { default: 'An open-source, embeddable map tour player for static websites.', desc: 'About card description' },
  about_heading:      { default: 'Powered by MapTour', desc: 'About card heading' },
  add_waypoint:       { default: 'Add waypoint', desc: 'Button to add a waypoint to a route' },
  all_stops:          { default: 'All Stops', desc: 'Stop list toggle label when expanded' },
  all_stops_title:    { default: 'All stops', desc: 'Stop list overlay title' },
  arrived:            { default: "I've arrived at {stop} →", desc: 'Journey card CTA. Placeholder: {stop}' },
  arriving_at:        { default: 'Arriving at {stop}', desc: 'Waypoint approach notification. Placeholder: {stop}' },
  audio_error:        { default: 'Audio could not be loaded.', desc: 'Audio fallback text' },
  back:               { default: 'Back', desc: 'Back button in menus' },
  begin_from:         { default: 'Begin Tour from {stop}', desc: 'Welcome card CTA with stop name. Placeholder: {stop}' },
  begin_tour:         { default: 'Begin Tour', desc: 'Welcome card CTA button' },
  change_direction:   { default: 'Change direction', desc: 'Direction toggle label' },
  close:              { default: 'Close', desc: 'Close button on goodbye screen' },
  complete:           { default: 'Complete', desc: 'Header label on goodbye screen' },
  continue:           { default: 'Continue', desc: 'Continue button in waypoint player' },
  cycle_dir:          { default: 'Get cycling directions', desc: 'Nav button for cycle mode' },
  directions_to:      { default: 'Directions to this stop', desc: 'Generic nav button label' },
  drive_me:           { default: 'Drive me there', desc: 'Nav button for drive mode' },
  en_route:           { default: 'En route', desc: 'Header label during journey between stops' },
  end_tour:           { default: 'End Tour', desc: 'Footer button when returning to start' },
  finish_here:        { default: 'Finish here', desc: 'Secondary finish option (legacy)' },
  finish_modal_body:  { default: 'Would you like to return to the start?', desc: 'Finish modal body text' },
  finish_modal_no:    { default: 'End tour', desc: 'Finish modal "end tour" button' },
  finish_modal_title: { default: 'Tour finished!', desc: 'Finish modal heading' },
  finish_modal_yes:   { default: 'Return to start', desc: 'Finish modal "return" button' },
  finish_tour:        { default: 'Finish Tour', desc: 'Footer button on last stop' },
  gallery_counter:    { default: '{n} / {total}', desc: 'Gallery image counter. Placeholders: {n}, {total}' },
  get_started_prompt: { default: 'Open the map to explore stops and start your tour', desc: 'Welcome card prompt text' },
  getting_here_title: { default: 'Getting Here', desc: 'Getting Here card heading' },
  gps_denied:         { default: 'Location access denied — enable in browser settings for GPS features', desc: 'Toast message when GPS permission is denied' },
  gps_near_stop:      { default: "You're near {stop} — start here?", desc: 'GPS nudge when user is near a stop. Placeholder: {stop}' },
  how_to_get_here:    { default: 'How to get here', desc: 'Getting Here card subheading' },
  im_here:            { default: "I'm here", desc: 'Transit bar arrival button' },
  image_error:        { default: 'Image could not be loaded', desc: 'Image fallback text' },
  menu_about:         { default: 'About', desc: 'Menu item: about' },
  menu_getting_here:  { default: 'Getting Here', desc: 'Menu item: getting here' },
  menu_start_tour:    { default: 'Tour Overview', desc: 'Menu item: tour overview' },
  menu_tour_stops:    { default: 'Tour Stops', desc: 'Menu item: tour stops' },
  minimize:           { default: 'Minimize', desc: 'Minimize button tooltip' },
  nearest_to_you:     { default: 'Nearest to you: ', desc: 'GPS nearest stop indicator prefix' },
  next_btn:           { default: 'Next →', desc: 'Next button text (legacy)' },
  next_journey:       { default: 'Next: Journey to {stop}', desc: 'Footer label when next stop has a journey. Placeholder: {stop}' },
  next_stop:          { default: 'Next: {stop}', desc: 'Footer showing next stop name. Placeholder: {stop}' },
  open_app_nav:       { default: 'Open app to bring me to', desc: 'Full nav button label prefix' },
  open_in_app:        { default: 'Open in MapTour', desc: 'Deep link button to open in native app' },
  picker_cancel:      { default: 'Cancel', desc: 'Nav app picker cancel button' },
  picker_title:       { default: 'Open directions in:', desc: 'Nav app picker dialog title' },
  progress_label:     { default: 'Tour progress', desc: 'Aria label for progress track' },
  return_to_start:    { default: 'Return to start →', desc: 'Return to start button (legacy)' },
  revisit:            { default: 'What next?', desc: 'Label above goodbye card actions' },
  revisit_no:         { default: 'Browse tour stops', desc: 'Goodbye card button to browse stops' },
  revisit_yes:        { default: 'Take the tour again', desc: 'Goodbye card button to restart tour' },
  scroll_more:        { default: 'Scroll for more', desc: 'Scroll hint text (high contrast mode)' },
  show_map:           { default: 'Show map', desc: 'Map toggle button' },
  show_stop:          { default: 'Show stop', desc: 'Stop toggle button' },
  start_at:           { default: 'Start at Stop {n} / {total}:', desc: 'Welcome card stop selector label. Placeholders: {n}, {total}' },
  start_from:         { default: 'Start from {stop}', desc: 'CTA button on welcome card. Placeholder: {stop}' },
  stop_label:         { default: 'Stop {n} — {stop}', desc: 'Stop reference in nearest indicator. Placeholders: {n}, {stop}' },
  stop_n:             { default: 'Stop {n} / {total}', desc: 'Header label showing current stop. Placeholders: {n}, {total}' },
  stop_n_of_total:    { default: 'Stop {n} of {total}', desc: 'Stop counter in overview. Placeholders: {n}, {total}' },
  stop_order:         { default: 'Stop order:', desc: 'Label for forward/reverse toggle' },
  stops_visited:      { default: '{n} / {total} stops visited', desc: 'Goodbye screen stats. Placeholders: {n}, {total}' },
  tip:                { default: 'Select a stop on the map or use the arrows above to change your starting point', desc: 'Hint text on welcome card' },
  tour_complete:      { default: 'Tour complete!', desc: 'Goodbye screen heading' },
  tour_load_error:    { default: 'Tour could not load', desc: 'Error screen heading' },
  transit_dir:        { default: 'Get transit directions', desc: 'Nav button for transit mode' },
  transit_label:      { default: 'Stop {n}: {stop}', desc: 'Transit bar label. Placeholders: {n}, {stop}' },
  walk_me:            { default: 'Walk me there', desc: 'Nav button for walk mode' },
  waypoint_no_route:  { default: 'Add a route before adding waypoints', desc: 'Error when adding waypoint to leg without route' },
  welcome:            { default: 'Welcome', desc: 'Header label on welcome screen' },
};

export interface EditorCallbacks {
  onBackToList: () => void;
}

export class TourEditor {
  private tour: Tour;
  private container: HTMLElement;
  private callbacks: EditorCallbacks;
  private map!: L.Map;
  private stopMarkers: L.Marker[] = [];
  private routePolylines: Map<number, L.Polyline> = new Map();
  private routeHitAreas: L.Polyline[] = [];
  private routeConnectors: L.Polyline[] = [];
  private radiusCircle: L.Circle | null = null;
  private routePointMarkers: L.CircleMarker[] = [];
  private editingRouteSegment: number = -1;
  private reviewingRouteSegment: number = -1;
  private preEditView: { center: L.LatLng; zoom: number } | null = null;
  private mapMode: 'default' | 'addStop' = 'default';
  private selectedStopIdx: number = -1;
  private selectedCard: 'getting_here' | 'welcome' | 'goodbye' | null = null;
  private dirtyLegs: Set<number> = new Set();
  private selectedLeg: number = -1;
  private previewDevice = 'iphone-14';
  private waypointPlacementMode = false;
  private waypointMarkers: L.CircleMarker[] = [];

  private static readonly DEVICES: Array<{
    id: string; label: string; category: 'phone' | 'tablet' | 'desktop';
    width: number; height: number; minPanelWidth: number;
  }> = [
    { id: 'iphone-se',  label: 'iPhone SE',       category: 'phone',   width: 375, height: 667,  minPanelWidth: 0 },
    { id: 'iphone-14',  label: 'iPhone 14',       category: 'phone',   width: 390, height: 844,  minPanelWidth: 0 },
    { id: 'iphone-14-pro-max', label: 'iPhone 14 Pro Max', category: 'phone', width: 430, height: 932, minPanelWidth: 0 },
    { id: 'pixel-7',    label: 'Pixel 7',         category: 'phone',   width: 412, height: 915,  minPanelWidth: 0 },
    { id: 'galaxy-s23', label: 'Galaxy S23',       category: 'phone',   width: 360, height: 780,  minPanelWidth: 0 },
    { id: 'ipad-mini',  label: 'iPad Mini',       category: 'tablet',  width: 768, height: 1024, minPanelWidth: 400 },
    { id: 'ipad-air',   label: 'iPad Air',        category: 'tablet',  width: 820, height: 1180, minPanelWidth: 400 },
    { id: 'desktop',    label: 'Desktop',          category: 'desktop', width: 0,   height: 0,    minPanelWidth: 780 },
  ];
  private detailTab: 'stop' = 'stop';
  private sidePanel!: HTMLElement;
  private detailPanel!: HTMLElement;
  private mapContainer!: HTMLElement;
  private statusEl!: HTMLElement;

  constructor(container: HTMLElement, tour: Tour, callbacks: EditorCallbacks) {
    this.container = container;
    this.tour = tour;
    this.callbacks = callbacks;
    clearUndoRedo();
    this.render();
  }

  private changed(): void {
    debouncedSave(this.tour);
  }

  private withUndo(fn: () => void): void {
    pushUndo(this.tour, this.dirtyLegs);
    fn();
    this.changed();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'editor-root';

    // Map area
    this.mapContainer = document.createElement('div');
    this.mapContainer.className = 'editor-map';
    this.container.appendChild(this.mapContainer);

    // Resize handle between map and panels
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'editor-resize-handle';
    this.container.appendChild(resizeHandle);
    this.setupResize(resizeHandle);

    // Side panel (stop list, metadata, routes)
    this.sidePanel = document.createElement('div');
    this.sidePanel.className = 'editor-panel';
    this.container.appendChild(this.sidePanel);

    // Detail panel (stop editor, welcome/goodbye, strings - appears on selection)
    this.detailPanel = document.createElement('div');
    this.detailPanel.className = 'editor-detail';
    this.container.appendChild(this.detailPanel);

    // Status bar
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'editor-status';
    this.container.appendChild(this.statusEl);

    this.initMap();
    this.renderPanel();
    this.setupKeyboard();
    this.refreshMap();
  }

  private setupResize(handle: HTMLElement): void {
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(startWidth + delta, window.innerWidth - 500));
      this.mapContainer.style.width = newWidth + 'px';
      handle.classList.add('dragging');
      this.map?.invalidateSize();
    };

    const onMouseUp = () => {
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startWidth = this.mapContainer.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer, { zoomControl: true, keyboard: false, doubleClickZoom: false }).setView([52.845, -8.985], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 22,
      maxNativeZoom: 19, // OSM tiles only go to 19; beyond that Leaflet upscales
    }).addTo(this.map);

    // Create a pane for route edit points that sits above markers
    const routePane = this.map.createPane('routeEditPoints');
    routePane.style.zIndex = '650'; // above markerPane (600)

    // Map click: behaviour depends on mode
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.mapMode === 'addStop') {
        this.addStop(e.latlng.lat, e.latlng.lng);
        this.setMapMode('default');
        return;
      }
      // Waypoint placement mode: place on nearest route point
      if (this.waypointPlacementMode && this.editingRouteSegment >= 0) {
        this.placeWaypointOnRoute(e.latlng);
        return;
      }
      // In route edit mode, click on map adds a point
      if (this.editingRouteSegment >= 0) {
        this.addRoutePointAtClick(e.latlng);
        return;
      }
      // Deselect any selected leg
      this.deselectLeg();
    });

    // Fit to stops if we have any
    if (this.tour.stops.length > 0) {
      const bounds = L.latLngBounds(this.tour.stops.map(s => [s.coords[0], s.coords[1]] as L.LatLngTuple));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  private addStop(lat: number, lng: number): void {
    this.withUndo(() => {
      const id = this.tour.stops.length + 1;
      const stop: Stop = {
        id,
        title: `Stop ${id}`,
        coords: [lat, lng],
        content: [],
      };
      // Add default getting_here for non-first stops
      if (this.tour.stops.length > 0) {
        stop.getting_here = {
          mode: (this.tour.tour.nav_mode as LegMode) || 'walk',
        };
      }
      this.tour.stops.push(stop);
      this.selectedStopIdx = this.tour.stops.length - 1;
    });
    // New stop affects legs to/from it (circular tour: last→first wraps)
    const newIdx = this.tour.stops.length - 1;
    this.markLegsDirty(newIdx);
    this.refreshMap();
    this.renderPanel();
    this.setStatus(`Added stop ${this.tour.stops.length} at [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
  }

  private deleteStop(idx: number): void {
    if (!confirm(`Delete "${this.tour.stops[idx].title}"?`)) return;
    this.withUndo(() => {
      this.tour.stops.splice(idx, 1);
      // Renumber
      this.tour.stops.forEach((s, i) => { s.id = i + 1; });
      if (this.selectedStopIdx >= this.tour.stops.length) {
        this.selectedStopIdx = this.tour.stops.length - 1;
      }
      this.stitchRouteEndpoints();
    });
    this.markAllLegsDirty();
    this.refreshMap();
    this.renderPanel();
    this.setStatus('Stop deleted. Stops renumbered.');
  }

  private moveStop(from: number, to: number): void {
    if (to < 0 || to >= this.tour.stops.length) return;
    this.withUndo(() => {
      const [stop] = this.tour.stops.splice(from, 1);
      this.tour.stops.splice(to, 0, stop);
      this.tour.stops.forEach((s, i) => { s.id = i + 1; });
      this.selectedStopIdx = to;
      this.stitchRouteEndpoints();
    });
    this.markLegsDirty(to);
    if (from < this.tour.stops.length) {
      this.markLegsDirty(from);
    }
    this.refreshMap();
    this.renderPanel();
  }

  private selectStop(idx: number): void {
    this.deselectLeg();
    this.exitRouteInteraction();
    this.selectedStopIdx = idx;
    this.selectedCard = null;
    this.detailTab = 'stop';
    this.renderPanel();
    this.highlightMarker(idx);
    if (idx >= 0 && idx < this.tour.stops.length) {
      const stop = this.tour.stops[idx];
      this.map.flyTo([stop.coords[0], stop.coords[1]], 19, { animate: true, duration: 0.6 });
      this.showRadiusCircle(stop);
    } else {
      this.clearRadiusCircle();
    }
  }

  private showRadiusCircle(stop: Stop): void {
    this.clearRadiusCircle();
    const radius = stop.arrival_radius ?? this.tour.tour.gps?.arrival_radius ?? 7.5;
    this.radiusCircle = L.circle([stop.coords[0], stop.coords[1]], {
      radius,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.08,
      weight: 1,
      dashArray: '4 4',
      interactive: true,
    }).addTo(this.map);
    this.radiusCircle.bindTooltip(`Arrival radius: ${radius}m`, { sticky: true });
  }

  private updateRadiusCircle(): void {
    if (this.selectedStopIdx >= 0 && this.selectedStopIdx < this.tour.stops.length) {
      this.showRadiusCircle(this.tour.stops[this.selectedStopIdx]);
    }
  }

  private clearRadiusCircle(): void {
    if (this.radiusCircle) {
      this.radiusCircle.remove();
      this.radiusCircle = null;
    }
  }

  private setMapMode(mode: 'default' | 'addStop'): void {
    this.mapMode = mode;
    this.mapContainer.style.cursor = mode === 'addStop' ? 'crosshair' : '';
    // Update the add stop button state
    const addBtn = this.sidePanel.querySelector('.add-stop-btn') as HTMLButtonElement | null;
    if (addBtn) {
      addBtn.classList.toggle('btn-primary', mode === 'addStop');
      addBtn.textContent = mode === 'addStop' ? 'Click map to place stop...' : '+ Add Stop';
    }
  }

  private startEditingRoute(stopIdx: number, fitMap = true): void {
    // If re-entering edit mode for the same route (rebuild after add/delete/move),
    // just clear markers without restoring the map view
    if (this.editingRouteSegment === stopIdx) {
      this.routePointMarkers.forEach(m => m.remove());
      this.routePointMarkers = [];
    } else {
      this.stopEditingRoute();
      this.deselectLeg();
    }
    if (stopIdx < 0 || stopIdx >= this.tour.stops.length) return;
    if (this.tour.stops.length < 2) return;
    const stop = this.tour.stops[stopIdx];
    if (!stop.getting_here?.route || stop.getting_here.route.length === 0) return;

    // Save current view to restore on Done (only on first entry)
    if (!this.preEditView) {
      this.preEditView = { center: this.map.getCenter(), zoom: this.map.getZoom() };
    }

    this.editingRouteSegment = stopIdx;
    const route = stop.getting_here.route;
    let justDragged = false;

    // Fit map to show the full segment with padding (only on first entry)
    if (fitMap) {
      const prevIdx = stopIdx === 0 ? this.tour.stops.length - 1 : stopIdx - 1;
      const prevStop = this.tour.stops[prevIdx];
      const allPts: L.LatLngTuple[] = [
        [prevStop.coords[0], prevStop.coords[1]],
        ...route.map(p => [p[0], p[1]] as L.LatLngTuple),
        [stop.coords[0], stop.coords[1]],
      ];
      this.map.fitBounds(L.latLngBounds(allPts), { padding: [60, 60], animate: true });
    }

    const rebuildMarkers = () => {
      this.routePointMarkers.forEach(m => m.remove());
      this.routePointMarkers = [];
      buildMarkers();
    };

    const buildMarkers = () => {
      route.forEach((pt, ptIdx) => {
        const isFirst = ptIdx === 0;
        const isLast = ptIdx === route.length - 1;
        const endpointColor = isFirst ? '#16a34a' : isLast ? '#dc2626' : null;
        const m = L.circleMarker([pt[0], pt[1]], {
          radius: endpointColor ? 10 : 8,
          fillColor: endpointColor ?? '#2563eb',
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
          pane: 'routeEditPoints',
          bubblingMouseEvents: false,
        }).addTo(this.map);

        // Drag support
        m.on('mousedown', (e) => {
          justDragged = false;
          pushUndo(this.tour, this.dirtyLegs); // snapshot before drag starts
          this.map.dragging.disable();
          L.DomEvent.stopPropagation(e);
          const onMove = (ev: L.LeafletMouseEvent) => {
            if (!justDragged) {
              // First move: select this point visually
              justDragged = true;
              this.routePointMarkers.forEach((rm, ri) => {
                const defColor = ri === 0 ? '#16a34a' : ri === route.length - 1 ? '#dc2626' : '#2563eb';
                rm.setStyle({ fillColor: defColor, radius: (ri === 0 || ri === route.length - 1) ? 10 : 8 });
                (rm.options as any)._selected = false;
              });
              m.setStyle({ fillColor: '#f59e0b', radius: 12 });
              (m.options as any)._selected = true;
            }
            m.setLatLng(ev.latlng);
            route[ptIdx] = [ev.latlng.lat, ev.latlng.lng];
            this.refreshRoutePolylines();
          };
          const onUp = () => {
            this.map.dragging.enable();
            this.map.off('mousemove', onMove);
            this.map.off('mouseup', onUp);
            if (justDragged) {
              this.changed();
              // (bar is CSS-positioned, no update needed)
            }
            // Prevent the map click from firing after drag
            setTimeout(() => { justDragged = false; }, 50);
          };
          this.map.on('mousemove', onMove);
          this.map.on('mouseup', onUp);
        });

        // Click to select/deselect - only if not just dragged
        m.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (justDragged) return;
          const wasSelected = (m.options as any)._selected;
          // Deselect all — restore endpoint colors
          this.routePointMarkers.forEach((rm, ri) => {
            const defColor = ri === 0 ? '#16a34a' : ri === route.length - 1 ? '#dc2626' : '#2563eb';
            rm.setStyle({ fillColor: defColor, radius: (ri === 0 || ri === route.length - 1) ? 10 : 8 });
            (rm.options as any)._selected = false;
          });
          // Toggle: if it wasn't selected, select it. If it was, leave deselected.
          if (!wasSelected) {
            m.setStyle({ fillColor: '#f59e0b', radius: 12 });
            (m.options as any)._selected = true;
          }
        });

        this.routePointMarkers.push(m);
      });

      // Make the polyline clickable for inserting points
      if (this.routePolylines.has(stopIdx)) {
        const pl = this.routePolylines.get(stopIdx)!;
        pl.off('click');
        pl.setStyle({ weight: 6, opacity: 0.4 }); // wider click target
        pl.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          let bestIdx = 0, bestDist = Infinity;
          for (let i = 0; i < route.length - 1; i++) {
            const d = this.distToSegment(e.latlng, route[i], route[i + 1]);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          }
          this.withUndo(() => {
            route.splice(bestIdx + 1, 0, [e.latlng.lat, e.latlng.lng]);
          });
          this.refreshRoutePolylines();
          rebuildMarkers();
          // (bar is CSS-positioned, no update needed)
          this.setStatus(`Inserted point. ${route.length} points.`);
        });
      }
    };

    buildMarkers();
    this.renderWaypointMarkers(stopIdx);
    // Only show editing bar if one doesn't already exist (e.g. transitioned from selection bar)
    if (!this.mapContainer.querySelector('.maptour-leg-action-bar')) {
      this.showEditingActionBar(stopIdx);
    }
    this.setStatus(`Editing route to stop ${stopIdx + 1}.`);
  }

  private showEditingActionBar(stopIdx: number): void {
    this.hideLegActionBar();

    const prevIdx = stopIdx === 0 ? this.tour.stops.length - 1 : stopIdx - 1;
    const bar = document.createElement('div');
    bar.className = 'maptour-leg-action-bar';
    bar.style.visibility = 'hidden';

    const label = document.createElement('span');
    label.className = 'maptour-leg-action-label';
    label.innerHTML = `<i class="fa-solid fa-pen" aria-hidden="true"></i> Editing: Stop ${prevIdx + 1} → ${stopIdx + 1}`;
    bar.appendChild(label);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-primary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => {
      // Auto-connect last point to destination if not already there
      const stop = this.tour.stops[stopIdx];
      const route = stop.getting_here?.route;
      if (route && route.length > 0) {
        const lastPt = route[route.length - 1];
        const dest = stop.coords;
        const dist = Math.sqrt((lastPt[0] - dest[0]) ** 2 + (lastPt[1] - dest[1]) ** 2);
        if (dist > 1e-6) {
          route.push([...dest] as [number, number]);
          this.changed();
        }
      }
      pushUndo(this.tour, this.dirtyLegs);
      this.clearLegDirty(stopIdx);
      this.changed();
      this.stopEditingRoute();
      this.refreshRoutePolylines();
      this.setStatus('Route editing finished.');
    };
    bar.appendChild(doneBtn);

    const wpBtn = document.createElement('button');
    wpBtn.className = 'btn btn-sm';
    wpBtn.innerHTML = `<i class="fa-solid fa-map-pin"></i> ${I18N_DEFAULTS.add_waypoint.default}`;
    const stop = this.tour.stops[stopIdx];
    if (!stop.getting_here?.route?.length) {
      wpBtn.disabled = true;
      wpBtn.title = I18N_DEFAULTS.waypoint_no_route.default;
    } else {
      wpBtn.onclick = () => this.enterWaypointPlacementMode(stopIdx);
    }
    bar.appendChild(wpBtn);

    this.mapContainer.appendChild(bar);
    L.DomEvent.disableClickPropagation(bar);
    this.setupBarDrag(bar);

    // Position near the leg, avoiding overlap
    requestAnimationFrame(() => {
      const midPt = this.getLegBarPosition(stopIdx);
      const containerRect = this.mapContainer.getBoundingClientRect();
      const barW = bar.offsetWidth;
      const barH = bar.offsetHeight;
      const margin = 8;
      let left = midPt.x - barW / 2;
      let top = midPt.y - barH - 12;
      if (top < margin) top = midPt.y + 12;
      left = Math.max(margin, Math.min(left, containerRect.width - barW - margin));
      top = Math.max(margin, Math.min(top, containerRect.height - barH - margin));
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
      bar.style.visibility = '';
    });
  }

  private replaceBarWithEditingControls(bar: HTMLElement, stopIdx: number): void {
    const prevIdx = stopIdx === 0 ? this.tour.stops.length - 1 : stopIdx - 1;
    bar.innerHTML = '';

    const label = document.createElement('span');
    label.className = 'maptour-leg-action-label';
    label.innerHTML = `<i class="fa-solid fa-pen" aria-hidden="true"></i> Editing: Stop ${prevIdx + 1} → ${stopIdx + 1}`;
    bar.appendChild(label);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-primary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => {
      const stop = this.tour.stops[stopIdx];
      const route = stop.getting_here?.route;
      if (route && route.length > 0) {
        const lastPt = route[route.length - 1];
        const dest = stop.coords;
        const dist = Math.sqrt((lastPt[0] - dest[0]) ** 2 + (lastPt[1] - dest[1]) ** 2);
        if (dist > 1e-6) {
          route.push([...dest] as [number, number]);
          this.changed();
        }
      }
      pushUndo(this.tour, this.dirtyLegs);
      this.clearLegDirty(stopIdx);
      this.changed();
      this.stopEditingRoute();
      this.refreshRoutePolylines();
      this.setStatus('Route editing finished.');
    };
    bar.appendChild(doneBtn);

    const wpBtn2 = document.createElement('button');
    wpBtn2.className = 'btn btn-sm';
    wpBtn2.innerHTML = `<i class="fa-solid fa-map-pin"></i> ${I18N_DEFAULTS.add_waypoint.default}`;
    const stop2 = this.tour.stops[stopIdx];
    if (!stop2.getting_here?.route?.length) {
      wpBtn2.disabled = true;
      wpBtn2.title = I18N_DEFAULTS.waypoint_no_route.default;
    } else {
      wpBtn2.onclick = () => this.enterWaypointPlacementMode(stopIdx);
    }
    bar.appendChild(wpBtn2);
  }

  private startReviewingRoute(stopIdx: number): void {
    this.stopReviewingRoute();
    this.deselectLeg();
    // Enter full edit mode (draggable points) but track as review
    this.reviewingRouteSegment = stopIdx;
    this.startEditingRoute(stopIdx);
    // Replace the editing bar with review bar (startEditingRoute shows editing bar
    // only if no bar exists, but we want review bar)
    this.showReviewActionBar(stopIdx);
    this.setStatus(`Reviewing route to stop ${stopIdx + 1}.`);
  }

  private showReviewActionBar(stopIdx: number): void {
    this.hideLegActionBar();

    const prevIdx = stopIdx === 0 ? this.tour.stops.length - 1 : stopIdx - 1;
    const stop = this.tour.stops[stopIdx];
    const prevStop = this.tour.stops[prevIdx];
    const hasRoute = !!(stop?.getting_here?.route?.length);

    const bar = document.createElement('div');
    bar.className = 'maptour-leg-action-bar';

    const label = document.createElement('span');
    label.className = 'maptour-leg-action-label';
    label.innerHTML = `<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Reviewing: Stop ${prevIdx + 1} → ${stopIdx + 1}`;
    bar.appendChild(label);

    const reviewedBtn = document.createElement('button');
    reviewedBtn.className = 'btn btn-sm';
    reviewedBtn.innerHTML = '<i class="fa-solid fa-check"></i> Mark Reviewed';
    reviewedBtn.onclick = () => {
      pushUndo(this.tour, this.dirtyLegs);
      this.clearLegDirty(stopIdx);
      this.changed();
      this.reviewingRouteSegment = -1;
      this.stopEditingRoute();
      this.refreshRoutePolylines();
    };
    bar.appendChild(reviewedBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    delBtn.title = 'Delete route';
    delBtn.onclick = () => {
      if (!confirm('Delete route?')) return;
      this.withUndo(() => { stop.getting_here!.route = undefined; });
      this.dirtyLegs.delete(stopIdx);
      this.reviewingRouteSegment = -1;
      this.stopEditingRoute();
      this.refreshRoutePolylines();
      this.renderPanel();
      this.setStatus(`Deleted route to stop ${stopIdx + 1}.`);
    };
    bar.appendChild(delBtn);

    if (this.tour.stops.length > 1) {
      const autoBtn = document.createElement('button');
      autoBtn.className = 'btn btn-sm';
      autoBtn.innerHTML = '<i class="fa-solid fa-route"></i> Auto';
      autoBtn.onclick = async () => {
        if (hasRoute && !confirm('Delete route and create new route automatically?')) return;
        const apiKey = getOrsApiKey();
        if (!apiKey) {
          this.showOrsKeyModal(() => { autoBtn.click(); });
          return;
        }
        autoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        autoBtn.disabled = true;
        try {
          if (!stop.getting_here) stop.getting_here = { mode: (this.tour.tour.nav_mode as LegMode) || 'walk' };
          const route = await generateRoute(prevStop.coords, stop.coords);
          this.withUndo(() => { stop.getting_here!.route = route; });
          this.clearLegDirty(stopIdx);
          this.reviewingRouteSegment = -1;
          this.stopEditingRoute();
          this.refreshRoutePolylines();
          this.renderPanel();
          this.setStatus(`Route generated: ${route.length} points.`);
        } catch (err) {
          this.setStatus(`Route failed: ${(err as Error).message}`);
          autoBtn.innerHTML = '<i class="fa-solid fa-route"></i> Auto';
          autoBtn.disabled = false;
        }
      };
      bar.appendChild(autoBtn);
    }

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-primary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => {
      if (confirm('Mark route as reviewed?')) {
        pushUndo(this.tour, this.dirtyLegs);
        this.clearLegDirty(stopIdx);
        this.changed();
      }
      this.reviewingRouteSegment = -1;
      this.stopEditingRoute();
      this.refreshRoutePolylines();
    };
    bar.appendChild(doneBtn);

    this.mapContainer.appendChild(bar);
    L.DomEvent.disableClickPropagation(bar);
    this.setupBarDrag(bar);

    // Position avoiding route overlap
    requestAnimationFrame(() => {
      const pos = this.getLegBarPosition(stopIdx);
      const containerRect = this.mapContainer.getBoundingClientRect();
      const barW = bar.offsetWidth;
      const barH = bar.offsetHeight;
      const margin = 8;
      let left = pos.x - barW / 2;
      let top = pos.y - barH - 12;
      if (top < margin) top = pos.y + 12;
      left = Math.max(margin, Math.min(left, containerRect.width - barW - margin));
      top = Math.max(margin, Math.min(top, containerRect.height - barH - margin));
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
    });
  }

  /** Exit any active route interaction (review or edit). */
  private exitRouteInteraction(): void {
    if (this.reviewingRouteSegment >= 0) {
      this.stopReviewingRoute();
      this.refreshRoutePolylines();
    } else if (this.editingRouteSegment >= 0) {
      this.stopEditingRoute();
      this.refreshRoutePolylines();
    }
  }

  private stopReviewingRoute(): void {
    if (this.reviewingRouteSegment < 0) return;
    this.reviewingRouteSegment = -1;
    this.stopEditingRoute();
  }

  private stopEditingRoute(): void {
    this.routePointMarkers.forEach(m => m.remove());
    this.routePointMarkers = [];
    this.waypointMarkers.forEach(m => m.remove());
    this.waypointMarkers = [];
    this.exitWaypointPlacementMode();
    this.editingRouteSegment = -1;
    this.hideLegActionBar();
    // Restore the map view from before editing
    if (this.preEditView) {
      this.map.flyTo(this.preEditView.center, this.preEditView.zoom, { animate: true, duration: 0.5 });
      this.preEditView = null;
    }
  }

  private addRoutePointAtClick(latlng: L.LatLng): void {
    if (this.editingRouteSegment < 0) return;
    const stop = this.tour.stops[this.editingRouteSegment];
    if (!stop.getting_here?.route) return;
    const route = stop.getting_here.route;
    const pt: [number, number] = [latlng.lat, latlng.lng];

    if (route.length < 2) {
      this.withUndo(() => { route.push(pt); });
    } else {
      // Find nearest segment or endpoint
      const distToFirst = Math.sqrt((pt[0] - route[0][0]) ** 2 + (pt[1] - route[0][1]) ** 2);
      const distToLast = Math.sqrt((pt[0] - route[route.length - 1][0]) ** 2 + (pt[1] - route[route.length - 1][1]) ** 2);

      // Find nearest interior segment
      let bestSegIdx = 0;
      let bestSegDist = Infinity;
      for (let i = 0; i < route.length - 1; i++) {
        const d = this.distToSegment(latlng, route[i], route[i + 1]);
        if (d < bestSegDist) { bestSegDist = d; bestSegIdx = i; }
      }

      // Compare: prepend, append, or insert?
      // Use a threshold: if closer to an endpoint than to any segment, extend
      const endThreshold = bestSegDist * 1.5; // bias toward inserting within segments
      if (distToFirst < distToLast && distToFirst < endThreshold) {
        this.withUndo(() => { route.unshift(pt); });
      } else if (distToLast < distToFirst && distToLast < endThreshold) {
        this.withUndo(() => { route.push(pt); });
      } else {
        this.withUndo(() => { route.splice(bestSegIdx + 1, 0, pt); });
      }
    }

    this.refreshRoutePolylines();
    // Rebuild markers without re-fitting the map
    this.routePointMarkers.forEach(m => m.remove());
    this.routePointMarkers = [];
    this.startEditingRoute(this.editingRouteSegment, false);
    this.setStatus(`Added point. ${route.length} points.`);
  }

  private deleteSelectedRoutePoint(): void {
    if (this.editingRouteSegment < 0) return;
    const segIdx = this.editingRouteSegment;
    const stop = this.tour.stops[segIdx];
    if (!stop.getting_here?.route) return;
    const route = stop.getting_here.route;

    const selectedIdx = this.routePointMarkers.findIndex(m => (m.options as any)._selected);
    if (selectedIdx < 0) return;
    if (route.length <= 2) { this.setStatus('Cannot delete - minimum 2 points.'); return; }

    this.withUndo(() => {
      route.splice(selectedIdx, 1);
    });
    // Rebuild markers in place (don't reset editingRouteSegment)
    this.routePointMarkers.forEach(m => m.remove());
    this.routePointMarkers = [];
    this.refreshRoutePolylines();
    this.startEditingRoute(segIdx, false);
    this.setStatus(`Deleted point. ${route.length} points remaining.`);
  }

  private distToSegment(latlng: L.LatLng, p1: [number, number], p2: [number, number]): number {
    const x = latlng.lat, y = latlng.lng;
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    if (dx === 0 && dy === 0) return Math.sqrt((x - p1[0]) ** 2 + (y - p1[1]) ** 2);
    let t = ((x - p1[0]) * dx + (y - p1[1]) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((x - (p1[0] + t * dx)) ** 2 + (y - (p1[1] + t * dy)) ** 2);
  }

  /** Ensure every route's first point matches the previous stop and last point matches the destination stop. */
  private stitchRouteEndpoints(): void {
    const n = this.tour.stops.length;
    for (let i = 0; i < n; i++) {
      const stop = this.tour.stops[i];
      if (!stop.getting_here?.route?.length) continue;
      const route = stop.getting_here.route;
      const prevIdx = i === 0 ? n - 1 : i - 1;
      const prevStop = this.tour.stops[prevIdx];
      route[0] = [...prevStop.coords] as [number, number];
      route[route.length - 1] = [...stop.coords] as [number, number];
    }
  }

  /** Mark the leg arriving at `idx` and the leg departing from `idx` (next stop's getting_here) as dirty. */
  private markLegsDirty(idx: number): void {
    const n = this.tour.stops.length;
    if (n < 2) return;
    // The leg arriving at this stop
    if (this.tour.stops[idx]?.getting_here?.route?.length) {
      this.dirtyLegs.add(idx);
    }
    // The leg departing from this stop (= next stop's getting_here)
    const nextIdx = (idx + 1) % n;
    if (this.tour.stops[nextIdx]?.getting_here?.route?.length) {
      this.dirtyLegs.add(nextIdx);
    }
  }

  /** Mark all legs with routes as dirty (used after reorder/delete). */
  private markAllLegsDirty(): void {
    this.tour.stops.forEach((stop, i) => {
      if (stop.getting_here?.route?.length) {
        this.dirtyLegs.add(i);
      }
    });
  }

  /** Clear dirty flag for a specific leg (called after editing/regenerating a route). */
  private clearLegDirty(idx: number): void {
    this.dirtyLegs.delete(idx);
  }

  private selectLeg(idx: number, _clickPoint?: { x: number; y: number }): void {
    this.selectedLeg = idx;
    this.refreshRoutePolylines();
    this.fitLegBounds(idx);
    // Show bar after zoom settles (or immediately if no move needed)
    let shown = false;
    const showBar = () => {
      if (shown || this.selectedLeg !== idx) return;
      shown = true;
      const pos = this.getLegBarPosition(idx);
      this.showLegActionBar(idx, pos);
    };
    this.map.once('moveend', showBar);
    requestAnimationFrame(() => {
      // If fitBounds was a no-op (already at right zoom), moveend won't fire
      setTimeout(() => { this.map.off('moveend', showBar); showBar(); }, 50);
    });
  }

  private fitLegBounds(idx: number): void {
    const stop = this.tour.stops[idx];
    const prevIdx = idx === 0 ? this.tour.stops.length - 1 : idx - 1;
    const prevStop = this.tour.stops[prevIdx];
    const pts: L.LatLngTuple[] = [[prevStop.coords[0], prevStop.coords[1]]];
    if (stop.getting_here?.route?.length) {
      pts.push(...stop.getting_here.route.map(p => [p[0], p[1]] as L.LatLngTuple));
    }
    pts.push([stop.coords[0], stop.coords[1]]);
    this.map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], animate: true });
  }

  /** Get a position for the action bar that avoids overlapping the route. */
  private getLegBarPosition(idx: number): { x: number; y: number } {
    const stop = this.tour.stops[idx];
    const prevIdx = idx === 0 ? this.tour.stops.length - 1 : idx - 1;
    const prevStop = this.tour.stops[prevIdx];

    // Collect all leg points in container coordinates
    const pts: L.Point[] = [this.map.latLngToContainerPoint(prevStop.coords)];
    if (stop.getting_here?.route?.length) {
      for (const p of stop.getting_here.route) {
        pts.push(this.map.latLngToContainerPoint([p[0], p[1]]));
      }
    }
    pts.push(this.map.latLngToContainerPoint(stop.coords));

    // Find bounding box of the route in container coords
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0;
    for (const p of pts) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      sumX += p.x;
    }
    const centerX = sumX / pts.length;

    // Place bar above the route if there's room, otherwise below
    const containerH = this.mapContainer.offsetHeight;
    const barEstimatedH = 40;
    const gap = 16;
    let y: number;
    if (minY > barEstimatedH + gap + 8) {
      y = minY - gap; // above the route (the positioning code will subtract barH)
    } else if (maxY + barEstimatedH + gap < containerH) {
      y = maxY + gap + barEstimatedH; // below the route
    } else {
      y = minY - gap; // default: above, let clamping handle it
    }

    return { x: centerX, y };
  }

  private deselectLeg(): void {
    if (this.selectedLeg >= 0) {
      this.selectedLeg = -1;
      this.hideLegActionBar();
      this.refreshRoutePolylines();
    }
  }

  private showLegActionBar(idx: number, clickPoint?: { x: number; y: number }): void {
    this.hideLegActionBar();
    const stop = this.tour.stops[idx];
    const hasRoute = !!(stop?.getting_here?.route?.length);
    const isDirty = this.dirtyLegs.has(idx);
    const prevIdx = idx === 0 ? this.tour.stops.length - 1 : idx - 1;
    const prevStop = this.tour.stops[prevIdx];

    const bar = document.createElement('div');
    bar.className = 'maptour-leg-action-bar';
    // Position off-screen initially so we can measure it
    bar.style.visibility = 'hidden';

    const label = document.createElement('span');
    label.className = 'maptour-leg-action-label';
    label.textContent = `Leg: Stop ${prevIdx + 1} → ${idx + 1}`;
    bar.appendChild(label);

    if (hasRoute) {
      if (isDirty) {
        // Dirty route: "Review" enters review mode
        const reviewRouteBtn = document.createElement('button');
        reviewRouteBtn.className = 'btn btn-sm';
        reviewRouteBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Review';
        reviewRouteBtn.title = 'Review dirty route';
        reviewRouteBtn.onclick = () => {
          this.deselectLeg();
          this.startReviewingRoute(idx);
        };
        bar.appendChild(reviewRouteBtn);
      } else {
        // Clean route: "Edit" enters edit mode
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm';
        editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';
        editBtn.title = 'Edit route points (double-click or E)';
        editBtn.onclick = (ev) => {
          ev.stopPropagation();
          const barLeft = bar.style.left;
          const barTop = bar.style.top;
          this.selectedLeg = -1;
          this.startEditingRoute(idx, false);
          this.refreshRoutePolylines();
          this.replaceBarWithEditingControls(bar, idx);
          bar.style.left = barLeft;
          bar.style.top = barTop;
          bar.style.transform = '';
          bar.style.visibility = '';
        };
        bar.appendChild(editBtn);
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = 'Delete route (Delete)';
      delBtn.onclick = () => {
        if (!confirm('Delete route?')) return;
        this.deleteSelectedLeg();
      };
      bar.appendChild(delBtn);
    } else {
      const drawBtn = document.createElement('button');
      drawBtn.className = 'btn btn-sm';
      drawBtn.innerHTML = '<i class="fa-solid fa-draw-polygon"></i> Draw';
      drawBtn.title = 'Create route and edit';
      drawBtn.onclick = () => this.drawAndEditLeg(idx);
      bar.appendChild(drawBtn);
    }

    // Auto-route (always available when there's a previous stop)
    if (this.tour.stops.length > 1) {
      const autoBtn = document.createElement('button');
      autoBtn.className = 'btn btn-sm';
      autoBtn.innerHTML = '<i class="fa-solid fa-route"></i> Auto';
      autoBtn.title = 'Generate route automatically';
      autoBtn.onclick = async () => {
        if (hasRoute && !confirm('Delete route and create new route automatically?')) return;
        const apiKey = getOrsApiKey();
        if (!apiKey) {
          this.showOrsKeyModal(() => { autoBtn.click(); });
          return;
        }
        autoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        autoBtn.disabled = true;
        try {
          if (!stop.getting_here) stop.getting_here = { mode: (this.tour.tour.nav_mode as LegMode) || 'walk' };
          const route = await generateRoute(prevStop.coords, stop.coords);
          this.withUndo(() => { stop.getting_here!.route = route; });
          this.clearLegDirty(idx);
          this.deselectLeg();
          this.refreshRoutePolylines();
          this.renderPanel();
          this.setStatus(`Route generated: ${route.length} points.`);
        } catch (err) {
          this.setStatus(`Route failed: ${(err as Error).message}`);
          autoBtn.innerHTML = '<i class="fa-solid fa-route"></i> Auto';
          autoBtn.disabled = false;
        }
      };
      bar.appendChild(autoBtn);
    }

    this.mapContainer.appendChild(bar);
    L.DomEvent.disableClickPropagation(bar);
    this.setupBarDrag(bar);

    // Position near click point, clamped to stay within the map container
    requestAnimationFrame(() => {
      const containerRect = this.mapContainer.getBoundingClientRect();
      const barW = bar.offsetWidth;
      const barH = bar.offsetHeight;
      const margin = 8;

      if (clickPoint) {
        // Place bar centered horizontally on click, above the click point
        let left = clickPoint.x - barW / 2;
        let top = clickPoint.y - barH - 12;

        // If it would go above the container, place below the click instead
        if (top < margin) {
          top = clickPoint.y + 12;
        }

        // Clamp horizontally
        left = Math.max(margin, Math.min(left, containerRect.width - barW - margin));
        // Clamp vertically
        top = Math.max(margin, Math.min(top, containerRect.height - barH - margin));

        bar.style.left = `${left}px`;
        bar.style.top = `${top}px`;
      } else {
        // Fallback: center at bottom
        bar.style.left = `${(containerRect.width - barW) / 2}px`;
        bar.style.bottom = `${margin}px`;
      }

      bar.style.visibility = '';
    });
  }

  private hideLegActionBar(): void {
    this.mapContainer.querySelector('.maptour-leg-action-bar')?.remove();
  }

  private setupBarDrag(bar: HTMLElement): void {
    bar.style.cursor = 'grab';
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onMove = (e: MouseEvent) => {
      const containerRect = this.mapContainer.getBoundingClientRect();
      const barW = bar.offsetWidth;
      const barH = bar.offsetHeight;
      const margin = 4;
      let left = startLeft + (e.clientX - startX);
      let top = startTop + (e.clientY - startY);
      left = Math.max(margin, Math.min(left, containerRect.width - barW - margin));
      top = Math.max(margin, Math.min(top, containerRect.height - barH - margin));
      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
      bar.style.transform = '';
    };

    const onUp = () => {
      bar.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };

    bar.addEventListener('mousedown', (e) => {
      // Don't drag when clicking buttons
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = bar.offsetLeft;
      startTop = bar.offsetTop;
      bar.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /** Create a 3-point route (start, midpoint, end) and enter edit mode. */
  private drawAndEditLeg(idx: number): void {
    const stop = this.tour.stops[idx];
    const prevIdx = idx === 0 ? this.tour.stops.length - 1 : idx - 1;
    const prevStop = this.tour.stops[prevIdx];
    if (!stop.getting_here) stop.getting_here = { mode: (this.tour.tour.nav_mode as LegMode) || 'walk' };
    const mid: [number, number] = [
      (prevStop.coords[0] + stop.coords[0]) / 2,
      (prevStop.coords[1] + stop.coords[1]) / 2,
    ];
    this.withUndo(() => {
      stop.getting_here!.route = [
        [...prevStop.coords] as [number, number],
        mid,
        [...stop.coords] as [number, number],
      ];
    });
    this.deselectLeg();
    this.refreshRoutePolylines();
    this.startEditingRoute(idx);
    this.renderPanel();
  }

  private deleteSelectedLeg(): void {
    if (this.selectedLeg < 0) return;
    const stop = this.tour.stops[this.selectedLeg];
    if (!stop?.getting_here?.route?.length) return;
    const deletedIdx = this.selectedLeg;
    this.withUndo(() => {
      stop.getting_here!.route = undefined;
    });
    this.dirtyLegs.delete(deletedIdx);
    this.deselectLeg();
    this.refreshRoutePolylines();
    this.renderPanel();
    this.setStatus(`Deleted route to stop ${deletedIdx + 1}.`);
  }

  private refreshMap(): void {
    // Clear existing markers, polylines, and route edit points
    this.stopMarkers.forEach(m => m.remove());
    this.stopMarkers = [];
    this.routePolylines.forEach(p => p.remove());
    this.routePolylines = new Map();
    this.routeHitAreas.forEach(p => p.remove());
    this.routeHitAreas = [];
    this.routeConnectors.forEach(p => p.remove());
    this.routeConnectors = [];
    this.stopEditingRoute();

    // Add stop markers
    this.tour.stops.forEach((stop, idx) => {
      const marker = L.marker([stop.coords[0], stop.coords[1]], {
        draggable: true,
        icon: this.makeStopIcon(idx + 1, idx === this.selectedStopIdx),
      }).addTo(this.map);

      marker.bindTooltip(stop.title, { permanent: false });

      marker.on('click', () => {
        this.selectStop(idx);
      });

      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        const newCoords: [number, number] = [ll.lat, ll.lng];
        this.withUndo(() => {
          stop.coords = newCoords;
          // Update the last point of this stop's route (this stop is the destination)
          if (stop.getting_here?.route?.length) {
            stop.getting_here.route[stop.getting_here.route.length - 1] = [...newCoords] as [number, number];
          }
          // Update the first point of the next stop's route (this stop is the origin)
          const nextIdx = (idx + 1) % this.tour.stops.length;
          const nextStop = this.tour.stops[nextIdx];
          if (nextStop.getting_here?.route?.length) {
            nextStop.getting_here.route[0] = [...newCoords] as [number, number];
          }
        });
        this.markLegsDirty(idx);
        this.refreshRoutePolylines();
        this.renderPanel();
        this.setStatus(`Moved ${stop.title} to [${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}]`);
      });

      this.stopMarkers.push(marker);
    });

    this.refreshRoutePolylines();
  }

  private refreshRoutePolylines(): void {
    this.routePolylines.forEach(p => p.remove());
    this.routePolylines = new Map();
    this.routeHitAreas.forEach(p => p.remove());
    this.routeHitAreas = [];
    this.routeConnectors.forEach(p => p.remove());
    this.routeConnectors = [];

    for (let i = 0; i < this.tour.stops.length; i++) {
      const stop = this.tour.stops[i];
      const prevIdx = i === 0 ? this.tour.stops.length - 1 : i - 1;
      const prevStop = this.tour.stops[prevIdx];

      // Skip if this stop has no getting_here and it's the first stop (no implicit route)
      if (!stop.getting_here && i === 0) continue;

      const hasRoute = !!(stop.getting_here?.route && stop.getting_here.route.length > 0);
      const isEditing = i === this.editingRouteSegment;

      const isDirty = this.dirtyLegs.has(i);
      const isSelected = i === this.selectedLeg;

      // Determine the points for this leg
      const legPts: L.LatLngTuple[] = hasRoute
        ? stop.getting_here!.route!.map(p => [p[0], p[1]] as L.LatLngTuple)
        : [prevStop.coords, stop.coords];

      if (hasRoute) {
        // Colour: yellow if dirty, cyan if selected, blue otherwise
        const color = isSelected ? '#06b6d4' : isDirty ? '#d97706' : '#2563eb';
        const weight = isEditing ? 4 : isSelected ? 5 : isDirty ? 4 : 3;
        const opacity = isEditing ? 0.9 : isSelected ? 0.9 : isDirty ? 0.85 : 0.7;

        const polyline = L.polyline(legPts, {
          color, weight, opacity, interactive: isEditing,
        }).addTo(this.map);
        this.routePolylines.set(i, polyline);

        // During editing, show dashed connector from last route point to destination
        if (isEditing) {
          const lastPt = stop.getting_here!.route![stop.getting_here!.route!.length - 1];
          if (lastPt[0] !== stop.coords[0] || lastPt[1] !== stop.coords[1]) {
            const connector = L.polyline([lastPt, stop.coords], {
              color: '#94a3b8', weight: 2, dashArray: '6 4', opacity: 0.6,
            }).addTo(this.map);
            this.routeConnectors.push(connector);
          }
        }
      } else {
        // No route — draw a faint straight line from prev to this stop
        const color = isSelected ? '#06b6d4' : '#94a3b8';
        const weight = isSelected ? 4 : 2;
        const polyline = L.polyline(legPts, {
          color, weight, dashArray: '6 4', opacity: 0.7, interactive: false,
        }).addTo(this.map);
        this.routePolylines.set(i, polyline);
      }

      // Invisible wide hit-area polyline for click/dblclick (not during route editing)
      if (!isEditing) {
        const hitArea = L.polyline(legPts, {
          weight: 20, opacity: 0, interactive: true,
        }).addTo(this.map);
        this.routeHitAreas.push(hitArea);

        let clickTimer: ReturnType<typeof setTimeout> | null = null;
        let lastClickPt: { x: number; y: number } | undefined;
        hitArea.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
          lastClickPt = { x: e.containerPoint.x, y: e.containerPoint.y };
          clickTimer = setTimeout(() => {
            clickTimer = null;
            if (this.selectedLeg === i) {
              this.deselectLeg();
            } else {
              this.selectLeg(i, lastClickPt);
            }
          }, 250);
        });
        hitArea.on('dblclick', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
          if (hasRoute) {
            this.deselectLeg();
            if (isDirty) {
              this.startReviewingRoute(i);
            } else {
              this.startEditingRoute(i);
            }
          } else {
            this.drawAndEditLeg(i);
          }
        });
      }
    }
  }

  private makeStopIcon(num: number, selected: boolean): L.DivIcon {
    return L.divIcon({
      className: 'stop-marker-icon',
      html: `<div class="stop-marker ${selected ? 'selected' : ''}">${num}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  private highlightMarker(selectedIdx: number): void {
    this.stopMarkers.forEach((marker, idx) => {
      marker.setIcon(this.makeStopIcon(idx + 1, idx === selectedIdx));
    });
  }

  // ---- Panel rendering ----

  private renderPanel(): void {
    this.sidePanel.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'panel-toolbar';

    const backBtn = document.createElement('a');
    backBtn.href = '#';
    backBtn.className = 'btn btn-link';
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Tours';
    backBtn.onclick = (e) => { e.preventDefault(); this.callbacks.onBackToList(); };
    toolbar.appendChild(backBtn);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'input tour-title-input';
    titleInput.value = this.tour.tour.title;
    titleInput.oninput = () => {
      this.tour.tour.title = titleInput.value;
      this.changed();
    };
    toolbar.appendChild(titleInput);

    this.sidePanel.appendChild(toolbar);

    // Scrollable content
    const scrollable = document.createElement('div');
    scrollable.className = 'panel-scrollable';

    scrollable.appendChild(this.renderMetadataSection());
    scrollable.appendChild(this.renderCardsList());
    scrollable.appendChild(this.renderStringsSection());

    // Export button at the bottom
    const exportDiv = document.createElement('div');
    exportDiv.style.cssText = 'padding: 12px;';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-primary';
    exportBtn.style.width = '100%';
    exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export YAML';
    exportBtn.onclick = () => {
      if (this.tour.stops.length === 0) {
        alert('Add at least one stop before exporting.');
        return;
      }
      downloadYaml(this.tour);
      this.setStatus('YAML exported.');
    };
    exportDiv.appendChild(exportBtn);
    scrollable.appendChild(exportDiv);

    this.sidePanel.appendChild(scrollable);

    // Detail panel: stop editor or welcome/goodbye/strings
    this.renderDetailPanel();
  }

  private getDevice() {
    return TourEditor.DEVICES.find(d => d.id === this.previewDevice) || TourEditor.DEVICES[1];
  }

  private makeDeviceToolbar(title: string): HTMLElement {
    const wrapper = document.createElement('div');

    // Top bar: title + close button
    const toolbar = document.createElement('div');
    toolbar.className = 'panel-toolbar';

    const label = document.createElement('span');
    label.style.cssText = 'font-weight:600; font-size:14px; flex:1;';
    label.textContent = title;
    toolbar.appendChild(label);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => {
      this.selectedStopIdx = -1;
      this.selectedCard = null;
      this.refreshMap();
      this.renderPanel();
    };
    toolbar.appendChild(closeBtn);
    wrapper.appendChild(toolbar);

    // Device category tabs
    const categories: Array<{ key: 'phone' | 'tablet' | 'desktop'; label: string }> = [
      { key: 'phone', label: 'Phone' },
      { key: 'tablet', label: 'Tablet' },
      { key: 'desktop', label: 'Desktop' },
    ];
    const currentDevice = this.getDevice();
    const panelWidth = this.detailPanel.offsetWidth;

    const tabBar = document.createElement('div');
    tabBar.className = 'device-tab-bar';

    for (const cat of categories) {
      const tab = document.createElement('button');
      const isActive = currentDevice.category === cat.key;
      tab.className = `device-tab${isActive ? ' active' : ''}`;

      // Disable if panel too narrow
      const catDevices = TourEditor.DEVICES.filter(d => d.category === cat.key);
      const minWidth = Math.min(...catDevices.map(d => d.minPanelWidth));
      if (panelWidth > 0 && panelWidth < minWidth) {
        tab.disabled = true;
        tab.title = 'Expand the panel to enable';
      }

      tab.textContent = cat.label;
      tab.onclick = () => {
        // Switch to first device in this category
        const first = catDevices.find(d => !(panelWidth > 0 && panelWidth < d.minPanelWidth));
        if (first) {
          this.previewDevice = first.id;
          this.renderDetailPanel();
        }
      };
      tabBar.appendChild(tab);
    }

    // Device model selector (dropdown for phones/tablets)
    if (currentDevice.category !== 'desktop') {
      const catDevices = TourEditor.DEVICES.filter(d => d.category === currentDevice.category);
      if (catDevices.length > 1) {
        const select = document.createElement('select');
        select.className = 'device-select';
        for (const d of catDevices) {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = `${d.label} (${d.width}\u00d7${d.height})`;
          if (d.id === this.previewDevice) opt.selected = true;
          if (panelWidth > 0 && panelWidth < d.minPanelWidth) opt.disabled = true;
          select.appendChild(opt);
        }
        select.onchange = () => {
          this.previewDevice = select.value;
          this.renderDetailPanel();
        };
        tabBar.appendChild(select);
      }
    }

    wrapper.appendChild(tabBar);
    return wrapper;
  }

  private wrapInDeviceFrame(content: HTMLElement): HTMLElement {
    const device = this.getDevice();
    const frame = document.createElement('div');

    if (device.category === 'desktop') {
      frame.className = 'device-frame device-frame--desktop';
      const viewport = document.createElement('div');
      viewport.className = 'device-viewport';
      viewport.appendChild(content);
      frame.appendChild(viewport);
      return frame;
    }

    frame.className = `device-frame device-frame--${device.category}`;
    frame.style.aspectRatio = `${device.width} / ${device.height}`;
    frame.style.maxWidth = `${device.width}px`;
    frame.style.maxHeight = 'calc(100vh - 160px)';
    frame.style.width = 'auto';
    frame.style.height = 'auto';

    const notchHeight = device.category === 'phone' ? 24 : 0;
    if (device.category === 'phone') {
      const notch = document.createElement('div');
      notch.className = 'device-notch';
      frame.appendChild(notch);
    }

    // Viewport renders at native device size, scaled down via transform
    const viewport = document.createElement('div');
    viewport.className = 'device-viewport';
    viewport.style.width = `${device.width}px`;
    viewport.style.height = `${device.height - notchHeight}px`;
    viewport.style.transformOrigin = 'top left';
    viewport.style.overflowY = 'auto';
    viewport.style.overflowX = 'hidden';
    viewport.appendChild(content);

    const scaleWrap = document.createElement('div');
    scaleWrap.className = 'device-scale-wrap';
    scaleWrap.appendChild(viewport);
    frame.appendChild(scaleWrap);

    // Scale viewport to fit the frame
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const frameW = entry.contentRect.width;
        if (frameW <= 0) continue;
        const scale = frameW / device.width;
        viewport.style.transform = `scale(${scale})`;
        scaleWrap.style.height = `${(device.height - notchHeight) * scale}px`;
      }
    });
    ro.observe(frame);

    return frame;
  }

  private renderDetailPanel(): void {
    this.detailPanel.innerHTML = '';

    if (this.selectedStopIdx >= 0 && this.selectedStopIdx < this.tour.stops.length) {
      const stop = this.tour.stops[this.selectedStopIdx];
      this.detailPanel.appendChild(this.makeDeviceToolbar(`Stop ${this.selectedStopIdx + 1}: ${stop.title || 'Untitled'}`));
      const scrollable = document.createElement('div');
      scrollable.className = 'panel-scrollable device-scroll-area';
      scrollable.appendChild(this.wrapInDeviceFrame(this.renderStopEditor(stop)));
      this.detailPanel.appendChild(scrollable);
    } else if (this.selectedCard === 'getting_here') {
      this.detailPanel.appendChild(this.makeDeviceToolbar('Getting Here'));
      const scrollable = document.createElement('div');
      scrollable.className = 'panel-scrollable device-scroll-area';
      scrollable.appendChild(this.wrapInDeviceFrame(this.renderGettingHereSection()));
      this.detailPanel.appendChild(scrollable);
    } else if (this.selectedCard === 'welcome') {
      this.detailPanel.appendChild(this.makeDeviceToolbar('Welcome Card'));
      const scrollable = document.createElement('div');
      scrollable.className = 'panel-scrollable device-scroll-area';
      scrollable.appendChild(this.wrapInDeviceFrame(this.renderWelcomeSection()));
      this.detailPanel.appendChild(scrollable);
    } else if (this.selectedCard === 'goodbye') {
      this.detailPanel.appendChild(this.makeDeviceToolbar('Goodbye Card'));
      const scrollable = document.createElement('div');
      scrollable.className = 'panel-scrollable device-scroll-area';
      scrollable.appendChild(this.wrapInDeviceFrame(this.renderGoodbyeSection()));
      this.detailPanel.appendChild(scrollable);
    } else {
      const empty = document.createElement('div');
      empty.className = 'editor-detail-empty';
      empty.textContent = 'Select a card to edit';
      this.detailPanel.appendChild(empty);
    }
  }

  private renderCollapsible(title: string, content: HTMLElement, startOpen = false): HTMLElement {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<i class="fa-solid fa-chevron-${startOpen ? 'down' : 'right'} section-chevron"></i> ${title}`;
    header.onclick = () => {
      const isOpen = content.style.display !== 'none';
      content.style.display = isOpen ? 'none' : 'block';
      const chevron = header.querySelector('.section-chevron') as HTMLElement;
      chevron.className = `fa-solid fa-chevron-${isOpen ? 'right' : 'down'} section-chevron`;
    };

    content.style.display = startOpen ? 'block' : 'none';

    section.appendChild(header);
    section.appendChild(content);
    return section;
  }

  private renderMetadataSection(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

    const meta = this.tour.tour;
    const fields: Array<{ label: string; key: string; value: string; type?: string; tip?: string }> = [
      { label: 'ID', key: 'id', value: meta.id, tip: 'Unique identifier for this tour. Used in URLs and local storage.' },
      { label: 'Description', key: 'description', value: meta.description ?? '', type: 'textarea', tip: 'Short description shown on the welcome card.' },
      { label: 'Duration', key: 'duration', value: meta.duration ?? '', tip: 'Estimated time/distance, e.g. "2.5 km / approx. 45 minutes".' },
      { label: 'Close URL', key: 'close_url', value: meta.close_url ?? '', tip: 'Where the user is sent after finishing the tour. Leave blank to just close the sheet.' },
    ];

    const makeTip = (text: string): string =>
      ` <span class="info-icon" title="${text}"><i class="fa-solid fa-circle-info"></i></span>`;

    fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'input-row';
      const label = document.createElement('label');
      label.className = 'input-label';
      label.innerHTML = f.label + (f.tip ? makeTip(f.tip) : '');
      row.appendChild(label);

      if (f.type === 'textarea') {
        const ta = document.createElement('textarea');
        ta.className = 'input';
        ta.value = f.value;
        ta.rows = 3;
        ta.oninput = () => {
          (meta as unknown as Record<string, unknown>)[f.key] = ta.value || undefined;
          this.changed();
        };
        row.appendChild(ta);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input';
        input.value = f.value;
        input.oninput = () => {
          (meta as unknown as Record<string, unknown>)[f.key] = input.value || undefined;
          this.changed();
        };
        row.appendChild(input);
      }
      content.appendChild(row);
    });

    // Nav mode dropdown
    const navRow = document.createElement('div');
    navRow.className = 'input-row';
    navRow.innerHTML = `<label class="input-label">Default Nav Mode${makeTip('Default transport mode for "get directions" buttons. Per-stop modes override this.')}</label>`;
    const navSelect = document.createElement('select');
    navSelect.className = 'input';
    for (const mode of ['', 'walk', 'drive', 'transit', 'cycle']) {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode || '(none)';
      if (mode === (meta.nav_mode ?? '')) opt.selected = true;
      navSelect.appendChild(opt);
    }
    navSelect.onchange = () => {
      meta.nav_mode = navSelect.value as LegMode || undefined;
      this.changed();
    };
    navRow.appendChild(navSelect);
    content.appendChild(navRow);

    // Scroll hint dropdown
    const scrollHintRow = document.createElement('div');
    scrollHintRow.className = 'input-row';
    scrollHintRow.innerHTML = `<label class="input-label">Scroll Hint${makeTip('Auto: subtle fade gradient at the bottom of stop cards (default). Always shown: explicit "Scroll for more" indicator on every card — useful for tours aimed at audiences less familiar with scrolling. Off: no indicator at all.')}</label>`;
    const scrollHintSelect = document.createElement('select');
    scrollHintSelect.className = 'input';
    const scrollHintOptions: Array<{ value: 'auto' | 'always' | 'off'; label: string }> = [
      { value: 'auto', label: 'Auto (default)' },
      { value: 'always', label: 'Always shown' },
      { value: 'off', label: 'Off' },
    ];
    for (const opt of scrollHintOptions) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === (meta.scroll_hint ?? 'auto')) o.selected = true;
      scrollHintSelect.appendChild(o);
    }
    scrollHintSelect.onchange = () => {
      const v = scrollHintSelect.value as 'auto' | 'always' | 'off';
      meta.scroll_hint = v === 'auto' ? undefined : v;
      this.changed();
    };
    scrollHintRow.appendChild(scrollHintSelect);
    content.appendChild(scrollHintRow);

    // Boolean toggles
    const toggles: Array<{ label: string; key: 'nudge_return' | 'require_scroll'; tip: string }> = [
      { label: 'Require Scroll', key: 'require_scroll', tip: 'Prevent advancing to next stop until the user has scrolled to the bottom of the content.' },
      { label: 'Nudge Return', key: 'nudge_return', tip: 'When finishing the tour, make "Return to start" the primary action instead of "End tour".' },
    ];
    toggles.forEach(tgl => {
      const row = document.createElement('div');
      row.className = 'input-row';
      row.style.alignItems = 'center';
      const label = document.createElement('label');
      label.className = 'input-label';
      label.style.paddingTop = '0';
      label.innerHTML = tgl.label + makeTip(tgl.tip);
      row.appendChild(label);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = meta[tgl.key] === true;
      cb.onchange = () => {
        meta[tgl.key] = cb.checked || undefined;
        this.changed();
      };
      row.appendChild(cb);
      content.appendChild(row);
    });

    // GPS config
    const gpsFields: Array<{ label: string; key: keyof NonNullable<typeof meta.gps>; placeholder: string; tip: string }> = [
      { label: 'GPS Max Distance (m)', key: 'max_distance', placeholder: '500', tip: 'Ignore GPS readings farther than this from the nearest stop. Prevents pre-selecting a stop when the user is nowhere near the tour.' },
      { label: 'GPS Max Accuracy (m)', key: 'max_accuracy', placeholder: '50', tip: 'Ignore GPS readings less accurate than this. Lower = stricter. 50m is good for urban areas.' },
      { label: 'GPS Arrival Radius (m)', key: 'arrival_radius', placeholder: '7.5', tip: 'How close the user must be to a stop for automatic arrival detection. Can be overridden per stop.' },
    ];

    if (!meta.gps) meta.gps = {};
    gpsFields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'input-row';
      const label = document.createElement('label');
      label.className = 'input-label';
      label.innerHTML = f.label + makeTip(f.tip);
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'input';
      input.placeholder = f.placeholder;
      input.value = meta.gps![f.key]?.toString() ?? '';
      input.oninput = () => {
        const v = input.value ? Number(input.value) : undefined;
        (meta.gps as Record<string, unknown>)[f.key] = v;
        this.changed();
        if (f.key === 'arrival_radius') this.updateRadiusCircle();
      };
      row.appendChild(label);
      row.appendChild(input);
      content.appendChild(row);
    });

    return this.renderCollapsible('Tour Metadata', content, false);
  }

  private renderCardsList(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

    const list = document.createElement('div');
    list.className = 'stop-list';

    // Getting Here card (pinned at top)
    const ghItem = document.createElement('div');
    ghItem.className = `stop-list-item stop-list-item--special ${this.selectedCard === 'getting_here' ? 'selected' : ''}`;
    ghItem.innerHTML = `<span class="stop-drag-handle"><i class="fa-solid fa-diamond-turn-right" style="color:#2563eb;"></i></span><span class="stop-list-info">Getting Here</span>`;
    ghItem.onclick = () => {
      this.deselectLeg();
      this.exitRouteInteraction();
      this.selectedStopIdx = -1;
      this.selectedCard = 'getting_here';
      this.clearRadiusCircle();
      this.highlightMarker(-1);
      this.renderPanel();
    };
    list.appendChild(ghItem);

    // Welcome card (pinned at top)
    const welcomeItem = document.createElement('div');
    welcomeItem.className = `stop-list-item stop-list-item--special ${this.selectedCard === 'welcome' ? 'selected' : ''}`;
    welcomeItem.innerHTML = `<span class="stop-drag-handle"><i class="fa-solid fa-flag" style="color:#16a34a;"></i></span><span class="stop-list-info">Welcome Card</span>`;
    welcomeItem.onclick = () => {
      this.deselectLeg();
      this.exitRouteInteraction();
      this.selectedStopIdx = -1;
      this.selectedCard = 'welcome';
      this.clearRadiusCircle();
      this.highlightMarker(-1);
      this.renderPanel();
    };
    list.appendChild(welcomeItem);

    // Stop list with drag reordering
    let dragIdx: number | null = null;

    this.tour.stops.forEach((stop, idx) => {
      const item = document.createElement('div');
      item.className = `stop-list-item ${idx === this.selectedStopIdx ? 'selected' : ''}`;
      item.draggable = true;
      item.dataset.idx = String(idx);

      // Drag handle
      const handle = document.createElement('span');
      handle.className = 'stop-drag-handle';
      handle.innerHTML = '<i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>';
      item.appendChild(handle);

      const info = document.createElement('div');
      info.className = 'stop-list-info';
      info.innerHTML = `<span class="stop-num">${stop.id}</span> ${this.escHtml(stop.title)}`;
      info.onclick = () => this.selectStop(idx);
      item.appendChild(info);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-icon btn-danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = 'Delete stop';
      delBtn.onclick = (e) => { e.stopPropagation(); this.deleteStop(idx); };
      item.appendChild(delBtn);

      // Drag events
      item.ondragstart = (e) => {
        dragIdx = idx;
        item.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      };
      item.ondragend = () => {
        item.classList.remove('dragging');
        dragIdx = null;
      };
      item.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        item.classList.add('drag-over');
      };
      item.ondragleave = () => {
        item.classList.remove('drag-over');
      };
      item.ondrop = (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (dragIdx !== null && dragIdx !== idx) {
          this.moveStop(dragIdx, idx);
        }
      };

      list.appendChild(item);
    });

    if (this.tour.stops.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-msg';
      empty.textContent = 'No stops yet. Click "Add Stop" then click the map.';
      list.appendChild(empty);
    }

    // Goodbye card (pinned at bottom)
    const goodbyeItem = document.createElement('div');
    goodbyeItem.className = `stop-list-item stop-list-item--special ${this.selectedCard === 'goodbye' ? 'selected' : ''}`;
    goodbyeItem.innerHTML = `<span class="stop-drag-handle"><i class="fa-solid fa-flag-checkered"></i></span><span class="stop-list-info">Goodbye Card</span>`;
    goodbyeItem.onclick = () => {
      this.deselectLeg();
      this.exitRouteInteraction();
      this.selectedStopIdx = -1;
      this.selectedCard = 'goodbye';
      this.clearRadiusCircle();
      this.highlightMarker(-1);
      this.renderPanel();
    };
    list.appendChild(goodbyeItem);

    content.appendChild(list);

    // Add Stop button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn add-stop-btn';
    addBtn.style.cssText = 'width:100%; margin-top:8px;';
    addBtn.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add Stop';
    addBtn.onclick = () => {
      if (this.mapMode === 'addStop') {
        this.setMapMode('default');
      } else {
        this.setMapMode('addStop');
      }
    };
    content.appendChild(addBtn);

    // Generate All Routes button (centered, after stop list)
    if (this.tour.stops.length >= 2) {
      const genAllBtn = document.createElement('button');
      genAllBtn.className = 'btn btn-sm';
      genAllBtn.style.cssText = 'display:block; margin: 8px auto 0;';
      genAllBtn.innerHTML = '<i class="fa-solid fa-route"></i> Generate All Routes';
      genAllBtn.onclick = async () => {
        const apiKey = getOrsApiKey();
        if (!apiKey) {
          this.showOrsKeyModal(() => { genAllBtn.click(); });
          return;
        }
        genAllBtn.disabled = true;
        genAllBtn.textContent = 'Generating...';
        try {
          const routes = await generateAllRoutes(this.tour.stops, (done, total) => {
            genAllBtn.textContent = `Generating... ${done}/${total}`;
          });
          this.withUndo(() => {
            routes.forEach((route, i) => {
              const stop = this.tour.stops[i + 1];
              if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
              stop.getting_here.route = route;
            });
          });
          // Clear dirty flags for all regenerated routes
          routes.forEach((_route, i) => { this.clearLegDirty(i + 1); });
          this.refreshRoutePolylines();
          this.renderPanel();
          this.setStatus(`Generated ${routes.size} routes.`);
        } catch (e) {
          this.setStatus(`Route generation failed: ${(e as Error).message}`);
        }
        genAllBtn.disabled = false;
        genAllBtn.innerHTML = '<i class="fa-solid fa-route"></i> Generate All Routes';
      };
      content.appendChild(genAllBtn);
    }

    return this.renderCollapsible(`Cards (${this.tour.stops.length} stops)`, content, true);
  }

  private static MODE_ICONS: Record<string, string> = {
    walk: 'fa-person-walking',
    drive: 'fa-car',
    transit: 'fa-bus',
    cycle: 'fa-bicycle',
  };

  private renderStopEditor(stop: Stop): HTMLElement {
    const content = document.createElement('div');
    content.className = 'card-preview';
    content.appendChild(this.renderStopCardTab(stop, this.selectedStopIdx));
    return content;
  }

  private renderStopCardTab(stop: Stop, stopIdx: number): HTMLElement {
    const frag = document.createElement('div');

    // Zone 1: Title + Getting Here (click to edit)
    const titleZone = document.createElement('div');
    titleZone.className = 'card-edit-zone card-edit-zone--title';
    titleZone.style.cursor = 'pointer';
    titleZone.onclick = () => this.showTitleModal(stop, stopIdx);

    const titleContent = document.createElement('div');
    titleContent.style.cssText = 'flex:1; min-width:0;';
    const titleHeading = document.createElement('div');
    titleHeading.className = 'card-title';
    titleHeading.textContent = stop.title || 'Untitled Stop';
    titleContent.appendChild(titleHeading);

    // Getting here summary below title
    const gh = stop.getting_here;
    if (gh && (gh.note || gh.mode)) {
      const ghSummary = document.createElement('div');
      ghSummary.className = 'card-gh-summary';
      const iconClass = TourEditor.MODE_ICONS[gh.mode] || 'fa-person-walking';
      ghSummary.innerHTML = `<i class="fa-solid ${iconClass} card-gh-icon"></i> `;
      const noteSpan = document.createElement('span');
      noteSpan.textContent = gh.note || `${gh.mode.charAt(0).toUpperCase() + gh.mode.slice(1)} to this stop`;
      ghSummary.appendChild(noteSpan);
      titleContent.appendChild(ghSummary);
    }

    titleZone.appendChild(titleContent);
    frag.appendChild(titleZone);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'card-divider';
    frag.appendChild(divider);

    // Zone 3: Content blocks (reuse existing WYSIWYG block preview system)
    const contentZone = document.createElement('div');
    contentZone.className = 'card-content-zone';
    contentZone.appendChild(renderContentBlockEditor(stop.content, () => this.changed(), '', () => pushUndo(this.tour, this.dirtyLegs)));
    frag.appendChild(contentZone);

    // Zone 4: Footer (clickable navigation)
    const nextIdx = stopIdx + 1;
    if (nextIdx < this.tour.stops.length) {
      const footer = document.createElement('div');
      footer.className = 'card-footer card-footer--clickable';
      const nextStop = this.tour.stops[nextIdx];
      footer.textContent = `Next: ${nextStop.title || 'Untitled'} \u2192`;
      footer.onclick = () => this.selectStop(nextIdx);
      frag.appendChild(footer);
    } else {
      const footer = document.createElement('div');
      footer.className = 'card-footer card-footer--clickable';
      footer.textContent = 'Goodbye Card \u2192';
      footer.onclick = () => {
        this.deselectLeg();
        this.exitRouteInteraction();
        this.selectedStopIdx = -1;
        this.selectedCard = 'goodbye';
        this.clearRadiusCircle();
        this.highlightMarker(-1);
        this.renderPanel();
      };
      frag.appendChild(footer);
    }

    return frag;
  }

  // Journey tab removed — journey content is now authored via waypoints (B3)

  private makeGutterButton(onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'card-gutter-btn';
    btn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    btn.title = 'Edit';
    btn.onclick = (e) => { e.stopPropagation(); onClick(); };
    return btn;
  }

  private showEditZoneModal(title: string, renderFields: (body: HTMLElement) => void, onClose?: () => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'cb-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'cb-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'cb-modal-header';
    const titleEl = document.createElement('span');
    titleEl.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.onclick = () => close();
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'cb-modal-body';
    renderFields(body);
    modal.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'cb-modal-footer';
    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-primary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => close();
    footer.appendChild(doneBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escHandler);

    const self = this;
    function close(): void {
      document.removeEventListener('keydown', escHandler);
      overlay.remove();
      if (onClose) onClose();
      self.renderDetailPanel();
    }
  }

  private showTitleModal(stop: Stop, stopIdx: number): void {
    if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
    const gh = stop.getting_here;

    this.showEditZoneModal('Edit Stop', (body) => {
      // Title
      const titleRow = document.createElement('div');
      titleRow.className = 'input-row';
      titleRow.innerHTML = '<label class="input-label">Title</label>';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'input';
      titleInput.value = stop.title;
      titleInput.oninput = () => {
        stop.title = titleInput.value;
        this.changed();
        const marker = this.stopMarkers[this.selectedStopIdx];
        if (marker) marker.setTooltipContent(stop.title);
      };
      titleRow.appendChild(titleInput);
      body.appendChild(titleRow);

      // Getting Here section
      const ghHeader = document.createElement('div');
      ghHeader.style.cssText = 'margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:13px; font-weight:600; color:#334155; margin-bottom:8px;';
      ghHeader.textContent = 'Getting Here';
      body.appendChild(ghHeader);

      // Mode
      const modeRow = document.createElement('div');
      modeRow.className = 'input-row';
      modeRow.innerHTML = '<label class="input-label">Mode</label>';
      const modeSelect = document.createElement('select');
      modeSelect.className = 'input';
      for (const mode of ['walk', 'drive', 'transit', 'cycle']) {
        const opt = document.createElement('option');
        opt.value = mode;
        opt.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        if (mode === gh.mode) opt.selected = true;
        modeSelect.appendChild(opt);
      }
      modeSelect.onchange = () => { gh.mode = modeSelect.value as LegMode; this.changed(); };
      modeRow.appendChild(modeSelect);
      body.appendChild(modeRow);

      // Note
      const noteRow = document.createElement('div');
      noteRow.className = 'input-row';
      noteRow.innerHTML = '<label class="input-label">Note</label>';
      const noteInput = document.createElement('textarea');
      noteInput.className = 'input';
      noteInput.rows = 2;
      noteInput.value = gh.note ?? '';
      noteInput.placeholder = 'e.g. "Continue along the path, ~3 min"';
      noteInput.oninput = () => { gh.note = noteInput.value || undefined; this.changed(); };
      noteRow.appendChild(noteInput);
      body.appendChild(noteRow);

      // Route section
      const routeDiv = document.createElement('div');
      routeDiv.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;';
      const routeBtnRow = document.createElement('div');
      routeBtnRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; align-items:center;';
      const closeModal = () => document.querySelectorAll('.cb-modal-overlay').forEach(el => el.remove());

      if (gh.route && gh.route.length > 0) {
        const isDirtyRoute = this.dirtyLegs.has(stopIdx);
        if (isDirtyRoute) {
          const reviewBtn = document.createElement('button');
          reviewBtn.className = 'btn btn-sm';
          reviewBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Review';
          reviewBtn.onclick = () => { closeModal(); this.startReviewingRoute(stopIdx); };
          routeBtnRow.appendChild(reviewBtn);
        } else {
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-sm';
          editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Edit';
          editBtn.onclick = () => { closeModal(); this.startEditingRoute(stopIdx); };
          routeBtnRow.appendChild(editBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        delBtn.title = 'Delete route';
        delBtn.onclick = () => {
          if (!confirm('Delete route?')) return;
          this.withUndo(() => { gh.route = undefined; });
          this.dirtyLegs.delete(stopIdx);
          this.refreshRoutePolylines();
          closeModal();
          this.renderDetailPanel();
        };
        routeBtnRow.appendChild(delBtn);
      } else {
        const drawBtn = document.createElement('button');
        drawBtn.className = 'btn btn-sm';
        drawBtn.innerHTML = '<i class="fa-solid fa-draw-polygon"></i> Draw';
        drawBtn.onclick = () => { closeModal(); this.drawAndEditLeg(stopIdx); };
        routeBtnRow.appendChild(drawBtn);
      }

      if (this.tour.stops.length > 1) {
        const prevIdx2 = stopIdx === 0 ? this.tour.stops.length - 1 : stopIdx - 1;
        const prevStop2 = this.tour.stops[prevIdx2];
        const hasExisting = !!(gh.route && gh.route.length > 0);
        const autoBtn = document.createElement('button');
        autoBtn.className = 'btn btn-sm';
        autoBtn.innerHTML = '<i class="fa-solid fa-route"></i> Auto';
        autoBtn.onclick = async () => {
          if (hasExisting && !confirm('Delete route and create new route automatically?')) return;
          const apiKey = getOrsApiKey();
          if (!apiKey) { this.showOrsKeyModal(() => { autoBtn.click(); }); return; }
          autoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          autoBtn.disabled = true;
          try {
            const route = await generateRoute(prevStop2.coords, stop.coords);
            this.withUndo(() => { gh.route = route; });
            this.clearLegDirty(stopIdx);
            this.refreshRoutePolylines();
            closeModal();
            this.renderDetailPanel();
            this.setStatus(`Route generated: ${route.length} points.`);
          } catch (err) {
            this.setStatus(`Route failed: ${(err as Error).message}`);
            autoBtn.innerHTML = '<i class="fa-solid fa-route"></i> Auto';
            autoBtn.disabled = false;
          }
        };
        routeBtnRow.appendChild(autoBtn);
      }

      routeDiv.appendChild(routeBtnRow);
      body.appendChild(routeDiv);

      // Coords (readonly)
      const metaHeader = document.createElement('div');
      metaHeader.style.cssText = 'margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:13px; font-weight:600; color:#334155; margin-bottom:8px;';
      metaHeader.textContent = 'Advanced';
      body.appendChild(metaHeader);

      const coordsRow = document.createElement('div');
      coordsRow.className = 'input-row';
      coordsRow.innerHTML = '<label class="input-label">Coords</label>';
      const coordsInput = document.createElement('input');
      coordsInput.type = 'text';
      coordsInput.className = 'input';
      coordsInput.value = `${stop.coords[0].toFixed(6)}, ${stop.coords[1].toFixed(6)}`;
      coordsInput.readOnly = true;
      coordsRow.appendChild(coordsInput);
      body.appendChild(coordsRow);

      // Arrival radius
      const radiusRow = document.createElement('div');
      radiusRow.className = 'input-row';
      radiusRow.innerHTML = '<label class="input-label">Arrival Radius (m)</label>';
      const radiusInput = document.createElement('input');
      radiusInput.type = 'number';
      radiusInput.className = 'input';
      radiusInput.placeholder = 'Default';
      radiusInput.value = stop.arrival_radius?.toString() ?? '';
      radiusInput.oninput = () => {
        stop.arrival_radius = radiusInput.value ? Number(radiusInput.value) : undefined;
        this.changed();
        this.updateRadiusCircle();
      };
      radiusRow.appendChild(radiusInput);
      body.appendChild(radiusRow);
    });
  }

  // Getting Here editing is now consolidated into showTitleModal (Edit Stop)

  private renderGettingHereSection(): HTMLElement {
    if (!this.tour.tour.getting_here) this.tour.tour.getting_here = [];
    const frag = document.createElement('div');
    frag.className = 'card-preview';

    // Title
    const titleHeading = document.createElement('div');
    titleHeading.className = 'card-title';
    titleHeading.textContent = 'Getting Here';
    frag.appendChild(titleHeading);

    const subtitle = document.createElement('div');
    subtitle.className = 'card-meta-line';
    subtitle.textContent = 'Directions to the tour starting point. Leave empty to hide the menu item.';
    frag.appendChild(subtitle);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'card-divider';
    frag.appendChild(divider);

    // Content blocks
    const contentZone = document.createElement('div');
    contentZone.className = 'card-content-zone';
    contentZone.appendChild(renderContentBlockEditor(
      this.tour.tour.getting_here!, () => this.changed(), '', () => pushUndo(this.tour, this.dirtyLegs),
    ));
    frag.appendChild(contentZone);

    // Footer - navigate to welcome
    const footer = document.createElement('div');
    footer.className = 'card-footer card-footer--clickable';
    footer.textContent = 'Back to Welcome Card';
    footer.onclick = () => {
      this.selectedCard = 'welcome';
      this.renderPanel();
    };
    frag.appendChild(footer);

    return frag;
  }

  private renderWelcomeSection(): HTMLElement {
    if (!this.tour.tour.welcome) this.tour.tour.welcome = [];
    const meta = this.tour.tour;
    const frag = document.createElement('div');
    frag.className = 'card-preview';

    // Zone 1: Tour title (click to edit title/description/duration)
    const titleZone = document.createElement('div');
    titleZone.className = 'card-edit-zone';
    titleZone.style.cursor = 'pointer';
    titleZone.onclick = () => this.showWelcomeMetaModal();

    const titleContent = document.createElement('div');
    const titleHeading = document.createElement('div');
    titleHeading.className = 'card-title';
    titleHeading.textContent = meta.title || 'Untitled Tour';
    titleContent.appendChild(titleHeading);

    if (meta.description || meta.duration) {
      const metaLine = document.createElement('div');
      metaLine.className = 'card-meta-line';
      const parts: string[] = [];
      if (meta.description) parts.push(meta.description);
      if (meta.duration) parts.push(meta.duration);
      metaLine.textContent = parts.join(' \u2022 ');
      titleContent.appendChild(metaLine);
    }

    titleZone.appendChild(titleContent);
    frag.appendChild(titleZone);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'card-divider';
    frag.appendChild(divider);

    // Content blocks
    const contentZone = document.createElement('div');
    contentZone.className = 'card-content-zone';
    contentZone.appendChild(renderContentBlockEditor(
      this.tour.tour.welcome!, () => this.changed(), '', () => pushUndo(this.tour, this.dirtyLegs),
    ));
    frag.appendChild(contentZone);

    // Footer - navigate to first stop
    const footer = document.createElement('div');
    footer.className = 'card-footer card-footer--clickable';
    if (this.tour.stops.length > 0) {
      const firstStop = this.tour.stops[0];
      footer.textContent = `First stop: ${firstStop.title || 'Untitled'} \u2192`;
      footer.onclick = () => this.selectStop(0);
    } else {
      footer.className = 'card-footer';
      footer.textContent = 'No stops yet';
    }
    frag.appendChild(footer);

    return frag;
  }

  private showWelcomeMetaModal(): void {
    const meta = this.tour.tour;
    this.showEditZoneModal('Edit Welcome Card', (body) => {
      // Title
      const titleRow = document.createElement('div');
      titleRow.className = 'input-row';
      titleRow.innerHTML = '<label class="input-label">Tour Title</label>';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'input';
      titleInput.value = meta.title;
      titleInput.oninput = () => { meta.title = titleInput.value; this.changed(); };
      titleRow.appendChild(titleInput);
      body.appendChild(titleRow);

      // Description
      const descRow = document.createElement('div');
      descRow.className = 'input-row';
      descRow.innerHTML = '<label class="input-label">Description</label>';
      const descInput = document.createElement('textarea');
      descInput.className = 'input';
      descInput.rows = 3;
      descInput.value = meta.description ?? '';
      descInput.placeholder = 'Brief tour description';
      descInput.oninput = () => { meta.description = descInput.value || undefined; this.changed(); };
      descRow.appendChild(descInput);
      body.appendChild(descRow);

      // Duration
      const durRow = document.createElement('div');
      durRow.className = 'input-row';
      durRow.innerHTML = '<label class="input-label">Duration</label>';
      const durInput = document.createElement('input');
      durInput.type = 'text';
      durInput.className = 'input';
      durInput.value = meta.duration ?? '';
      durInput.placeholder = 'e.g. "45 minutes"';
      durInput.oninput = () => { meta.duration = durInput.value || undefined; this.changed(); };
      durRow.appendChild(durInput);
      body.appendChild(durRow);
    });
  }

  private renderGoodbyeSection(): HTMLElement {
    if (!this.tour.tour.goodbye) this.tour.tour.goodbye = [];
    const meta = this.tour.tour;
    const frag = document.createElement('div');
    frag.className = 'card-preview';

    // Zone 1: Title (click to edit close_url)
    const titleZone = document.createElement('div');
    titleZone.className = 'card-edit-zone';
    titleZone.style.cursor = 'pointer';
    titleZone.onclick = () => this.showGoodbyeMetaModal();

    const titleContent = document.createElement('div');
    const titleHeading = document.createElement('div');
    titleHeading.className = 'card-title';
    titleHeading.textContent = 'Tour Complete';
    titleContent.appendChild(titleHeading);

    if (meta.close_url) {
      const metaLine = document.createElement('div');
      metaLine.className = 'card-meta-line';
      metaLine.textContent = `Closes to: ${meta.close_url}`;
      titleContent.appendChild(metaLine);
    }

    titleZone.appendChild(titleContent);
    frag.appendChild(titleZone);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'card-divider';
    frag.appendChild(divider);

    // Content blocks
    const contentZone = document.createElement('div');
    contentZone.className = 'card-content-zone';
    contentZone.appendChild(renderContentBlockEditor(
      this.tour.tour.goodbye!, () => this.changed(), '', () => pushUndo(this.tour, this.dirtyLegs),
    ));
    frag.appendChild(contentZone);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.textContent = meta.close_url ? 'Close Tour' : 'End of tour';
    frag.appendChild(footer);

    return frag;
  }

  private showGoodbyeMetaModal(): void {
    const meta = this.tour.tour;
    this.showEditZoneModal('Edit Goodbye Card', (body) => {
      // Close URL
      const urlRow = document.createElement('div');
      urlRow.className = 'input-row';
      urlRow.innerHTML = '<label class="input-label">Close URL</label>';
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.className = 'input';
      urlInput.value = meta.close_url ?? '';
      urlInput.placeholder = 'e.g. https://example.com/thank-you';
      urlInput.oninput = () => { meta.close_url = urlInput.value || undefined; this.changed(); };
      urlRow.appendChild(urlInput);
      body.appendChild(urlRow);
    });
  }

  private renderStringsSection(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

    if (!this.tour.tour.strings) this.tour.tour.strings = {};
    const strings = this.tour.tour.strings;

    for (const [key, info] of Object.entries(I18N_DEFAULTS)) {
      const row = document.createElement('div');
      row.className = 'input-row';
      const label = document.createElement('label');
      label.className = 'input-label input-label-sm';
      label.innerHTML = `<span class="info-icon" title="${info.desc}"><i class="fa-solid fa-circle-info"></i></span> ${key}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input input-sm';
      input.placeholder = info.default;
      input.value = strings[key] ?? '';
      input.oninput = () => {
        if (input.value.trim()) {
          strings[key] = input.value;
        } else {
          delete strings[key];
        }
        this.changed();
      };
      row.appendChild(label);
      row.appendChild(input);
      content.appendChild(row);
    }

    return this.renderCollapsible('String Overrides (i18n)', content, false);
  }

  private performUndo(): void {
    const wasEditingRoute = this.editingRouteSegment;
    const entry = undo(this.tour, this.dirtyLegs);
    if (entry) {
      this.tour = entry.tour;
      this.dirtyLegs = new Set(entry.dirtyLegs);
      if (this.selectedStopIdx >= this.tour.stops.length) {
        this.selectedStopIdx = this.tour.stops.length - 1;
      }
      this.refreshMap();
      this.renderPanel();
      this.changed();
      // Re-enter route editing if we were editing before
      if (wasEditingRoute >= 0 && wasEditingRoute < this.tour.stops.length) {
        const stop = this.tour.stops[wasEditingRoute];
        if (stop.getting_here?.route && stop.getting_here.route.length > 0) {
          this.startEditingRoute(wasEditingRoute);
        }
      }
      this.setStatus('Undone.');
    }
  }

  private performRedo(): void {
    const wasEditingRoute = this.editingRouteSegment;
    const entry = redo(this.tour, this.dirtyLegs);
    if (entry) {
      this.tour = entry.tour;
      this.dirtyLegs = new Set(entry.dirtyLegs);
      if (this.selectedStopIdx >= this.tour.stops.length) {
        this.selectedStopIdx = this.tour.stops.length - 1;
      }
      this.refreshMap();
      this.renderPanel();
      this.changed();
      if (wasEditingRoute >= 0 && wasEditingRoute < this.tour.stops.length) {
        const stop = this.tour.stops[wasEditingRoute];
        if (stop.getting_here?.route && stop.getting_here.route.length > 0) {
          this.startEditingRoute(wasEditingRoute);
        }
      }
      this.setStatus('Redone.');
    }
  }

  private setupKeyboard(): void {
    // Use capture phase on window to intercept before Leaflet or other handlers
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const isUndo = e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey;
      const isRedo = (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
                     (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey);

      if (!isUndo && !isRedo) return;

      // Allow native undo/redo in text inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      e.preventDefault();
      e.stopPropagation();
      if (isUndo) this.performUndo();
      else this.performRedo();
    }, true); // capture phase

    // Delete key for route points, Esc to exit route editing
    document.addEventListener('keydown', (e) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && this.editingRouteSegment >= 0) {
        e.preventDefault();
        this.deleteSelectedRoutePoint();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedLeg >= 0) {
        e.preventDefault();
        this.deleteSelectedLeg();
      } else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && this.selectedLeg >= 0) {
        e.preventDefault();
        const legIdx = this.selectedLeg;
        const stop = this.tour.stops[legIdx];
        if (stop?.getting_here?.route?.length) {
          if (this.dirtyLegs.has(legIdx)) {
            this.deselectLeg();
            this.startReviewingRoute(legIdx);
          } else {
            this.deselectLeg();
            this.startEditingRoute(legIdx);
          }
        } else {
          this.drawAndEditLeg(legIdx);
        }
      } else if (e.key === 'Escape' && this.selectedLeg >= 0) {
        e.preventDefault();
        this.deselectLeg();
      } else if (e.key === 'Escape' && this.waypointPlacementMode) {
        e.preventDefault();
        this.exitWaypointPlacementMode();
      } else if (e.key === 'Escape' && this.reviewingRouteSegment >= 0) {
        e.preventDefault();
        this.stopReviewingRoute();
        this.refreshRoutePolylines();
      } else if (e.key === 'Escape' && this.editingRouteSegment >= 0) {
        e.preventDefault();
        this.stopEditingRoute();
        this.refreshRoutePolylines();
        this.setStatus('Exited route editing.');
      } else if (e.key === 'Escape' && this.mapMode === 'addStop') {
        this.setMapMode('default');
      }
    });
  }

  // ---- Waypoint placement & editing ----

  private enterWaypointPlacementMode(stopIdx: number): void {
    this.waypointPlacementMode = true;
    this.mapContainer.classList.add('waypoint-placing');
    this.setStatus('Click on the route to place a waypoint. Press Esc to cancel.');
  }

  private exitWaypointPlacementMode(): void {
    this.waypointPlacementMode = false;
    this.mapContainer.classList.remove('waypoint-placing');
  }

  private placeWaypointOnRoute(latlng: L.LatLng): void {
    const stopIdx = this.editingRouteSegment;
    if (stopIdx < 0) return;
    const stop = this.tour.stops[stopIdx];
    if (!stop.getting_here?.route?.length) return;
    const route = stop.getting_here.route;

    // Snap to nearest point on polyline
    const snapped = this.snapToPolyline(latlng, route);

    const wp: Waypoint = {
      coords: snapped.coords,
      text: '',
    };

    this.exitWaypointPlacementMode();

    this.withUndo(() => {
      if (!stop.getting_here!.waypoints) stop.getting_here!.waypoints = [];
      stop.getting_here!.waypoints.push(wp);
      this.sortWaypointsByPosition(stop.getting_here!.waypoints, route);
    });

    const wpIndex = stop.getting_here!.waypoints!.indexOf(wp);
    this.renderWaypointMarkers(stopIdx);
    this.showWaypointModal(stop, stopIdx, wpIndex);
  }

  private snapToPolyline(latlng: L.LatLng, route: [number, number][]): { coords: [number, number]; frac: number } {
    let bestDist = Infinity;
    let bestCoords: [number, number] = route[0];
    let bestFrac = 0;

    for (let i = 0; i < route.length - 1; i++) {
      const p1 = route[i];
      const p2 = route[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      let t: number;
      if (dx === 0 && dy === 0) {
        t = 0;
      } else {
        t = ((latlng.lat - p1[0]) * dx + (latlng.lng - p1[1]) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
      }
      const projLat = p1[0] + t * dx;
      const projLng = p1[1] + t * dy;
      const dist = Math.sqrt((latlng.lat - projLat) ** 2 + (latlng.lng - projLng) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestCoords = [projLat, projLng];
        bestFrac = i + t;
      }
    }

    return { coords: bestCoords, frac: bestFrac };
  }

  private sortWaypointsByPosition(waypoints: Waypoint[], route: [number, number][]): void {
    const fracMap = new Map<Waypoint, number>();
    for (const wp of waypoints) {
      const snapped = this.snapToPolyline(L.latLng(wp.coords[0], wp.coords[1]), route);
      fracMap.set(wp, snapped.frac);
    }
    waypoints.sort((a, b) => (fracMap.get(a) ?? 0) - (fracMap.get(b) ?? 0));
  }

  private renderWaypointMarkers(stopIdx: number): void {
    this.waypointMarkers.forEach(m => m.remove());
    this.waypointMarkers = [];

    const stop = this.tour.stops[stopIdx];
    if (!stop.getting_here?.waypoints?.length) return;
    const route = stop.getting_here.route;
    if (!route?.length) return;

    stop.getting_here.waypoints.forEach((wp, wpIdx) => {
      const m = L.circleMarker([wp.coords[0], wp.coords[1]], {
        radius: 7,
        fillColor: '#ec4899',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
        pane: 'routeEditPoints',
        bubblingMouseEvents: false,
      }).addTo(this.map);

      let wpJustDragged = false;

      // Drag support: mousedown → mousemove → mouseup, snap to polyline
      m.on('mousedown', (e) => {
        wpJustDragged = false;
        pushUndo(this.tour, this.dirtyLegs); // snapshot before drag
        this.map.dragging.disable();
        L.DomEvent.stopPropagation(e);

        const onMove = (ev: L.LeafletMouseEvent) => {
          wpJustDragged = true;
          // Snap to nearest point on route polyline
          const snapped = this.snapToPolyline(ev.latlng, route);
          m.setLatLng([snapped.coords[0], snapped.coords[1]]);
          m.setStyle({ fillColor: '#f472b6', radius: 9 }); // highlight during drag
        };

        const onUp = (ev: L.LeafletMouseEvent) => {
          this.map.dragging.enable();
          this.map.off('mousemove', onMove);
          this.map.off('mouseup', onUp);

          if (wpJustDragged) {
            const snapped = this.snapToPolyline(ev.latlng, route);
            this.withUndo(() => {
              wp.coords = snapped.coords;
              this.sortWaypointsByPosition(stop.getting_here!.waypoints!, route);
            });
            this.renderWaypointMarkers(stopIdx);
          }
          setTimeout(() => { wpJustDragged = false; }, 50);
        };

        this.map.on('mousemove', onMove);
        this.map.on('mouseup', onUp);
      });

      m.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (wpJustDragged) return;
        this.showWaypointModal(stop, stopIdx, wpIdx);
      });

      this.waypointMarkers.push(m);
    });
  }

  private showWaypointModal(stop: Stop, stopIdx: number, wpIdx: number): void {
    const waypoints = stop.getting_here?.waypoints;
    if (!waypoints || wpIdx < 0 || wpIdx >= waypoints.length) return;
    const wp = waypoints[wpIdx];

    // Remove any existing modal
    this.mapContainer.querySelector('.waypoint-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'waypoint-modal';

    const modal = document.createElement('div');
    modal.className = 'waypoint-modal-content';

    const title = document.createElement('h3');
    title.textContent = 'Edit Waypoint';
    title.style.cssText = 'margin:0 0 16px; font-size:16px; font-weight:600;';
    modal.appendChild(title);

    // === Mode toggle: Basic Waypoint / Journey Card ===
    const isJourneyCard = !!wp.journey_card || (wp.content !== undefined && wp.content.length > 0);
    let mode: 'basic' | 'journey' = isJourneyCard ? 'journey' : 'basic';

    const toggleRow = document.createElement('div');
    toggleRow.className = 'wp-mode-toggle';

    const basicBtn = document.createElement('button');
    basicBtn.className = 'wp-mode-toggle__btn';
    basicBtn.textContent = 'Basic Waypoint';

    const journeyBtn = document.createElement('button');
    journeyBtn.className = 'wp-mode-toggle__btn';
    journeyBtn.textContent = 'Journey Card';

    toggleRow.appendChild(basicBtn);
    toggleRow.appendChild(journeyBtn);
    modal.appendChild(toggleRow);

    // === Basic waypoint fields ===
    const basicFields = document.createElement('div');

    // Text field
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Guidance text';
    textLabel.style.cssText = 'display:block; font-size:13px; font-weight:500; margin-bottom:4px; color:#334155;';
    basicFields.appendChild(textLabel);
    const textArea = document.createElement('textarea');
    textArea.className = 'input';
    textArea.placeholder = 'e.g. Head towards the red house';
    textArea.value = wp.text || '';
    textArea.rows = 3;
    textArea.style.cssText = 'width:100%; resize:vertical;';
    basicFields.appendChild(textArea);

    const textHint = document.createElement('div');
    textHint.style.cssText = 'color:#64748b; font-size:12px; padding:4px 0 12px 0;';
    textHint.innerHTML = 'Use <code>{dot}</code> to inline the waypoint marker, e.g. "Head towards the {dot}".';
    basicFields.appendChild(textHint);

    // Image section — "Add Image" / expanded fields
    const imageSection = document.createElement('div');
    imageSection.style.cssText = 'margin-bottom:12px;';

    const addImageBtn = document.createElement('button');
    addImageBtn.className = 'btn btn-sm';
    addImageBtn.textContent = '+ Add Image';
    addImageBtn.style.cssText = 'margin-bottom:8px;';

    const imageFields = document.createElement('div');
    imageFields.className = 'wp-image-fields';

    // Image URL
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Image URL';
    urlLabel.style.cssText = 'display:block; font-size:13px; font-weight:500; margin-bottom:4px; color:#334155;';
    imageFields.appendChild(urlLabel);
    const photoInput = document.createElement('input');
    photoInput.type = 'text';
    photoInput.className = 'input';
    photoInput.placeholder = 'https://...';
    photoInput.value = wp.photo || '';
    photoInput.style.cssText = 'width:100%; margin-bottom:8px;';
    imageFields.appendChild(photoInput);

    // Preview
    const photoPreview = document.createElement('div');
    photoPreview.style.cssText = 'margin-bottom:8px;';
    let previewTimer: ReturnType<typeof setTimeout> | null = null;
    const updatePhotoPreview = () => {
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        photoPreview.innerHTML = '';
        const url = photoInput.value.trim();
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'max-width:100%; max-height:150px; border-radius:4px;';
          img.onerror = () => { photoPreview.textContent = 'Image not found'; };
          photoPreview.appendChild(img);
        }
      }, 400);
    };
    photoInput.oninput = updatePhotoPreview;
    imageFields.appendChild(photoPreview);

    // Caption
    const captionLabel = document.createElement('label');
    captionLabel.textContent = 'Caption (optional)';
    captionLabel.style.cssText = 'display:block; font-size:13px; font-weight:500; margin-bottom:4px; color:#334155;';
    imageFields.appendChild(captionLabel);
    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.className = 'input';
    captionInput.placeholder = 'Caption';
    captionInput.value = wp.photo_caption || '';
    captionInput.style.cssText = 'width:100%; margin-bottom:8px;';
    imageFields.appendChild(captionInput);

    // Alt text
    const altLabel = document.createElement('label');
    altLabel.textContent = 'Alt text (optional)';
    altLabel.style.cssText = 'display:block; font-size:13px; font-weight:500; margin-bottom:4px; color:#334155;';
    imageFields.appendChild(altLabel);
    const altInput = document.createElement('input');
    altInput.type = 'text';
    altInput.className = 'input';
    altInput.placeholder = 'Alt text';
    altInput.value = wp.photo_alt || '';
    altInput.style.cssText = 'width:100%; margin-bottom:8px;';
    imageFields.appendChild(altInput);

    // Remove image button
    const removeImageBtn = document.createElement('button');
    removeImageBtn.className = 'btn btn-sm btn-danger';
    removeImageBtn.textContent = 'Remove Image';
    removeImageBtn.style.cssText = 'margin-bottom:4px;';
    imageFields.appendChild(removeImageBtn);

    const hasImage = !!wp.photo;
    const showImageFields = (show: boolean) => {
      addImageBtn.style.display = show ? 'none' : '';
      imageFields.style.display = show ? '' : 'none';
      if (show) updatePhotoPreview();
    };
    showImageFields(hasImage);

    addImageBtn.onclick = () => showImageFields(true);
    removeImageBtn.onclick = () => {
      photoInput.value = '';
      captionInput.value = '';
      altInput.value = '';
      photoPreview.innerHTML = '';
      showImageFields(false);
    };

    imageSection.appendChild(addImageBtn);
    imageSection.appendChild(imageFields);
    basicFields.appendChild(imageSection);

    modal.appendChild(basicFields);

    // === Journey card fields ===
    const journeyFields = document.createElement('div');
    journeyFields.style.cssText = 'margin-bottom:12px;';

    const rebuildContentBlocks = () => {
      journeyFields.innerHTML = '';
      if (!wp.content) wp.content = [];
      const contentLabel = document.createElement('div');
      contentLabel.textContent = 'Content Blocks';
      contentLabel.style.cssText = 'font-size:13px; font-weight:500; margin-bottom:4px; color:#334155;';
      journeyFields.appendChild(contentLabel);
      journeyFields.appendChild(renderContentBlockEditor(
        wp.content!, () => this.changed(), '', () => pushUndo(this.tour, this.dirtyLegs),
      ));
    };

    modal.appendChild(journeyFields);

    // === Mode switch logic ===
    const setMode = (m: 'basic' | 'journey') => {
      mode = m;
      basicBtn.classList.toggle('wp-mode-toggle__btn--active', m === 'basic');
      journeyBtn.classList.toggle('wp-mode-toggle__btn--active', m === 'journey');
      basicFields.style.display = m === 'basic' ? '' : 'none';
      journeyFields.style.display = m === 'journey' ? '' : 'none';
      if (m === 'journey' && (!wp.content || wp.content.length === 0)) {
        wp.content = [{ type: 'text', body: '' }];
      }
      if (m === 'journey') rebuildContentBlocks();
    };

    basicBtn.onclick = () => setMode('basic');
    journeyBtn.onclick = () => setMode('journey');
    setMode(mode);

    // === Approach radius override ===
    const radiusLabel = document.createElement('label');
    radiusLabel.textContent = 'Approach radius override (optional)';
    radiusLabel.style.cssText = 'display:block; font-size:13px; font-weight:500; margin-bottom:4px; color:#334155;';
    modal.appendChild(radiusLabel);
    const radiusInput = document.createElement('input');
    radiusInput.type = 'number';
    radiusInput.className = 'input';
    radiusInput.placeholder = 'Default: 15m';
    radiusInput.value = wp.radius != null ? String(wp.radius) : '';
    radiusInput.style.cssText = 'width:100%; margin-bottom:16px;';
    modal.appendChild(radiusInput);

    // === Validation message ===
    const validationMsg = document.createElement('div');
    validationMsg.style.cssText = 'color:#dc2626; font-size:13px; margin-bottom:8px; display:none;';
    modal.appendChild(validationMsg);

    // === Buttons ===
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.style.marginRight = 'auto';
    delBtn.onclick = () => {
      if (!confirm('Delete this waypoint?')) return;
      this.withUndo(() => {
        waypoints.splice(wpIdx, 1);
        if (waypoints.length === 0) stop.getting_here!.waypoints = undefined;
      });
      overlay.remove();
      this.renderWaypointMarkers(stopIdx);
      this.setStatus('Waypoint deleted.');
    };
    btnRow.appendChild(delBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sm';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      overlay.remove();
    };
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm btn-primary';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => {
      // Validate
      if (mode === 'basic') {
        if (!textArea.value.trim()) {
          validationMsg.textContent = 'Basic waypoint requires guidance text.';
          validationMsg.style.display = '';
          textArea.focus();
          return;
        }
      } else {
        const blocks = wp.content ?? [];
        if (blocks.length === 0) {
          validationMsg.textContent = 'Journey card requires at least one content block.';
          validationMsg.style.display = '';
          return;
        }
      }
      validationMsg.style.display = 'none';

      this.withUndo(() => {
        if (mode === 'basic') {
          wp.text = textArea.value;
          wp.photo = photoInput.value.trim() || undefined;
          wp.photo_caption = captionInput.value.trim() || undefined;
          wp.photo_alt = altInput.value.trim() || undefined;
          wp.journey_card = undefined;
          wp.content = undefined;
        } else {
          wp.photo = undefined;
          wp.photo_caption = undefined;
          wp.photo_alt = undefined;
          wp.journey_card = true;
        }
        const radiusVal = parseFloat(radiusInput.value);
        wp.radius = isNaN(radiusVal) ? undefined : radiusVal;
      });
      overlay.remove();
      this.renderWaypointMarkers(stopIdx);
      this.setStatus('Waypoint saved.');
    };
    btnRow.appendChild(saveBtn);

    modal.appendChild(btnRow);
    overlay.appendChild(modal);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    this.mapContainer.appendChild(overlay);
    L.DomEvent.disableClickPropagation(overlay);
    if (mode === 'basic') textArea.focus();
  }

  private showOrsKeyModal(onSaved?: () => void): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:12px;padding:24px;max-width:480px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.2);';

    modal.innerHTML = `
      <h3 style="margin:0 0 12px; font-size:16px;">OpenRouteService API Key</h3>
      <p style="font-size:13px; color:#64748b; margin:0 0 12px; line-height:1.5;">
        Auto-routing uses <a href="https://openrouteservice.org" target="_blank" style="color:#2563eb;">OpenRouteService</a>
        for foot-walking directions along real paths and footways.
      </p>
      <ol style="font-size:13px; color:#64748b; margin:0 0 16px; padding-left:20px; line-height:1.7;">
        <li>Go to <a href="https://openrouteservice.org/dev/#/signup" target="_blank" style="color:#2563eb;">openrouteservice.org/dev</a></li>
        <li>Sign up for a free account (2,000 requests/day)</li>
        <li>Copy your API key and paste it below</li>
      </ol>
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.placeholder = 'Paste your API key here...';
    input.value = getOrsApiKey();
    input.style.marginBottom = '16px';
    modal.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => overlay.remove();
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Key';
    saveBtn.onclick = () => {
      const key = input.value.trim();
      if (!key) return;
      setOrsApiKey(key);
      overlay.remove();
      this.setStatus('ORS API key saved.');
      onSaved?.();
    };
    btnRow.appendChild(saveBtn);
    modal.appendChild(btnRow);

    overlay.appendChild(modal);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    input.focus();
  }

  private setStatus(msg: string): void {
    this.statusEl.textContent = msg;
    setTimeout(() => {
      if (this.statusEl.textContent === msg) this.statusEl.textContent = '';
    }, 5000);
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  destroy(): void {
    if (this.map) this.map.remove();
  }
}
