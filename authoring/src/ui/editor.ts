import L from 'leaflet';
import type { Tour, Stop, ContentBlock, LegMode } from '../types';
import { pushUndo, undo, redo, debouncedSave, clearUndoRedo, getOrsApiKey, setOrsApiKey } from '../store';
import { downloadYaml } from '../yaml-io';
import { generateRoute, generateAllRoutes } from '../ors';
import { renderContentBlockEditor } from './content-blocks';

// i18n default keys for the string overrides editor
const I18N_KEYS = [
  'welcome', 'en_route', 'complete', 'all_stops', 'stop_n',
  'start_at', 'start_from', 'tip',
  'next_stop', 'next_btn', 'finish_tour',
  'arrived', 'tour_complete', 'stops_visited', 'revisit', 'close',
  'walk_me', 'drive_me', 'transit_dir', 'cycle_dir', 'directions_to',
  'picker_title', 'picker_cancel',
  'stop_order', 'im_here', 'all_stops_title',
  'tour_load_error', 'image_error', 'audio_error', 'minimize',
];

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
  private editingRouteSegment: number = -1; // index of stop whose getting_here.route is being edited
  private mapMode: 'default' | 'addStop' = 'default';
  private selectedStopIdx: number = -1;
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
    const radius = stop.arrival_radius ?? this.tour.tour.gps?.arrival_radius ?? 50;
    this.radiusCircle = L.circle([stop.coords[0], stop.coords[1]], {
      radius,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.08,
      weight: 1,
      dashArray: '4 4',
      interactive: false,
    }).addTo(this.map);
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

    this.editingRouteSegment = stopIdx;
    const route = stop.getting_here.route;
    let justDragged = false;

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
          // Select this point visually
          this.routePointMarkers.forEach(rm => {
            rm.setStyle({ fillColor: '#2563eb', radius: 8 });
            (rm.options as any)._selected = false;
          });
          m.setStyle({ fillColor: '#dc2626', radius: 10 });
          (m.options as any)._selected = true;
          this.map.dragging.disable();
          L.DomEvent.stopPropagation(e);
          const onMove = (ev: L.LeafletMouseEvent) => {
            justDragged = true;
            m.setLatLng(ev.latlng);
            route[ptIdx] = [ev.latlng.lat, ev.latlng.lng];
            this.refreshRoutePolylines();
          };
          const onUp = () => {
            this.map.dragging.enable();
            this.map.off('mousemove', onMove);
            this.map.off('mouseup', onUp);
            if (justDragged) this.changed();
            // Prevent the map click from firing after drag
            setTimeout(() => { justDragged = false; }, 50);
          };
          this.map.on('mousemove', onMove);
          this.map.on('mouseup', onUp);
        });

        // Click to select (for deletion)
        m.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (justDragged) return; // ignore click after drag
          if ((m.options as any)._selected) {
            m.setStyle({ fillColor: '#2563eb', radius: 8 });
            (m.options as any)._selected = false;
          } else {
            this.routePointMarkers.forEach(rm => {
              rm.setStyle({ fillColor: '#2563eb', radius: 8 });
              (rm.options as any)._selected = false;
            });
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
    const stop = this.tour.stops[stopIdx];
    const route = stop.getting_here?.route;

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

    // Position near the north-most point of the route
    if (route && route.length > 0) {
      let northMost = route[0];
      for (const pt of route) {
        if (pt[0] > northMost[0]) northMost = pt;
      }
      const px = this.map.latLngToContainerPoint([northMost[0], northMost[1]]);
      widget.style.left = px.x + 'px';
      widget.style.top = Math.max(10, px.y - 50) + 'px';
      widget.style.transform = 'translateX(-50%)';
    }

    this.mapContainer.appendChild(widget);
  }

  private hideRouteEditWidget(): void {
    this.mapContainer.querySelector('.route-edit-widget')?.remove();
  }

  private stopEditingRoute(): void {
    this.routePointMarkers.forEach(m => m.remove());
    this.routePointMarkers = [];
    this.editingRouteSegment = -1;
    this.hideRouteEditWidget();
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

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-primary';
    exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export YAML';
    exportBtn.onclick = () => {
      if (this.tour.stops.length === 0) {
        alert('Add at least one stop before exporting.');
        return;
      }
      downloadYaml(this.tour);
      this.setStatus('YAML exported.');
    };
    toolbar.appendChild(exportBtn);

    this.sidePanel.appendChild(toolbar);

    // Scrollable content
    const scrollable = document.createElement('div');
    scrollable.className = 'panel-scrollable';

    scrollable.appendChild(this.renderMetadataSection());
    scrollable.appendChild(this.renderStopList());

    this.sidePanel.appendChild(scrollable);

    // Detail panel: stop editor or welcome/goodbye/strings
    this.renderDetailPanel();
  }

  private renderDetailPanel(): void {
    this.detailPanel.innerHTML = '';

    if (this.selectedStopIdx >= 0 && this.selectedStopIdx < this.tour.stops.length) {
      // Show stop editor
      const toolbar = document.createElement('div');
      toolbar.className = 'panel-toolbar';
      const label = document.createElement('span');
      label.style.cssText = 'font-weight:600; font-size:14px; flex:1;';
      label.textContent = `Stop ${this.selectedStopIdx + 1}: ${this.tour.stops[this.selectedStopIdx].title || 'Untitled'}`;
      toolbar.appendChild(label);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn btn-icon';
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.title = 'Close';
      closeBtn.onclick = () => {
        this.selectedStopIdx = -1;
        this.refreshMap();
        this.renderDetailPanel();
      };
      toolbar.appendChild(closeBtn);
      this.detailPanel.appendChild(toolbar);

      const scrollable = document.createElement('div');
      scrollable.className = 'panel-scrollable';
      scrollable.appendChild(this.renderStopEditor(this.tour.stops[this.selectedStopIdx]));
      scrollable.appendChild(this.renderWelcomeSection());
      scrollable.appendChild(this.renderGoodbyeSection());
      scrollable.appendChild(this.renderStringsSection());
      this.detailPanel.appendChild(scrollable);
    } else {
      // Show empty state with welcome/goodbye/strings
      const toolbar = document.createElement('div');
      toolbar.className = 'panel-toolbar';
      const label = document.createElement('span');
      label.style.cssText = 'font-weight:500; font-size:13px; color:#94a3b8;';
      label.textContent = 'Select a stop to edit, or expand sections below';
      toolbar.appendChild(label);
      this.detailPanel.appendChild(toolbar);

      const scrollable = document.createElement('div');
      scrollable.className = 'panel-scrollable';
      scrollable.appendChild(this.renderWelcomeSection());
      scrollable.appendChild(this.renderGoodbyeSection());
      scrollable.appendChild(this.renderStringsSection());
      this.detailPanel.appendChild(scrollable);
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
      { label: 'GPS Arrival Radius (m)', key: 'arrival_radius', placeholder: '50' },
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

    return this.renderCollapsible('Tour Metadata', content, false);
  }

  private renderStopList(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

    // Route generation buttons
    const routeBar = document.createElement('div');
    routeBar.className = 'route-bar';

    const genAllBtn = document.createElement('button');
    genAllBtn.className = 'btn btn-sm';
    genAllBtn.innerHTML = '<i class="fa-solid fa-route"></i> Generate All Routes';
    genAllBtn.disabled = this.tour.stops.length < 2;
    genAllBtn.onclick = async () => {
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
        this.setStatus(`Generated ${routes.size} routes.`);
      } catch (e) {
        this.setStatus(`Route generation failed: ${(e as Error).message}`);
      }
      genAllBtn.disabled = false;
      genAllBtn.innerHTML = '<i class="fa-solid fa-route"></i> Generate All Routes';
    };
    routeBar.appendChild(genAllBtn);
    content.appendChild(routeBar);

    // Stop list
    const list = document.createElement('div');
    list.className = 'stop-list';

    this.tour.stops.forEach((stop, idx) => {
      const item = document.createElement('div');
      item.className = `stop-list-item ${idx === this.selectedStopIdx ? 'selected' : ''}`;

      const info = document.createElement('div');
      info.className = 'stop-list-info';
      info.innerHTML = `<span class="stop-num">${stop.id}</span> ${this.escHtml(stop.title)}`;
      info.onclick = () => this.selectStop(idx);
      item.appendChild(info);

      const controls = document.createElement('div');
      controls.className = 'stop-list-controls';

      if (idx > 0) {
        const upBtn = document.createElement('button');
        upBtn.className = 'btn btn-icon';
        upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        upBtn.title = 'Move up';
        upBtn.onclick = (e) => { e.stopPropagation(); this.moveStop(idx, idx - 1); };
        controls.appendChild(upBtn);
      }
      if (idx < this.tour.stops.length - 1) {
        const downBtn = document.createElement('button');
        downBtn.className = 'btn btn-icon';
        downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        downBtn.title = 'Move down';
        downBtn.onclick = (e) => { e.stopPropagation(); this.moveStop(idx, idx + 1); };
        controls.appendChild(downBtn);
      }

      // Generate route button (for stops after the first)
      if (idx > 0) {
        const routeBtn = document.createElement('button');
        routeBtn.className = 'btn btn-icon';
        routeBtn.innerHTML = '<i class="fa-solid fa-route"></i>';
        routeBtn.title = 'Generate route from previous stop';
        routeBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            const prevStop = this.tour.stops[idx - 1];
            routeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            const route = await generateRoute(prevStop.coords, stop.coords);
            this.withUndo(() => {
              if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
              stop.getting_here.route = route;
            });
            this.refreshRoutePolylines();
            this.setStatus(`Route generated: ${route.length} points.`);
          } catch (err) {
            this.setStatus(`Route failed: ${(err as Error).message}`);
          }
          routeBtn.innerHTML = '<i class="fa-solid fa-route"></i>';
        };
        controls.appendChild(routeBtn);
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-icon btn-danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = 'Delete stop';
      delBtn.onclick = (e) => { e.stopPropagation(); this.deleteStop(idx); };
      controls.appendChild(delBtn);

      item.appendChild(controls);
      list.appendChild(item);
    });

    if (this.tour.stops.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-msg';
      empty.textContent = 'No stops yet. Click "Add Stop" then click the map.';
      list.appendChild(empty);
    }

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

    return this.renderCollapsible(`Stops (${this.tour.stops.length})`, content, true);
  }

  private renderStopEditor(stop: Stop): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

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
      // Update marker tooltip
      const marker = this.stopMarkers[this.selectedStopIdx];
      if (marker) marker.setTooltipContent(stop.title);
    };
    titleRow.appendChild(titleInput);
    content.appendChild(titleRow);

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
    content.appendChild(coordsRow);

    // Arrival radius override
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
    content.appendChild(radiusRow);

    // Getting here section (for non-first stops)
    if (this.selectedStopIdx > 0) {
      if (!stop.getting_here) stop.getting_here = { mode: 'walk' };
      const gh = stop.getting_here;

      const ghDiv = document.createElement('div');
      ghDiv.className = 'subsection';
      ghDiv.innerHTML = '<div class="subsection-title">Getting Here</div>';

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
      ghDiv.appendChild(modeRow);

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
      ghDiv.appendChild(noteRow);

      // Route controls (always shown)
      const stopIdx = this.tour.stops.indexOf(stop);
      const routeDiv = document.createElement('div');
      routeDiv.className = 'route-info';
      routeDiv.style.cssText = 'flex-wrap:wrap; gap:4px;';

      if (gh.route && gh.route.length > 0) {
        const label = document.createElement('span');
        label.textContent = `Route: ${gh.route.length} pts`;
        label.style.marginRight = '4px';
        routeDiv.appendChild(label);

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm';
        editBtn.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i> Edit';
        editBtn.onclick = () => this.startEditingRoute(stopIdx);
        routeDiv.appendChild(editBtn);

        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-sm btn-danger';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => {
          this.withUndo(() => { gh.route = undefined; });
          this.stopEditingRoute();
          this.refreshRoutePolylines();
          this.renderPanel();
        };
        routeDiv.appendChild(clearBtn);
      } else {
        const label = document.createElement('span');
        label.textContent = 'No route';
        label.style.cssText = 'color:#94a3b8; margin-right:4px;';
        routeDiv.appendChild(label);

        // Create manual route (straight line between prev stop and this one, editable)
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
          routeDiv.appendChild(manualBtn);
        }
      }

      // Auto-generate route button (always available if there's a previous stop)
      if (stopIdx > 0) {
        const genBtn = document.createElement('button');
        genBtn.className = 'btn btn-sm';
        genBtn.innerHTML = '<i class="fa-solid fa-route" aria-hidden="true"></i> Auto-route';
        genBtn.onclick = async () => {
          // Confirm if overwriting existing route
          if (gh.route && gh.route.length > 0) {
            if (!confirm(`Replace existing route (${gh.route.length} points) with auto-generated route?`)) return;
          }
          const apiKey = getOrsApiKey();
          if (!apiKey) {
            this.showOrsKeyModal(() => {
              genBtn.click();
            });
            return;
          }
          const prevStop = this.tour.stops[stopIdx - 1];
          genBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          genBtn.disabled = true;
          try {
            const route = await generateRoute(prevStop.coords, stop.coords);
            this.withUndo(() => {
              gh.route = route;
            });
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
        routeDiv.appendChild(genBtn);
      }

      ghDiv.appendChild(routeDiv);

      // Journey content blocks
      if (!gh.journey) gh.journey = [];
      ghDiv.appendChild(renderContentBlockEditor(gh.journey, () => this.changed(), 'Journey Content'));

      content.appendChild(ghDiv);
    }

    // Stop content blocks
    content.appendChild(renderContentBlockEditor(stop.content, () => this.changed(), 'Stop Content'));

    return this.renderCollapsible(`Stop: ${stop.title}`, content, true);
  }

  private renderWelcomeSection(): HTMLElement {
    if (!this.tour.tour.welcome) this.tour.tour.welcome = [];
    const content = document.createElement('div');
    content.className = 'section-content';
    content.appendChild(renderContentBlockEditor(
      this.tour.tour.welcome, () => this.changed(), 'Welcome Content',
    ));
    return this.renderCollapsible('Welcome Screen', content, false);
  }

  private renderGoodbyeSection(): HTMLElement {
    if (!this.tour.tour.goodbye) this.tour.tour.goodbye = [];
    const content = document.createElement('div');
    content.className = 'section-content';
    content.appendChild(renderContentBlockEditor(
      this.tour.tour.goodbye, () => this.changed(), 'Goodbye Content',
    ));
    return this.renderCollapsible('Goodbye Screen', content, false);
  }

  private renderStringsSection(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'section-content';

    if (!this.tour.tour.strings) this.tour.tour.strings = {};
    const strings = this.tour.tour.strings;

    I18N_KEYS.forEach(key => {
      const row = document.createElement('div');
      row.className = 'input-row';
      const label = document.createElement('label');
      label.className = 'input-label input-label-sm';
      label.textContent = key;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input input-sm';
      input.placeholder = key;
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
    });

    return this.renderCollapsible('String Overrides', content, false);
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
