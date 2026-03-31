import type { ImageBlock as ImageBlockType } from '../../types';
import { t } from '../../i18n';

export function renderImageBlock(block: ImageBlockType): HTMLElement {
  const el = document.createElement('figure');
  el.className = 'maptour-block maptour-block--image';

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

  el.appendChild(img);

  if (block.caption) {
    const caption = document.createElement('figcaption');
    caption.className = 'maptour-image__caption';
    caption.textContent = block.caption;
    el.appendChild(caption);
  }

  return el;
}
