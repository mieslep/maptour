/**
 * Shared Leaflet mock for unit tests.
 *
 * Usage:
 *   vi.mock('leaflet', () => import('../mocks/leaflet'));
 *
 * Every factory (map, marker, tileLayer, etc.) returns a mock object
 * whose methods are vi.fn() stubs returning `this` (chainable) or
 * sensible defaults.
 */
import { vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Build an object whose listed keys are all vi.fn() returning `this`. */
function chainable<T extends string>(...keys: T[]): Record<T, ReturnType<typeof vi.fn>> {
  const obj: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of keys) {
    obj[k] = vi.fn().mockReturnThis();
  }
  return obj as Record<T, ReturnType<typeof vi.fn>>;
}

/* ------------------------------------------------------------------ */
/*  Mock map                                                          */
/* ------------------------------------------------------------------ */

function createMockMap() {
  const container = document.createElement('div');
  const map = {
    ...chainable(
      'on', 'off', 'once',
      'fitBounds', 'setView', 'flyTo', 'flyToBounds', 'panTo',
      'setZoom',
      'invalidateSize', 'remove',
      'addLayer', 'removeLayer',
      'addControl',
    ),
    getZoom: vi.fn().mockReturnValue(15),
    getCenter: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
    getContainer: vi.fn().mockReturnValue(container),
    project: vi.fn().mockReturnValue({ x: 100, y: 100 }),
    unproject: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
    latLngToContainerPoint: vi.fn().mockReturnValue({ x: 0, y: 0 }),
  };
  return map;
}

/* ------------------------------------------------------------------ */
/*  Mock marker                                                       */
/* ------------------------------------------------------------------ */

function createMockMarker() {
  const el = document.createElement('div');
  return {
    ...chainable(
      'addTo', 'remove',
      'setLatLng', 'setIcon',
      'bindTooltip', 'setTooltipContent',
      'on', 'off',
    ),
    getElement: vi.fn().mockReturnValue(el),
    getLatLng: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  };
}

/* ------------------------------------------------------------------ */
/*  Mock circle marker                                                */
/* ------------------------------------------------------------------ */

function createMockCircleMarker() {
  return {
    ...chainable('addTo', 'remove', 'setLatLng', 'setStyle', 'on', 'off'),
  };
}

/* ------------------------------------------------------------------ */
/*  Mock polyline                                                     */
/* ------------------------------------------------------------------ */

function createMockPolyline() {
  return {
    ...chainable('addTo', 'remove', 'setLatLngs', 'setStyle', 'on', 'off'),
  };
}

/* ------------------------------------------------------------------ */
/*  Mock layer group                                                  */
/* ------------------------------------------------------------------ */

function createMockLayerGroup() {
  return {
    ...chainable('addTo', 'remove', 'clearLayers', 'addLayer', 'removeLayer'),
  };
}

/* ------------------------------------------------------------------ */
/*  Mock tile layer                                                   */
/* ------------------------------------------------------------------ */

function createMockTileLayer() {
  return {
    ...chainable('addTo', 'remove'),
  };
}

/* ------------------------------------------------------------------ */
/*  Mock control                                                      */
/* ------------------------------------------------------------------ */

function createMockControl() {
  return {
    ...chainable('addTo', 'remove'),
  };
}

/* ------------------------------------------------------------------ */
/*  Mock bounds                                                       */
/* ------------------------------------------------------------------ */

function createMockBounds() {
  return {
    extend: vi.fn().mockReturnThis(),
    isValid: vi.fn().mockReturnValue(true),
    getCenter: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
    getNorthEast: vi.fn().mockReturnValue({ lat: 1, lng: 1 }),
    getSouthWest: vi.fn().mockReturnValue({ lat: -1, lng: -1 }),
    pad: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnValue(true),
  };
}

/* ------------------------------------------------------------------ */
/*  Exported L namespace                                              */
/* ------------------------------------------------------------------ */

export const map = vi.fn().mockImplementation(() => createMockMap());
export const marker = vi.fn().mockImplementation(() => createMockMarker());
export const circleMarker = vi.fn().mockImplementation(() => createMockCircleMarker());
export const polyline = vi.fn().mockImplementation(() => createMockPolyline());
export const layerGroup = vi.fn().mockImplementation(() => createMockLayerGroup());
export const tileLayer = vi.fn().mockImplementation(() => createMockTileLayer());
export const latLngBounds = vi.fn().mockImplementation(() => createMockBounds());
export const latLng = vi.fn().mockImplementation((lat: number, lng: number) => ({ lat, lng }));
export const divIcon = vi.fn().mockImplementation(() => ({ options: {} }));

export const control = {
  zoom: vi.fn().mockImplementation(() => createMockControl()),
};

export const Control = {
  extend: vi.fn().mockImplementation((proto: { onAdd?: () => HTMLElement }) => {
    // Return a constructor that calls onAdd when instantiated
    return vi.fn().mockImplementation(() => {
      const ctrl = createMockControl();
      if (proto.onAdd) {
        const el = proto.onAdd();
        // Attach to map container when addTo is called
        (ctrl.addTo as ReturnType<typeof vi.fn>).mockImplementation((m: ReturnType<typeof createMockMap>) => {
          m.getContainer().appendChild(el);
          return ctrl;
        });
      }
      return ctrl;
    });
  }),
};

export const DomUtil = {
  create: vi.fn().mockImplementation((tag: string, className?: string) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }),
};

export const DomEvent = {
  disableClickPropagation: vi.fn(),
  disableScrollPropagation: vi.fn(),
};

/* Default export mirrors the namespace for `import L from 'leaflet'` */
const L = {
  map,
  marker,
  circleMarker,
  polyline,
  layerGroup,
  tileLayer,
  latLngBounds,
  latLng,
  divIcon,
  control,
  Control,
  DomUtil,
  DomEvent,
};

export default L;
