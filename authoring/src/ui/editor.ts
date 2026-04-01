import L from 'leaflet';
import type { Tour, Stop, ContentBlock, LegMode } from '../types';
import { pushUndo, undo, redo, debouncedSave, clearUndoRedo, getOrsApiKey, setOrsApiKey, getAssetBaseUrl, setAssetBaseUrl } from '../store';
import { downloadYaml } from '../yaml-io';
import { generateRoute, generateAllRoutes } from '../ors';
import { renderContentBlockEditor } from './content-blocks';

// i18n default keys for the string overrides editor
const I18N_DEFAULTS: Record<string, { default: string; desc: string }> = {
  welcome:         { default: 'Welcome', desc: 'Header label on welcome screen' },
  en_route:        { default: 'En route', desc: 'Header label during journey between stops' },
  complete:        { default: 'Complete', desc: 'Header label on goodbye screen' },
  all_stops:       { default: 'All Stops', desc: 'Stop list toggle label when expanded' },
  stop_n:          { default: 'Stop {n} / {total}', desc: 'Header label showing current stop. Placeholders: {n}, {total}' },
  start_at:        { default: 'Start at Stop {n} / {total}:', desc: 'Welcome card stop selector label. Placeholders: {n}, {total}' },
  start_from:      { default: 'Start from {stop}', desc: 'CTA button on welcome card. Placeholder: {stop}' },
  tip:             { default: 'Select a stop on the map or use the arrows above to change your starting point', desc: 'Hint text on welcome card' },
  next_stop:       { default: 'Next: {stop}', desc: 'Footer showing next stop name. Placeholder: {stop}' },
  next_btn:        { default: 'Next →', desc: 'Next button text' },
  finish_tour:     { default: 'Finish Tour', desc: 'Button on last stop to end tour' },
  arrived:         { default: "I've arrived at {stop} →", desc: 'Journey card CTA. Placeholder: {stop}' },
  tour_complete:   { default: 'Tour complete!', desc: 'Goodbye screen heading' },
  stops_visited:   { default: '{n} / {total} stops visited', desc: 'Goodbye screen stats. Placeholders: {n}, {total}' },
  revisit:         { default: 'Revisit tour', desc: 'Button to restart tour from goodbye screen' },
  close:           { default: 'Close', desc: 'Close button on goodbye screen' },
  walk_me:         { default: 'Walk me there', desc: 'Nav button for walk mode' },
  drive_me:        { default: 'Drive me there', desc: 'Nav button for drive mode' },
  transit_dir:     { default: 'Get transit directions', desc: 'Nav button for transit mode' },
  cycle_dir:       { default: 'Get cycling directions', desc: 'Nav button for cycle mode' },
  directions_to:   { default: 'Directions to this stop', desc: 'Generic nav button label' },
  picker_title:    { default: 'Open directions in:', desc: 'Nav app picker dialog title' },
  picker_cancel:   { default: 'Cancel', desc: 'Nav app picker cancel button' },
  stop_order:      { default: 'Stop order:', desc: 'Label for forward/reverse toggle' },
  im_here:         { default: "I'm here", desc: 'Transit bar arrival button' },
  all_stops_title: { default: 'All stops', desc: 'Stop list overlay title' },
  tour_load_error: { default: 'Tour could not load', desc: 'Error screen heading' },
  image_error:     { default: 'Image could not be loaded', desc: 'Image fallback text' },
  audio_error:     { default: 'Audio could not be loaded.', desc: 'Audio fallback text' },
  transit_label:   { default: 'Stop {n}: {stop}', desc: 'Transit bar label. Placeholders: {n}, {stop}' },
  nearest_to_you:  { default: 'Nearest to you: ', desc: 'GPS nearest stop indicator prefix' },
  stop_label:      { default: 'Stop {n} — {stop}', desc: 'Stop reference in nearest indicator. Placeholders: {n}, {stop}' },
  gallery_counter: { default: '{n} / {total}', desc: 'Gallery image counter. Placeholders: {n}, {total}' },
  minimize:        { default: 'Minimize', desc: 'Minimize button tooltip' },
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
  private routePolylines: L.Polyline[] = [];
  private radiusCircle: L.Circle | null = null;
  private routePointMarkers: L.CircleMarker[] = [];
  private editingRouteSegment: number = -1;
  private preEditView: { center: L.LatLng; zoom: number } | null = null;
  private mapMode: 'default' | 'addStop' = 'default';
  private selectedStopIdx: number = -1;
  private selectedCard: 'welcome' | 'goodbye' | null = null;
  private previewMode: 'phone' | 'tablet' | 'desktop' = 'phone';
  private detailTab: 'stop' | 'journey' = 'stop';
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
    pushUndo(this.tour);
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
    this.map = L.map(this.mapContainer, { zoomControl: true, keyboard: false }).setView([52.845, -8.985], 15);
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
      // In route edit mode, click on map adds a point
      if (this.editingRouteSegment >= 0) {
        this.addRoutePointAtClick(e.latlng);
        return;
      }
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
        content: [{ type: 'text', body: '*Click the \u22ee menu to edit this block, or add more content below.*' }],
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
    });
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
    });
    this.refreshMap();
    this.renderPanel();
  }

  private selectStop(idx: number): void {
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

  private startEditingRoute(stopIdx: number): void {
    this.stopEditingRoute();
    if (stopIdx <= 0 || stopIdx >= this.tour.stops.length) return;
    const stop = this.tour.stops[stopIdx];
    if (!stop.getting_here?.route || stop.getting_here.route.length === 0) return;

    // Save current view to restore on Done
    if (!this.preEditView) {
      this.preEditView = { center: this.map.getCenter(), zoom: this.map.getZoom() };
    }

    this.editingRouteSegment = stopIdx;
    const route = stop.getting_here.route;
    let justDragged = false;

    // Fit map to show the full segment with padding
    const prevStop = this.tour.stops[stopIdx - 1];
    const allPts: L.LatLngTuple[] = [
      [prevStop.coords[0], prevStop.coords[1]],
      ...route.map(p => [p[0], p[1]] as L.LatLngTuple),
      [stop.coords[0], stop.coords[1]],
    ];
    this.map.fitBounds(L.latLngBounds(allPts), { padding: [60, 60], animate: true });

    const rebuildMarkers = () => {
      this.routePointMarkers.forEach(m => m.remove());
      this.routePointMarkers = [];
      buildMarkers();
    };

    const buildMarkers = () => {
      route.forEach((pt, ptIdx) => {
        const m = L.circleMarker([pt[0], pt[1]], {
          radius: 8,
          fillColor: '#2563eb',
          color: '#fff',
          weight: 2,
          fillOpacity: 0.8,
          pane: 'routeEditPoints',
          bubblingMouseEvents: false,
        }).addTo(this.map);

        // Drag support
        m.on('mousedown', (e) => {
          justDragged = false;
          pushUndo(this.tour); // snapshot before drag starts
          this.map.dragging.disable();
          L.DomEvent.stopPropagation(e);
          const onMove = (ev: L.LeafletMouseEvent) => {
            if (!justDragged) {
              // First move: select this point visually
              justDragged = true;
              this.routePointMarkers.forEach(rm => {
                rm.setStyle({ fillColor: '#2563eb', radius: 8 });
                (rm.options as any)._selected = false;
              });
              m.setStyle({ fillColor: '#dc2626', radius: 10 });
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
              this.updateRouteEditWidgetPosition();
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
          // Deselect all
          this.routePointMarkers.forEach(rm => {
            rm.setStyle({ fillColor: '#2563eb', radius: 8 });
            (rm.options as any)._selected = false;
          });
          // Toggle: if it wasn't selected, select it. If it was, leave deselected.
          if (!wasSelected) {
            m.setStyle({ fillColor: '#dc2626', radius: 10 });
            (m.options as any)._selected = true;
          }
        });

        this.routePointMarkers.push(m);
      });

      // Make the polyline clickable for inserting points
      if (stopIdx - 1 < this.routePolylines.length) {
        const pl = this.routePolylines[stopIdx - 1];
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
          this.updateRouteEditWidgetPosition();
          this.setStatus(`Inserted point. ${route.length} points.`);
        });
      }
    };

    buildMarkers();
    this.showRouteEditWidget(stopIdx);
    this.setStatus(`Editing route to stop ${stopIdx + 1}.`);
  }

  private showRouteEditWidget(stopIdx: number): void {
    this.hideRouteEditWidget();

    const widget = document.createElement('div');
    widget.className = 'route-edit-widget';
    widget.innerHTML = `
      <span><i class="fa-solid fa-pen" aria-hidden="true"></i> Editing route to Stop ${stopIdx + 1}</span>
      <span class="route-edit-hint">Click to add. Drag to move. Delete to remove.</span>
    `;
    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-primary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => {
      this.stopEditingRoute();
      this.refreshRoutePolylines();
      this.setStatus('Route editing finished.');
    };
    widget.appendChild(doneBtn);
    this.mapContainer.appendChild(widget);
  }

  private updateRouteEditWidgetPosition(): void {
    // No-op: widget is CSS-fixed at top of map container
  }

  private hideRouteEditWidget(): void {
    this.mapContainer.querySelector('.route-edit-widget')?.remove();
  }

  private stopEditingRoute(): void {
    this.routePointMarkers.forEach(m => m.remove());
    this.routePointMarkers = [];
    this.editingRouteSegment = -1;
    this.hideRouteEditWidget();
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
    // Rebuild markers to include the new point
    this.routePointMarkers.forEach(m => m.remove());
    this.routePointMarkers = [];
    this.startEditingRoute(this.editingRouteSegment);
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
    this.startEditingRoute(segIdx);
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

  private refreshMap(): void {
    // Clear existing markers, polylines, and route edit points
    this.stopMarkers.forEach(m => m.remove());
    this.stopMarkers = [];
    this.routePolylines.forEach(p => p.remove());
    this.routePolylines = [];
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
        this.withUndo(() => {
          stop.coords = [ll.lat, ll.lng];
        });
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
    this.routePolylines = [];

    for (let i = 1; i < this.tour.stops.length; i++) {
      const stop = this.tour.stops[i];
      const prevStop = this.tour.stops[i - 1];

      let points: [number, number][];
      if (stop.getting_here?.route && stop.getting_here.route.length > 0) {
        points = stop.getting_here.route;
      } else {
        // Draw a straight line if no route
        points = [prevStop.coords, stop.coords];
      }

      const hasRoute = !!(stop.getting_here?.route && stop.getting_here.route.length > 0);
      const polyline = L.polyline(points, {
        color: hasRoute ? '#2563eb' : '#94a3b8',
        weight: hasRoute ? 3 : 2,
        dashArray: hasRoute ? undefined : '6 4',
        opacity: 0.7,
      }).addTo(this.map);

      this.routePolylines.push(polyline);
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

  private makeDeviceToolbar(title: string): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'panel-toolbar';

    const label = document.createElement('span');
    label.style.cssText = 'font-weight:600; font-size:14px; flex:1;';
    label.textContent = title;
    toolbar.appendChild(label);

    // Device preview toggles
    const devices = document.createElement('div');
    devices.className = 'device-toggles';

    const modes: Array<{ mode: 'phone' | 'tablet' | 'desktop'; icon: string; label: string; minWidth: number }> = [
      { mode: 'phone', icon: 'fa-mobile-screen', label: 'Phone (375px)', minWidth: 0 },
      { mode: 'tablet', icon: 'fa-tablet-screen-button', label: 'Tablet (768px)', minWidth: 400 },
      { mode: 'desktop', icon: 'fa-desktop', label: 'Desktop (full)', minWidth: 780 },
    ];

    for (const m of modes) {
      const btn = document.createElement('button');
      btn.className = `btn btn-icon device-toggle ${this.previewMode === m.mode ? 'active' : ''}`;
      btn.innerHTML = `<i class="fa-solid ${m.icon}"></i>`;
      btn.title = m.label;

      // Disable if panel is too narrow
      const panelWidth = this.detailPanel.offsetWidth;
      if (panelWidth > 0 && panelWidth < m.minWidth) {
        btn.disabled = true;
        btn.title = `${m.label} — expand the panel to enable`;
      }

      btn.onclick = () => {
        this.previewMode = m.mode;
        this.renderDetailPanel();
      };
      devices.appendChild(btn);
    }
    toolbar.appendChild(devices);

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

    return toolbar;
  }

  private wrapInDeviceFrame(content: HTMLElement): HTMLElement {
    const frame = document.createElement('div');
    frame.className = `device-frame device-frame--${this.previewMode}`;

    if (this.previewMode === 'phone') {
      // Phone chrome: notch + rounded corners
      const notch = document.createElement('div');
      notch.className = 'device-notch';
      frame.appendChild(notch);
    }

    const viewport = document.createElement('div');
    viewport.className = 'device-viewport';
    viewport.appendChild(content);
    frame.appendChild(viewport);

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
    const fields: Array<{ label: string; key: string; value: string; type?: string }> = [
      { label: 'ID', key: 'id', value: meta.id },
      { label: 'Description', key: 'description', value: meta.description ?? '', type: 'textarea' },
      { label: 'Duration', key: 'duration', value: meta.duration ?? '' },
      { label: 'Close URL', key: 'close_url', value: meta.close_url ?? '' },
    ];

    fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'input-row';
      const label = document.createElement('label');
      label.className = 'input-label';
      label.textContent = f.label;
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
    navRow.innerHTML = '<label class="input-label">Default Nav Mode</label>';
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

    // GPS config
    const gpsFields: Array<{ label: string; key: keyof NonNullable<typeof meta.gps>; placeholder: string }> = [
      { label: 'GPS Max Distance (m)', key: 'max_distance', placeholder: '5000' },
      { label: 'GPS Max Accuracy (m)', key: 'max_accuracy', placeholder: '500' },
      { label: 'GPS Arrival Radius (m)', key: 'arrival_radius', placeholder: '7.5' },
    ];

    if (!meta.gps) meta.gps = {};
    gpsFields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'input-row';
      const label = document.createElement('label');
      label.className = 'input-label';
      label.textContent = f.label;
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

    // Asset base URL (for resolving relative image paths in previews)
    const assetRow = document.createElement('div');
    assetRow.className = 'input-row';
    const assetLabel = document.createElement('label');
    assetLabel.className = 'input-label';
    assetLabel.innerHTML = 'Asset Base URL <span class="info-icon" title="Base URL for resolving relative image/audio paths in the preview. e.g. http://localhost:4173/ if serving from the demo folder. Not exported to YAML."><i class="fa-solid fa-circle-info"></i></span>';
    assetRow.appendChild(assetLabel);
    const assetInput = document.createElement('input');
    assetInput.type = 'text';
    assetInput.className = 'input';
    assetInput.placeholder = 'e.g. http://localhost:4173/';
    assetInput.value = getAssetBaseUrl();
    assetInput.oninput = () => {
      setAssetBaseUrl(assetInput.value);
    };
    assetRow.appendChild(assetInput);
    content.appendChild(assetRow);

    return this.renderCollapsible('Tour Metadata', content, false);
  }

  private renderCardsList(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

    const list = document.createElement('div');
    list.className = 'stop-list';

    // Welcome card (pinned at top)
    const welcomeItem = document.createElement('div');
    welcomeItem.className = `stop-list-item stop-list-item--special ${this.selectedCard === 'welcome' ? 'selected' : ''}`;
    welcomeItem.innerHTML = `<span class="stop-drag-handle"><i class="fa-solid fa-flag" style="color:#16a34a;"></i></span><span class="stop-list-info">Welcome Card</span>`;
    welcomeItem.onclick = () => {
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

    const stopIdx = this.selectedStopIdx;
    const hasJourney = stopIdx > 0;

    // Tab switcher (only if journey could exist)
    if (hasJourney) {
      const tabs = document.createElement('div');
      tabs.className = 'card-tab-switcher';
      for (const tab of ['stop', 'journey'] as const) {
        const btn = document.createElement('button');
        btn.className = `card-tab${this.detailTab === tab ? ' active' : ''}`;
        btn.textContent = tab === 'stop' ? 'Stop Card' : 'Journey';
        btn.onclick = () => {
          this.detailTab = tab;
          this.renderDetailPanel();
        };
        tabs.appendChild(btn);
      }
      content.appendChild(tabs);
    }

    if (this.detailTab === 'journey' && hasJourney) {
      content.appendChild(this.renderJourneyTab(stop));
    } else {
      content.appendChild(this.renderStopCardTab(stop, stopIdx));
    }

    return content;
  }

  private renderStopCardTab(stop: Stop, stopIdx: number): HTMLElement {
    const frag = document.createElement('div');

    // Zone 1: Title
    const titleZone = document.createElement('div');
    titleZone.className = 'card-edit-zone';

    titleZone.appendChild(this.makeGutterButton(() => this.showTitleModal(stop)));

    const titleContent = document.createElement('div');
    const titleHeading = document.createElement('div');
    titleHeading.className = 'card-title';
    titleHeading.textContent = stop.title || 'Untitled Stop';
    titleContent.appendChild(titleHeading);

    const coordsSmall = document.createElement('div');
    coordsSmall.className = 'card-coords';
    coordsSmall.textContent = `${stop.coords[0].toFixed(5)}, ${stop.coords[1].toFixed(5)}`;
    titleContent.appendChild(coordsSmall);
    titleZone.appendChild(titleContent);
    frag.appendChild(titleZone);

    // Zone 2: Getting Here (non-first stops only)
    if (stopIdx > 0) {
      if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
      const gh = stop.getting_here;

      const ghZone = document.createElement('div');
      ghZone.className = 'card-edit-zone card-getting-here';

      ghZone.appendChild(this.makeGutterButton(() => this.showGettingHereModal(stop, stopIdx)));

      const ghContent = document.createElement('div');
      ghContent.style.cssText = 'display:flex; align-items:center; gap:6px; flex:1; min-width:0;';

      const iconClass = TourEditor.MODE_ICONS[gh.mode] || 'fa-person-walking';
      const modeIcon = document.createElement('i');
      modeIcon.className = `fa-solid ${iconClass} card-gh-icon`;
      ghContent.appendChild(modeIcon);

      const noteText = document.createElement('span');
      noteText.className = 'card-gh-note';
      noteText.textContent = gh.note || `${gh.mode.charAt(0).toUpperCase() + gh.mode.slice(1)} to this stop`;
      ghContent.appendChild(noteText);

      if (gh.route && gh.route.length > 0) {
        const badge = document.createElement('span');
        badge.className = 'card-gh-badge';
        badge.textContent = `${gh.route.length} pts`;
        ghContent.appendChild(badge);
      }

      ghZone.appendChild(ghContent);
      frag.appendChild(ghZone);
    }

    // Divider
    const divider = document.createElement('div');
    divider.className = 'card-divider';
    frag.appendChild(divider);

    // Zone 3: Content blocks (reuse existing WYSIWYG block preview system)
    const contentZone = document.createElement('div');
    contentZone.className = 'card-content-zone';
    contentZone.appendChild(renderContentBlockEditor(stop.content, () => this.changed(), ''));
    frag.appendChild(contentZone);

    // Zone 4: Footer (visual only)
    const nextIdx = stopIdx + 1;
    if (nextIdx < this.tour.stops.length) {
      const footer = document.createElement('div');
      footer.className = 'card-footer';
      const nextStop = this.tour.stops[nextIdx];
      footer.textContent = `Next: Stop ${nextIdx + 1} \u2014 ${nextStop.title || 'Untitled'}`;
      frag.appendChild(footer);
    } else {
      const footer = document.createElement('div');
      footer.className = 'card-footer';
      footer.textContent = 'Last stop';
      frag.appendChild(footer);
    }

    return frag;
  }

  private renderJourneyTab(stop: Stop): HTMLElement {
    const frag = document.createElement('div');
    frag.style.padding = '8px 0';
    if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
    const gh = stop.getting_here;

    if (gh.journey && gh.journey.length > 0) {
      frag.appendChild(renderContentBlockEditor(gh.journey, () => this.changed(), ''));
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-danger';
      removeBtn.style.marginTop = '8px';
      removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove all journey content';
      removeBtn.onclick = () => {
        if (!confirm('Remove all journey content for this route?')) return;
        this.withUndo(() => { gh.journey = undefined; });
        this.renderDetailPanel();
      };
      frag.appendChild(removeBtn);
    } else {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-msg';
      emptyMsg.textContent = 'No journey content yet.';
      frag.appendChild(emptyMsg);

      const addBtn = document.createElement('button');
      addBtn.className = 'cb-add-btn';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add journey content';
      addBtn.onclick = () => {
        this.withUndo(() => { gh.journey = [{ type: 'text', body: '' }]; });
        this.renderDetailPanel();
      };
      frag.appendChild(addBtn);
    }

    return frag;
  }

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

  private showTitleModal(stop: Stop): void {
    this.showEditZoneModal('Edit Title', (body) => {
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

      // Coords (readonly)
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

  private showGettingHereModal(stop: Stop, stopIdx: number): void {
    if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
    const gh = stop.getting_here;

    this.showEditZoneModal('Edit Getting Here', (body) => {
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

      // Route controls
      const routeDiv = document.createElement('div');
      routeDiv.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;';

      const routeLabel = document.createElement('div');
      routeLabel.className = 'subsection-title';
      routeLabel.textContent = 'Route';
      routeDiv.appendChild(routeLabel);

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; align-items:center;';

      if (gh.route && gh.route.length > 0) {
        const info = document.createElement('span');
        info.style.cssText = 'font-size:12px; color:#64748b;';
        info.textContent = `${gh.route.length} points`;
        btnRow.appendChild(info);

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm';
        editBtn.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i> Edit';
        editBtn.onclick = () => this.startEditingRoute(stopIdx);
        btnRow.appendChild(editBtn);

        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-sm btn-danger';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => {
          this.withUndo(() => { gh.route = undefined; });
          this.stopEditingRoute();
          this.refreshRoutePolylines();
          this.renderPanel();
        };
        btnRow.appendChild(clearBtn);
      } else {
        const noRoute = document.createElement('span');
        noRoute.style.cssText = 'font-size:12px; color:#94a3b8;';
        noRoute.textContent = 'No route';
        btnRow.appendChild(noRoute);

        if (stopIdx > 0) {
          const manualBtn = document.createElement('button');
          manualBtn.className = 'btn btn-sm';
          manualBtn.innerHTML = '<i class="fa-solid fa-draw-polygon" aria-hidden="true"></i> Draw Route';
          manualBtn.onclick = () => {
            const prevStop = this.tour.stops[stopIdx - 1];
            this.withUndo(() => {
              gh.route = [
                [...prevStop.coords] as [number, number],
                [...stop.coords] as [number, number],
              ];
            });
            this.refreshRoutePolylines();
            this.startEditingRoute(stopIdx);
            this.renderPanel();
          };
          btnRow.appendChild(manualBtn);
        }
      }

      if (stopIdx > 0) {
        const genBtn = document.createElement('button');
        genBtn.className = 'btn btn-sm';
        genBtn.innerHTML = '<i class="fa-solid fa-route" aria-hidden="true"></i> Auto-route';
        genBtn.onclick = async () => {
          if (gh.route && gh.route.length > 0) {
            if (!confirm(`Replace existing route (${gh.route.length} points) with auto-generated route?`)) return;
          }
          const apiKey = getOrsApiKey();
          if (!apiKey) {
            this.showOrsKeyModal(() => { genBtn.click(); });
            return;
          }
          const prevStop = this.tour.stops[stopIdx - 1];
          genBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          genBtn.disabled = true;
          try {
            const route = await generateRoute(prevStop.coords, stop.coords);
            this.withUndo(() => { gh.route = route; });
            this.stopEditingRoute();
            this.refreshRoutePolylines();
            this.renderPanel();
            this.setStatus(`Route generated: ${route.length} points.`);
          } catch (err) {
            this.setStatus(`Route failed: ${(err as Error).message}`);
          }
          genBtn.innerHTML = '<i class="fa-solid fa-route" aria-hidden="true"></i> Auto-route';
          genBtn.disabled = false;
        };
        btnRow.appendChild(genBtn);
      }

      routeDiv.appendChild(btnRow);
      body.appendChild(routeDiv);
    });
  }

  private renderWelcomeSection(): HTMLElement {
    if (!this.tour.tour.welcome) this.tour.tour.welcome = [];
    const content = document.createElement('div');
    content.className = 'section-content';
    content.appendChild(renderContentBlockEditor(
      this.tour.tour.welcome, () => this.changed(), 'Content Blocks',
    ));
    return content;
  }

  private renderGoodbyeSection(): HTMLElement {
    if (!this.tour.tour.goodbye) this.tour.tour.goodbye = [];
    const content = document.createElement('div');
    content.className = 'section-content';
    content.appendChild(renderContentBlockEditor(
      this.tour.tour.goodbye, () => this.changed(), 'Content Blocks',
    ));
    return content;
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
    const prev = undo(this.tour);
    if (prev) {
      this.tour = prev;
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
    const next = redo(this.tour);
    if (next) {
      this.tour = next;
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
