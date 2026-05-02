import { describe, it, expect } from 'vitest';
import { renderImageBlock } from '../../src/card/blocks/ImageBlock';
import { renderAudioBlock } from '../../src/card/blocks/AudioBlock';
import { renderVideoBlock } from '../../src/card/blocks/VideoBlock';
import { renderGalleryBlock } from '../../src/card/blocks/GalleryBlock';
import { renderMapBlock } from '../../src/card/blocks/MapBlock';
import type {
  ImageBlock,
  AudioBlock,
  VideoBlock,
  GalleryBlock,
  MapBlock,
} from '../../src/types';

describe('renderImageBlock', () => {
  function makeBlock(overrides: Partial<ImageBlock> = {}): ImageBlock {
    return { type: 'image', url: 'https://example.com/photo.jpg', ...overrides };
  }

  it('renders a figure with the correct class names', () => {
    const el = renderImageBlock(makeBlock());
    expect(el.tagName).toBe('FIGURE');
    expect(el.className).toBe('maptour-block maptour-block--image');
  });

  it('renders an img with src, alt, lazy loading, and class', () => {
    const el = renderImageBlock(makeBlock());
    const img = el.querySelector('img')!;
    expect(img.src).toBe('https://example.com/photo.jpg');
    expect(img.alt).toBe('');
    expect(img.className).toBe('maptour-image');
    expect(img.loading).toBe('lazy');
  });

  it('uses alt text when provided', () => {
    const el = renderImageBlock(makeBlock({ alt: 'A sunset' }));
    const img = el.querySelector('img')!;
    expect(img.alt).toBe('A sunset');
  });

  it('falls back to caption for alt when alt is absent', () => {
    const el = renderImageBlock(makeBlock({ caption: 'Sunset over the lake' }));
    const img = el.querySelector('img')!;
    expect(img.alt).toBe('Sunset over the lake');
  });

  it('applies default padding of 5% when padding fields are absent', () => {
    const el = renderImageBlock(makeBlock());
    // jsdom normalises "5% 5%" to shorthand "5%"
    expect(el.style.padding).toBe('5%');
  });

  it('applies custom padding when specified', () => {
    const el = renderImageBlock(makeBlock({ padding_x: 10, padding_y: 0 }));
    expect(el.style.padding).toBe('0% 10%');
  });

  it('does not render a figcaption when caption is absent', () => {
    const el = renderImageBlock(makeBlock());
    expect(el.querySelector('figcaption')).toBeNull();
  });

  it('renders caption below the image by default', () => {
    const el = renderImageBlock(makeBlock({ caption: 'Nice view' }));
    const caption = el.querySelector('figcaption')!;
    expect(caption.className).toBe('maptour-image__caption');
    expect(caption.textContent).toBe('Nice view');
    // caption should come after the img
    const children = Array.from(el.children);
    const imgIndex = children.indexOf(el.querySelector('img')!);
    const capIndex = children.indexOf(caption);
    expect(capIndex).toBeGreaterThan(imgIndex);
  });

  it('renders caption above the image when caption_position is "above"', () => {
    const el = renderImageBlock(makeBlock({ caption: 'Title', caption_position: 'above' }));
    const caption = el.querySelector('figcaption')!;
    const children = Array.from(el.children);
    const imgIndex = children.indexOf(el.querySelector('img')!);
    const capIndex = children.indexOf(caption);
    expect(capIndex).toBeLessThan(imgIndex);
  });
});

describe('renderAudioBlock', () => {
  function makeBlock(overrides: Partial<AudioBlock> = {}): AudioBlock {
    return { type: 'audio', url: 'https://example.com/clip.mp3', ...overrides };
  }

  it('renders a div with the correct class names', () => {
    const el = renderAudioBlock(makeBlock());
    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('maptour-block maptour-block--audio');
  });

  it('renders an audio element with controls and a source', () => {
    const el = renderAudioBlock(makeBlock());
    const audio = el.querySelector('audio')!;
    expect(audio.controls).toBe(true);
    expect(audio.className).toBe('maptour-audio');
    const source = audio.querySelector('source')!;
    expect(source.src).toBe('https://example.com/clip.mp3');
  });

  it('uses "Audio" as default aria-label when label is absent', () => {
    const el = renderAudioBlock(makeBlock());
    const audio = el.querySelector('audio')!;
    expect(audio.getAttribute('aria-label')).toBe('Audio');
  });

  it('does not render a label paragraph when label is absent', () => {
    const el = renderAudioBlock(makeBlock());
    expect(el.querySelector('.maptour-audio__label')).toBeNull();
  });

  it('renders label paragraph and uses it as aria-label when present', () => {
    const el = renderAudioBlock(makeBlock({ label: 'Birdsong' }));
    const labelEl = el.querySelector('.maptour-audio__label')!;
    expect(labelEl.textContent).toBe('Birdsong');
    const audio = el.querySelector('audio')!;
    expect(audio.getAttribute('aria-label')).toBe('Birdsong');
  });
});

describe('renderVideoBlock', () => {
  function makeBlock(overrides: Partial<VideoBlock> = {}): VideoBlock {
    return { type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', ...overrides };
  }

  it('renders a div with the correct class names', () => {
    const el = renderVideoBlock(makeBlock());
    expect(el.className).toBe('maptour-block maptour-block--video');
  });

  describe('YouTube URL (inactive / placeholder)', () => {
    it('renders a placeholder with thumbnail and play button', () => {
      const el = renderVideoBlock(makeBlock(), false);
      const placeholder = el.querySelector('.maptour-video-placeholder')!;
      expect(placeholder).not.toBeNull();
      expect(placeholder.getAttribute('data-youtube-id')).toBe('dQw4w9WgXcQ');

      const thumb = placeholder.querySelector('.maptour-video-placeholder__thumb') as HTMLImageElement;
      expect(thumb.src).toContain('dQw4w9WgXcQ');
      expect(thumb.loading).toBe('lazy');

      const playBtn = placeholder.querySelector('.maptour-video-placeholder__play')!;
      expect(playBtn.getAttribute('aria-label')).toBe('Play video');
    });

    it('uses caption as thumbnail alt text when provided', () => {
      const el = renderVideoBlock(makeBlock({ caption: 'My video' }), false);
      const thumb = el.querySelector('.maptour-video-placeholder__thumb') as HTMLImageElement;
      expect(thumb.alt).toBe('My video');
    });

    it('falls back to default alt text when caption is absent', () => {
      const el = renderVideoBlock(makeBlock(), false);
      const thumb = el.querySelector('.maptour-video-placeholder__thumb') as HTMLImageElement;
      expect(thumb.alt).toBe('YouTube video thumbnail');
    });
  });

  describe('YouTube URL (active)', () => {
    it('renders an iframe embed directly', () => {
      const el = renderVideoBlock(makeBlock(), true);
      const iframe = el.querySelector('iframe')!;
      expect(iframe).not.toBeNull();
      expect(iframe.src).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0');
      expect(iframe.allowFullscreen).toBe(true);
      expect(iframe.getAttribute('loading')).toBe('lazy');
    });

    it('uses caption as iframe title when provided', () => {
      const el = renderVideoBlock(makeBlock({ caption: 'Tour intro' }), true);
      const iframe = el.querySelector('iframe')!;
      expect(iframe.title).toBe('Tour intro');
    });

    it('falls back to default title when caption is absent', () => {
      const el = renderVideoBlock(makeBlock(), true);
      const iframe = el.querySelector('iframe')!;
      expect(iframe.title).toBe('YouTube video');
    });
  });

  describe('YouTube URL formats', () => {
    it('extracts ID from youtu.be short URLs', () => {
      const el = renderVideoBlock(makeBlock({ url: 'https://youtu.be/dQw4w9WgXcQ' }), true);
      const iframe = el.querySelector('iframe')!;
      expect(iframe.src).toContain('dQw4w9WgXcQ');
    });

    it('extracts ID from embed URLs', () => {
      const el = renderVideoBlock(makeBlock({ url: 'https://youtube.com/embed/dQw4w9WgXcQ' }), true);
      const iframe = el.querySelector('iframe')!;
      expect(iframe.src).toContain('dQw4w9WgXcQ');
    });
  });

  describe('non-YouTube URL', () => {
    it('renders a link instead of a player', () => {
      const el = renderVideoBlock(makeBlock({ url: 'https://example.com/video.mp4' }));
      const link = el.querySelector('a.maptour-video-link')!;
      expect(link.getAttribute('href')).toBe('https://example.com/video.mp4');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('uses caption as link text when provided', () => {
      const el = renderVideoBlock(makeBlock({ url: 'https://example.com/v.mp4', caption: 'Behind the scenes' }));
      const link = el.querySelector('a')!;
      expect(link.textContent).toBe('Behind the scenes');
    });

    it('uses default link text when caption is absent', () => {
      const el = renderVideoBlock(makeBlock({ url: 'https://example.com/v.mp4' }));
      const link = el.querySelector('a')!;
      expect(link.textContent).toBe('Watch video');
    });
  });

  describe('caption rendering', () => {
    it('renders a caption paragraph for YouTube videos with caption', () => {
      const el = renderVideoBlock(makeBlock({ caption: 'Great clip' }));
      const caption = el.querySelector('.maptour-video__caption')!;
      expect(caption.textContent).toBe('Great clip');
    });

    it('does not render a caption paragraph for YouTube videos without caption', () => {
      const el = renderVideoBlock(makeBlock());
      expect(el.querySelector('.maptour-video__caption')).toBeNull();
    });

    it('does not render a caption paragraph for non-YouTube videos even with caption', () => {
      const el = renderVideoBlock(makeBlock({ url: 'https://example.com/v.mp4', caption: 'Nope' }));
      expect(el.querySelector('.maptour-video__caption')).toBeNull();
    });
  });
});

describe('renderGalleryBlock', () => {
  function makeBlock(overrides: Partial<GalleryBlock> = {}): GalleryBlock {
    return {
      type: 'gallery',
      images: [
        { url: 'https://example.com/a.jpg' },
        { url: 'https://example.com/b.jpg', caption: 'Second image', alt: 'Alt B' },
      ],
      ...overrides,
    };
  }

  it('renders a div with the correct class names', () => {
    const el = renderGalleryBlock(makeBlock());
    expect(el.className).toBe('maptour-block maptour-block--gallery');
  });

  it('renders a gallery track with correct role and aria-label', () => {
    const el = renderGalleryBlock(makeBlock());
    const track = el.querySelector('.maptour-gallery')!;
    expect(track.getAttribute('role')).toBe('group');
    expect(track.getAttribute('aria-label')).toBe('Image gallery');
  });

  it('renders one slide per image', () => {
    const el = renderGalleryBlock(makeBlock());
    const slides = el.querySelectorAll('.maptour-gallery__slide');
    expect(slides).toHaveLength(2);
  });

  it('uses alt text when provided, falls back to caption, then to index-based default', () => {
    const el = renderGalleryBlock(makeBlock());
    const images = el.querySelectorAll('.maptour-gallery__image') as NodeListOf<HTMLImageElement>;
    // First image: no alt, no caption -> fallback
    expect(images[0].alt).toBe('Gallery image 1');
    // Second image: has alt
    expect(images[1].alt).toBe('Alt B');
  });

  it('falls back to caption for alt when alt is absent but caption is present', () => {
    const el = renderGalleryBlock(makeBlock({
      images: [{ url: 'https://example.com/c.jpg', caption: 'Caption C' }],
    }));
    const img = el.querySelector('.maptour-gallery__image') as HTMLImageElement;
    expect(img.alt).toBe('Caption C');
  });

  it('renders figcaption only for images that have a caption', () => {
    const el = renderGalleryBlock(makeBlock());
    const slides = el.querySelectorAll('.maptour-gallery__slide');
    // First slide: no caption
    expect(slides[0].querySelector('.maptour-gallery__caption')).toBeNull();
    // Second slide: has caption
    const caption = slides[1].querySelector('.maptour-gallery__caption')!;
    expect(caption.textContent).toBe('Second image');
  });

  it('renders a counter when there are multiple images', () => {
    const el = renderGalleryBlock(makeBlock());
    const counter = el.querySelector('.maptour-gallery__counter')!;
    expect(counter).not.toBeNull();
    expect(counter.getAttribute('aria-live')).toBe('polite');
    expect(counter.textContent).toBe('1 / 2');
  });

  it('does not render a counter for a single image', () => {
    const el = renderGalleryBlock(makeBlock({
      images: [{ url: 'https://example.com/solo.jpg' }],
    }));
    expect(el.querySelector('.maptour-gallery__counter')).toBeNull();
  });

  it('sets lazy loading on gallery images', () => {
    const el = renderGalleryBlock(makeBlock());
    const images = el.querySelectorAll('.maptour-gallery__image') as NodeListOf<HTMLImageElement>;
    for (const img of images) {
      expect(img.loading).toBe('lazy');
    }
  });
});

describe('renderMapBlock', () => {
  function makeBlock(overrides: Partial<MapBlock> = {}): MapBlock {
    return { type: 'map', ...overrides };
  }

  it('renders a div with the correct class name', () => {
    const el = renderMapBlock(makeBlock());
    expect(el.className).toBe('maptour-card__map-embed');
  });

  it('defaults to 200px height when height is not specified', () => {
    const el = renderMapBlock(makeBlock());
    expect(el.style.height).toBe('200px');
  });

  it('uses custom height when specified', () => {
    const el = renderMapBlock(makeBlock({ height: 400 }));
    expect(el.style.height).toBe('400px');
  });

  it('does not set data attributes when optional fields are absent', () => {
    const el = renderMapBlock(makeBlock());
    expect(el.dataset.zoom).toBeUndefined();
    expect(el.dataset.offsetX).toBeUndefined();
    expect(el.dataset.offsetY).toBeUndefined();
  });

  it('sets data-zoom when zoom is provided', () => {
    const el = renderMapBlock(makeBlock({ zoom: 15 }));
    expect(el.dataset.zoom).toBe('15');
  });

  it('sets data-offset-x and data-offset-y when offsets are provided', () => {
    const el = renderMapBlock(makeBlock({ offset_x: 100, offset_y: -50 }));
    expect(el.dataset.offsetX).toBe('100');
    expect(el.dataset.offsetY).toBe('-50');
  });

  it('sets data attributes for zero values', () => {
    const el = renderMapBlock(makeBlock({ zoom: 0, offset_x: 0, offset_y: 0 }));
    expect(el.dataset.zoom).toBe('0');
    expect(el.dataset.offsetX).toBe('0');
    expect(el.dataset.offsetY).toBe('0');
  });
});

import { renderBlock } from '../../src/card/blocks/renderBlock';
import { renderTextBlock } from '../../src/card/blocks/TextBlock';

describe('renderBlock dispatcher (TOUR-050)', () => {
  it('dispatches text blocks to renderTextBlock', () => {
    const el = renderBlock({ type: 'text', body: 'hello' }, true);
    expect(el.classList.contains('maptour-block--text')).toBe(true);
  });

  it('dispatches image blocks', () => {
    const el = renderBlock({ type: 'image', url: 'x.jpg' }, true);
    expect(el.classList.contains('maptour-block--image')).toBe(true);
  });

  it('dispatches gallery blocks', () => {
    const el = renderBlock({ type: 'gallery', images: [{ url: 'a.jpg' }] }, true);
    expect(el.classList.contains('maptour-block--gallery')).toBe(true);
  });

  it('dispatches video blocks (passes active flag through)', () => {
    const el = renderBlock({ type: 'video', url: 'https://youtube.com/watch?v=x' }, true);
    expect(el.classList.contains('maptour-block--video')).toBe(true);
  });

  it('dispatches audio blocks', () => {
    const el = renderBlock({ type: 'audio', url: 'a.mp3' }, true);
    expect(el.classList.contains('maptour-block--audio')).toBe(true);
  });

  it('dispatches map blocks', () => {
    const el = renderBlock({ type: 'map' }, true);
    // MapBlock is a card-level map embed placeholder, not a maptour-block-- variant.
    expect(el.classList.contains('maptour-card__map-embed')).toBe(true);
  });
});

describe('TextBlock — async marked path (TOUR-050)', () => {
  it('renders inline markdown synchronously (sync branch)', () => {
    const el = renderTextBlock({ type: 'text', body: '**bold**' });
    expect(el.innerHTML).toContain('<strong>');
  });

  it('handles a Promise return from marked.parse via the loading shim', async () => {
    // The async branch is only entered when marked.parse returns a Promise.
    // Force it by stubbing marked.parse for this test.
    const marked = await import('marked');
    const original = marked.marked.parse;
    const html = '<p>delayed content</p>';
    // @ts-expect-error monkey patch for branch coverage
    marked.marked.parse = vi.fn(() => Promise.resolve(html));
    try {
      const el = renderTextBlock({ type: 'text', body: 'irrelevant' });
      // Loading shim renders synchronously
      expect(el.innerHTML).toContain('Loading');
      // Flush the microtask queue so the inner .then() callback runs.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(el.innerHTML).toContain('delayed content');
    } finally {
      // @ts-expect-error restore
      marked.marked.parse = original;
    }
  });
});

describe('Image/Audio/Gallery onerror handlers (TOUR-050)', () => {
  it('ImageBlock onerror replaces the image with a placeholder', () => {
    const el = renderBlock({ type: 'image', url: 'broken.jpg', alt: 'alt text' }, true) as HTMLElement;
    const img = el.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    expect(el.querySelector('.maptour-image-placeholder')).not.toBeNull();
    expect(img.style.display).toBe('none');
  });

  it('AudioBlock onerror replaces the player with a fallback message', () => {
    const el = renderBlock({ type: 'audio', url: 'broken.mp3', label: 'Test' }, true) as HTMLElement;
    const audio = el.querySelector('audio') as HTMLAudioElement;
    audio.dispatchEvent(new Event('error'));
    expect(el.querySelector('.maptour-audio-error')).not.toBeNull();
    expect(audio.style.display).toBe('none');
  });

  it('GalleryBlock image onerror replaces with a placeholder', () => {
    const el = renderBlock({
      type: 'gallery',
      images: [{ url: 'broken.jpg', alt: 'one' }, { url: 'good.jpg' }],
    }, true) as HTMLElement;
    const imgs = el.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    imgs[0].dispatchEvent(new Event('error'));
    // Existing gallery uses placeholder swap on error
    expect(el.querySelector('.maptour-image-placeholder, .maptour-gallery__placeholder')).not.toBeNull();
  });
});
