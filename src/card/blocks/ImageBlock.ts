import type { ImageBlock as ImageBlockType } from '../../types';
import { t } from '../../i18n';

export function renderImageBlock(block: ImageBlockType): HTMLElement {
  const el = document.createElement('figure');
  el.className = 'maptour-block maptour-block--image';

  const py = block.padding_y ?? 5;
  const px = block.padding_x ?? 5;
  el.style.padding = `${py}% ${px}%`;

  const img = document.createElement('img');
  img.src = block.url;
  img.alt = block.alt ?? block.caption ?? '';
  img.className = 'maptour-image';
  img.loading = 'lazy';

  img.onerror = () => {
    img.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'maptour-image-placeholder';
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', `Image unavailable: ${img.alt || block.url}`);
    placeholder.textContent = t('image_error');
    el.insertBefore(placeholder, img);
  };

  const makeCaptionEl = (): HTMLElement | null => {
    if (!block.caption) return null;
    const caption = document.createElement('figcaption');
    caption.className = 'maptour-image__caption';
    caption.textContent = block.caption;
    return caption;
  };

  if (block.caption_position === 'above') {
    const cap = makeCaptionEl();
    if (cap) el.appendChild(cap);
  }

  el.appendChild(img);

  if (block.caption_position !== 'above') {
    const cap = makeCaptionEl();
    if (cap) el.appendChild(cap);
  }

  return el;
}
