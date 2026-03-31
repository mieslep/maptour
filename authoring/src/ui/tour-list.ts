import { listTours, deleteTour, createEmptyTour, saveTour, loadTourStore, getStoredTour } from '../store';
import { yamlToTour } from '../yaml-io';
import type { Tour } from '../types';

export interface TourListCallbacks {
  onOpenTour: (tour: Tour) => void;
}

export function renderTourList(container: HTMLElement, callbacks: TourListCallbacks): void {
  container.innerHTML = '';
  container.className = 'tour-list-root';

  const header = document.createElement('div');
  header.className = 'tour-list-header';
  header.innerHTML = '<h1><i class="fa-solid fa-map-location-dot"></i> MapTour Authoring</h1>';

  const actions = document.createElement('div');
  actions.className = 'tour-list-actions';

  const newBtn = document.createElement('button');
  newBtn.className = 'btn btn-primary';
  newBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create New Tour';
  newBtn.onclick = () => {
    const tour = createEmptyTour();
    saveTour(tour);
    callbacks.onOpenTour(tour);
  };
  actions.appendChild(newBtn);

  const importBtn = document.createElement('button');
  importBtn.className = 'btn';
  importBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> Import YAML';
  importBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const tour = yamlToTour(reader.result as string);
          saveTour(tour);
          callbacks.onOpenTour(tour);
        } catch (e) {
          alert(`Failed to import YAML: ${(e as Error).message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  actions.appendChild(importBtn);

  header.appendChild(actions);
  container.appendChild(header);

  // Tour list
  const tours = listTours();

  if (tours.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tour-list-empty';
    empty.innerHTML = `
      <i class="fa-solid fa-map fa-3x" style="opacity: 0.3; margin-bottom: 16px;"></i>
      <p>No tours yet. Create a new tour or import an existing YAML file.</p>
    `;
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'tour-list-items';

  tours
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    .forEach(entry => {
      const item = document.createElement('div');
      item.className = 'tour-list-item';

      const info = document.createElement('div');
      info.className = 'tour-list-item-info';
      info.onclick = () => {
        const stored = getStoredTour(entry.id);
        if (stored) callbacks.onOpenTour(stored.tour);
      };

      const title = document.createElement('div');
      title.className = 'tour-list-item-title';
      title.textContent = entry.title;
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'tour-list-item-meta';
      const date = new Date(entry.lastModified);
      meta.textContent = `${entry.stopCount} stop${entry.stopCount !== 1 ? 's' : ''} · Last modified: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      info.appendChild(meta);

      item.appendChild(info);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-icon btn-danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = 'Delete tour';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${entry.title}"?`)) {
          deleteTour(entry.id);
          renderTourList(container, callbacks);
        }
      };
      item.appendChild(delBtn);

      list.appendChild(item);
    });

  container.appendChild(list);
}
