import type { BottomSheet } from './BottomSheet';
import type { MapPanel } from './MapPanel';

export interface LayoutComponents {
  /** Mobile-only: map panel wrapping the map pane */
  mapPanel: MapPanel | null;
  /** Desktop-only: bottom sheet side panel */
  sheet: BottomSheet | null;
  /** Desktop-only: sheet content element for appending overview controls */
  sheetContentEl: HTMLElement | null;
  /** Mobile-only: resets the scroll hint to visible */
  resetScrollHint: (() => void) | null;
  /** The card element (shared) */
  cardEl: HTMLElement;
  /** Stop list wrapper element */
  stopListWrapper: HTMLElement;
  /** Stop list element */
  stopListEl: HTMLElement;
}
