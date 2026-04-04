import { BottomSheet } from './BottomSheet';
import type { LayoutComponents } from './types';

export interface DesktopLayoutDeps {
  container: HTMLElement;
  mapPane: HTMLElement;
  menuBarEl: HTMLElement;
  progressBarEl: HTMLElement;
}

export function buildDesktopLayout(deps: DesktopLayoutDeps): LayoutComponents {
  const { container, mapPane, menuBarEl, progressBarEl } = deps;

  // Card element
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';

  // Stop list
  const stopListWrapper = document.createElement('div');
  stopListWrapper.className = 'maptour-stop-list-wrapper';
  const stopListEl = document.createElement('div');
  stopListEl.id = 'maptour-stop-list';
  stopListWrapper.appendChild(stopListEl);

  // Sheet content — wraps menu bar, progress bar, stop list, and card
  const sheetContentEl = document.createElement('div');
  sheetContentEl.className = 'maptour-sheet-content';
  sheetContentEl.appendChild(menuBarEl);
  sheetContentEl.appendChild(progressBarEl);
  sheetContentEl.appendChild(stopListWrapper);
  sheetContentEl.appendChild(cardEl);

  // Map pane goes directly in container
  container.appendChild(mapPane);

  // Bottom sheet wraps the sheet content
  const sheet = new BottomSheet(container, sheetContentEl);

  return {
    mapPanel: null,
    sheet,
    sheetContentEl,
    resetScrollHint: null,
    cardEl,
    stopListWrapper,
    stopListEl,
  };
}
