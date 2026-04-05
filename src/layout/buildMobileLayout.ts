import { MapPanel } from './MapPanel';
import { t } from '../i18n';
import type { LayoutComponents } from './types';

export interface MobileLayoutDeps {
  container: HTMLElement;
  mapPane: HTMLElement;
  menuBarEl: HTMLElement;
}

export function buildMobileLayout(deps: MobileLayoutDeps): LayoutComponents {
  const { container, mapPane, menuBarEl } = deps;

  // Card element
  const cardEl = document.createElement('div');
  cardEl.className = 'maptour-card';

  // Stop list
  const stopListWrapper = document.createElement('div');
  stopListWrapper.className = 'maptour-stop-list-wrapper';
  const stopListEl = document.createElement('div');
  stopListEl.id = 'maptour-stop-list';
  stopListWrapper.appendChild(stopListEl);

  // Card view — wraps stop list and card
  const cardView = document.createElement('div');
  cardView.className = 'maptour-card-view';
  cardView.appendChild(stopListWrapper);
  cardView.appendChild(cardEl);

  // Scroll hint
  const scrollHint = document.createElement('div');
  scrollHint.className = 'maptour-scroll-hint';
  const usesContrast = window.matchMedia?.('(prefers-contrast: more)').matches;
  if (usesContrast) {
    scrollHint.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i> ' + t('scroll_more');
  }
  cardView.appendChild(scrollHint);

  // Scroll hint behaviour
  const updateScrollHint = () => {
    const scrollable = cardEl;
    const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 10;
    const hasOverflow = scrollable.scrollHeight > scrollable.clientHeight + 10;
    if (!hasOverflow || scrollable.scrollTop > 20 || atBottom) {
      scrollHint.classList.add('maptour-scroll-hint--hidden');
    } else {
      scrollHint.classList.remove('maptour-scroll-hint--hidden');
    }
  };
  cardEl.addEventListener('scroll', updateScrollHint, { passive: true });
  const cardContentObserver = new MutationObserver(() => {
    requestAnimationFrame(updateScrollHint);
  });
  cardContentObserver.observe(cardEl, { childList: true, subtree: true });
  const resetScrollHint = () => {
    scrollHint.classList.remove('maptour-scroll-hint--hidden');
    requestAnimationFrame(updateScrollHint);
  };

  // Auto-hide menu bar on scroll down, show on scroll up
  let lastScrollTop = 0;
  cardView.addEventListener('scroll', () => {
    const st = cardView.scrollTop;
    if (st > lastScrollTop && st > 56) {
      // Scrolling down — hide menu bar
      menuBarEl.classList.add('maptour-menu-bar--hidden');
      cardView.classList.add('maptour-card-view--menu-hidden');
    } else {
      // Scrolling up or at top — show menu bar
      menuBarEl.classList.remove('maptour-menu-bar--hidden');
      cardView.classList.remove('maptour-card-view--menu-hidden');
    }
    lastScrollTop = Math.max(0, st);
  }, { passive: true });

  container.appendChild(cardView);

  // Map panel
  const mapPanel = new MapPanel(container, mapPane);


  return {
    mapPanel,
    sheet: null,
    sheetContentEl: null,
    resetScrollHint,
    cardEl,
    stopListWrapper,
    stopListEl,
  };
}
