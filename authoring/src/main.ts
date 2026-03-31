import './styles.css';
import { loadTourStore, getStoredTour } from './store';
import { renderTourList } from './ui/tour-list';
import { TourEditor } from './ui/editor';
import type { Tour } from './types';

const app = document.getElementById('app')!;
let currentEditor: TourEditor | null = null;

function showTourList(): void {
  if (currentEditor) {
    currentEditor.destroy();
    currentEditor = null;
  }
  renderTourList(app, {
    onOpenTour: (tour: Tour) => openEditor(tour),
  });
}

function openEditor(tour: Tour): void {
  if (currentEditor) {
    currentEditor.destroy();
    currentEditor = null;
  }
  currentEditor = new TourEditor(app, tour, {
    onBackToList: showTourList,
  });
}

// On load: restore last active tour or show list
const store = loadTourStore();
if (store.activeTourId) {
  const stored = getStoredTour(store.activeTourId);
  if (stored) {
    openEditor(stored.tour);
  } else {
    showTourList();
  }
} else {
  showTourList();
}
