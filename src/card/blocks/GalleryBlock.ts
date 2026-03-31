import type { GalleryBlock as GalleryBlockType } from '../../types';
import { t } from '../../i18n';

export function renderGalleryBlock(block: GalleryBlockType): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-block maptour-block--gallery';

  const track = document.createElement('div');
  track.className = 'maptour-gallery';
  track.setAttribute('role', 'group');
  track.setAttribute('aria-label', 'Image gallery');

  block.images.forEach((image, index) => {
    const slide = document.createElement('figure');
    slide.className = 'maptour-gallery__slide';

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.alt ?? image.caption ?? `Gallery image ${index + 1}`;
    img.className = 'maptour-gallery__image';
    img.loading = 'lazy';

    img.onerror = () => {
      img.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.className = 'maptour-image-placeholder';
      placeholder.textContent = t('image_error');
      slide.insertBefore(placeholder, img);
    };

    slide.appendChild(img);

    if (image.caption) {
      const caption = document.createElement('figcaption');
      caption.className = 'maptour-gallery__caption';
      caption.textContent = image.caption;
      slide.appendChild(caption);
    }

    track.appendChild(slide);
  });

  el.appendChild(track);

  if (block.images.length > 1) {
    const counter = document.createElement('div');
    counter.className = 'maptour-gallery__counter';
    counter.setAttribute('aria-live', 'polite');
    counter.textContent = t('gallery_counter', { n: 1, total: block.images.length });

    // Update counter on scroll
    track.addEventListener('scroll', () => {
      const slideWidth = track.clientWidth;
      if (slideWidth > 0) {
        const current = Math.round(track.scrollLeft / slideWidth) + 1;
        counter.textContent = t('gallery_counter', { n: current, total: block.images.length });
      }
    });

    el.appendChild(counter);
  }

  return el;
}
