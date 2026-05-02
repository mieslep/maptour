import { describe, it, expect, beforeEach } from 'vitest';
import { GuidanceBanner } from '../../src/waypoint/GuidanceBanner';
import type { Waypoint } from '../../src/types';

function makeWaypoint(overrides: Partial<Waypoint> = {}): Waypoint {
  return {
    coords: [51.5, -0.1],
    text: 'Turn left at the fountain',
    ...overrides,
  };
}

describe('GuidanceBanner', () => {
  let banner: GuidanceBanner;

  beforeEach(() => {
    banner = new GuidanceBanner();
  });

  it('creates the correct element structure', () => {
    const el = banner.getElement();
    expect(el.className).toBe('maptour-guidance-banner');
    expect(el.hidden).toBe(true);
    expect(el.children).toHaveLength(2);

    const photo = el.children[0] as HTMLImageElement;
    expect(photo.tagName).toBe('IMG');
    expect(photo.className).toBe('maptour-guidance-banner__photo');
    expect(photo.hidden).toBe(true);

    const text = el.children[1] as HTMLElement;
    expect(text.className).toBe('maptour-guidance-banner__text');
  });

  it('setWaypoint updates text', () => {
    const wp = makeWaypoint({ text: 'Cross the bridge' });
    banner.setWaypoint(wp);

    const text = banner.getElement().querySelector('.maptour-guidance-banner__text')!;
    expect(text.textContent).toBe('Cross the bridge');
    expect(banner.getElement().hidden).toBe(false);
  });

  it('setWaypoint with photo shows the image', () => {
    const wp = makeWaypoint({ photo: 'https://example.com/photo.jpg' });
    banner.setWaypoint(wp);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.hidden).toBe(false);
    expect(photo.src).toBe('https://example.com/photo.jpg');
  });

  it('setWaypoint without photo hides the image', () => {
    const wp = makeWaypoint();
    banner.setWaypoint(wp);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.hidden).toBe(true);
    expect(photo.hasAttribute('src')).toBe(false);
  });

  it('hide() and show() toggle visibility', () => {
    const wp = makeWaypoint();
    banner.setWaypoint(wp);
    expect(banner.getElement().hidden).toBe(false);

    banner.hide();
    expect(banner.getElement().hidden).toBe(true);

    banner.show();
    expect(banner.getElement().hidden).toBe(false);
  });

  it('renders {dot} shortcode in waypoint text as a maptour-dot span (TOUR-045)', () => {
    const wp = makeWaypoint({ text: 'Head towards the {dot} on the bridge' });
    banner.setWaypoint(wp);

    const text = banner.getElement().querySelector('.maptour-guidance-banner__text')!;
    const dot = text.querySelector('.maptour-dot');
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute('aria-label')).toBe('waypoint marker');
    expect(text.textContent).toContain('Head towards the');
    expect(text.textContent).toContain('on the bridge');
  });

  it('escapes HTML in waypoint text while preserving {dot} substitution (TOUR-045)', () => {
    const wp = makeWaypoint({ text: 'Pass <script>x</script> the {dot}' });
    banner.setWaypoint(wp);

    const text = banner.getElement().querySelector('.maptour-guidance-banner__text')!;
    expect(text.querySelector('script')).toBeNull();
    expect(text.querySelector('.maptour-dot')).not.toBeNull();
    expect(text.innerHTML).toContain('&lt;script&gt;');
  });

  it('strips {dot} from photo alt text so screen readers do not announce it (TOUR-045)', () => {
    const wp = makeWaypoint({ text: 'Towards the {dot} bridge', photo: 'https://example.com/p.jpg' });
    banner.setWaypoint(wp);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.alt).toBe('Towards the bridge');
  });

  describe('photo modal (TOUR-049)', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      banner = new GuidanceBanner();
      // Wrap in a container so showPhotoModal's closest() lookup has a target.
      const container = document.createElement('div');
      container.className = 'maptour-container';
      container.appendChild(banner.getElement());
      document.body.appendChild(container);
    });

    it('clicking the photo opens a modal with the same source', () => {
      const wp = makeWaypoint({ photo: 'https://example.com/p.jpg' });
      banner.setWaypoint(wp);
      const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
      photo.click();

      const modal = document.querySelector('.maptour-photo-modal');
      expect(modal).not.toBeNull();
      const modalImg = modal!.querySelector('.maptour-photo-modal__img') as HTMLImageElement;
      expect(modalImg.src).toBe('https://example.com/p.jpg');
    });

    it('clicking the close button removes the modal', () => {
      const wp = makeWaypoint({ photo: 'https://example.com/p.jpg' });
      banner.setWaypoint(wp);
      (banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement).click();

      const closeBtn = document.querySelector('.maptour-photo-modal__close') as HTMLButtonElement;
      closeBtn.click();
      expect(document.querySelector('.maptour-photo-modal')).toBeNull();
    });

    it('clicking the backdrop (outside the image) removes the modal', () => {
      const wp = makeWaypoint({ photo: 'https://example.com/p.jpg' });
      banner.setWaypoint(wp);
      (banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement).click();

      const backdrop = document.querySelector('.maptour-photo-modal') as HTMLElement;
      // Click event with target === backdrop closes
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: backdrop });
      backdrop.dispatchEvent(event);
      expect(document.querySelector('.maptour-photo-modal')).toBeNull();
    });

    it('clicking inside the image does NOT close the modal', () => {
      const wp = makeWaypoint({ photo: 'https://example.com/p.jpg' });
      banner.setWaypoint(wp);
      (banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement).click();

      const img = document.querySelector('.maptour-photo-modal__img') as HTMLImageElement;
      img.click();  // bubbles to backdrop but target is the img, not the backdrop
      expect(document.querySelector('.maptour-photo-modal')).not.toBeNull();
    });

    it('does nothing when there is no photo source', () => {
      const wp = makeWaypoint();  // no photo
      banner.setWaypoint(wp);
      // Force a click on the (hidden) photo element anyway
      (banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement).click();
      expect(document.querySelector('.maptour-photo-modal')).toBeNull();
    });

    it('appends the modal to document.body when no maptour-container ancestor exists', () => {
      // Detach the banner from its container so closest() fails.
      const standalone = new GuidanceBanner();
      document.body.appendChild(standalone.getElement());
      const wp = makeWaypoint({ photo: 'https://example.com/p.jpg' });
      standalone.setWaypoint(wp);
      (standalone.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement).click();

      const modal = document.querySelector('.maptour-photo-modal');
      expect(modal?.parentElement).toBe(document.body);
    });
  });

  it('switching from photo waypoint to text-only hides photo', () => {
    const withPhoto = makeWaypoint({ photo: 'https://example.com/a.jpg' });
    banner.setWaypoint(withPhoto);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.hidden).toBe(false);

    const textOnly = makeWaypoint({ text: 'No photo here' });
    banner.setWaypoint(textOnly);

    expect(photo.hidden).toBe(true);
    expect(photo.hasAttribute('src')).toBe(false);
  });
});
