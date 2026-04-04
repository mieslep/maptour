import { MapPanel } from './MapPanel';
import { t } from '../i18n';
import type { LayoutComponents } from './types';

export interface MobileLayoutDeps {
  container: HTMLElement;
  mapPane: HTMLElement;
  menuBarEl: HTMLElement;
  progressBarEl: HTMLElement;
}

export function buildMobileLayout(deps: MobileLayoutDeps): LayoutComponents {
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

  // Card view — wraps stop list and card
  const cardView = document.createElement('div');
  cardView.className = 'maptour-card-view';
  cardView.style.paddingTop = '56px';
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

  container.appendChild(cardView);

  // Map panel
  const mapPanel = new MapPanel(container, mapPane);

  // Card view padding observer — updates when progress bar shows/hides
  const updateCardViewPadding = () => {
    cardView.style.paddingTop = progressBarEl.hidden ? '56px' : '92px';
  };
  const progressObserver = new MutationObserver(updateCardViewPadding);
  progressObserver.observe(progressBarEl, { attributes: true, attributeFilter: ['hidden'] });

  // Map panel header position observer
  const updateMapPanelTop = () => {
    const panelHeader = container.querySelector('.maptour-map-panel__header') as HTMLElement | null;
    if (panelHeader) {
      panelHeader.style.top = progressBarEl.hidden ? '56px' : '92px';
    }
    const mapPaneInPanel = container.querySelector('.maptour-map-panel .maptour-map-pane') as HTMLElement | null;
    if (mapPaneInPanel) {
      mapPaneInPanel.style.top = progressBarEl.hidden ? '104px' : '140px';
    }
  };
  const mapPanelTopObserver = new MutationObserver(updateMapPanelTop);
  mapPanelTopObserver.observe(progressBarEl, { attributes: true, attributeFilter: ['hidden'] });

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
