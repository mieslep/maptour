import type { Tour, TourStore, StoredTour, Stop, ContentBlock } from './types';

const STORAGE_KEY = 'maptour-authoring-tours';
const ORS_KEY = 'maptour-ors-api-key';

// ---- Undo/Redo ----

interface UndoEntry {
  tour: Tour;
}

let undoStack: UndoEntry[] = [];
let redoStack: UndoEntry[] = [];
const MAX_UNDO = 50;

export function pushUndo(tour: Tour): void {
  undoStack.push({ tour: structuredClone(tour) });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
}

export function undo(current: Tour): Tour | null {
  if (undoStack.length === 0) return null;
  redoStack.push({ tour: structuredClone(current) });
  return undoStack.pop()!.tour;
}

export function redo(current: Tour): Tour | null {
  if (redoStack.length === 0) return null;
  undoStack.push({ tour: structuredClone(current) });
  return redoStack.pop()!.tour;
}

export function clearUndoRedo(): void {
  undoStack = [];
  redoStack = [];
}

// ---- localStorage ----

export function loadTourStore(): TourStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { tours: {}, activeTourId: null };
}

export function saveTourStore(store: TourStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    alert('Warning: localStorage may be full. Export your tour as YAML to avoid data loss.');
  }
}

export function saveTour(tour: Tour): void {
  const store = loadTourStore();
  store.tours[tour.tour.id] = {
    tour: structuredClone(tour),
    lastModified: new Date().toISOString(),
  };
  store.activeTourId = tour.tour.id;
  saveTourStore(store);
}

export function deleteTour(tourId: string): void {
  const store = loadTourStore();
  delete store.tours[tourId];
  if (store.activeTourId === tourId) {
    const ids = Object.keys(store.tours);
    store.activeTourId = ids.length > 0 ? ids[0] : null;
  }
  saveTourStore(store);
}

export function getStoredTour(tourId: string): StoredTour | null {
  const store = loadTourStore();
  return store.tours[tourId] ?? null;
}

export function listTours(): Array<{ id: string; title: string; stopCount: number; lastModified: string }> {
  const store = loadTourStore();
  return Object.values(store.tours).map(st => ({
    id: st.tour.tour.id,
    title: st.tour.tour.title,
    stopCount: st.tour.stops.length,
    lastModified: st.lastModified,
  }));
}

// ---- ORS API key ----

export function getOrsApiKey(): string {
  return localStorage.getItem(ORS_KEY) ?? '';
}

export function setOrsApiKey(key: string): void {
  localStorage.setItem(ORS_KEY, key);
}

// ---- Tour factory ----

export function createEmptyTour(id?: string): Tour {
  const tourId = id ?? `tour-${Date.now()}`;
  return {
    tour: {
      id: tourId,
      title: 'New Tour',
    },
    stops: [],
  };
}

// ---- Debounced auto-save ----

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSave(tour: Tour, delay = 500): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveTour(tour), delay);
}
