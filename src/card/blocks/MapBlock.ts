import type { MapBlock } from '../../types';

/**
 * Renders a placeholder for an inline map view.
 * The actual map pane is moved into this container by the journey handler.
 */
export function renderMapBlock(block: MapBlock): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-card__map-embed';
  el.style.height = `${block.height ?? 200}px`;
  if (block.zoom != null) el.dataset.zoom = String(block.zoom);
  if (block.offset_x != null) el.dataset.offsetX = String(block.offset_x);
  if (block.offset_y != null) el.dataset.offsetY = String(block.offset_y);
  return el;
}
