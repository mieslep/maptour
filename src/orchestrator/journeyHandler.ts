import type { Tour } from '../types';
import type { JourneyState } from '../journey/JourneyStateManager';
import type { TourSession } from '../session/TourSession';
import type { MapView } from '../map/MapView';
import type { NavController } from '../navigation/NavController';
import type { BottomSheet } from '../layout/BottomSheet';
import type { MapPanel } from '../layout/MapPanel';
import type { MenuBar } from '../layout/MenuBar';
import type { ProgressBar } from '../layout/ProgressBar';
import type { OverviewControls } from '../layout/OverviewControls';
import type { StopListOverlay } from '../layout/StopListOverlay';
import type { InTransitBar } from '../layout/InTransitBar';

export interface JourneyHandlerDeps {
  tour: Tour;
  session: TourSession;
  mapView: MapView;
  navController: NavController;
  sheet: BottomSheet | null;
  mapPanel: MapPanel | null;
  menuBar: MenuBar;
  progressBar: ProgressBar;
  overviewControls: OverviewControls;
  stopListOverlay: StopListOverlay;
  transitBar: InTransitBar;
  sheetContentEl: HTMLElement | null;
  isMobile: boolean;
  setStopListOpen: (open: boolean) => void;
  setViewingSystemCard: (card: string | null) => void;
  renderWelcome: () => void;
  renderGoodbye: () => void;
  onStopActivated?: (stopIndex: number) => void;
  onOverviewEnter?: () => void;
}

/**
 * Creates the journey state change handler.
 *
 * For `at_stop`: handles layout transitions, then delegates to navController.goTo()
 * which triggers the onNavigate callback for card rendering and component updates.
 */
export function createJourneyHandler(deps: JourneyHandlerDeps): (state: JourneyState, stopIndex: number) => void {
  const {
    tour, session, mapView, navController,
    sheet, mapPanel, menuBar, progressBar, overviewControls,
    stopListOverlay, transitBar, sheetContentEl,
    isMobile, setStopListOpen, setViewingSystemCard,
    renderWelcome, renderGoodbye, onStopActivated, onOverviewEnter,
  } = deps;

  return (state: JourneyState, stopIndex: number) => {
    transitBar.hide();
    mapView.setPulsingPin(null);
    setViewingSystemCard(null);

    if (state === 'tour_start') {
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      mapView.setMapPadding(0);
      mapView.fitBounds();
      progressBar.hide();

      session.reset();
      onOverviewEnter?.();
      if (mapPanel) mapPanel.setHeaderVisible(false);
      mapView.setOverviewMode(true);
      mapView.setChevronDirection(false);
      mapView.setSelectedPin(tour.stops[0].id);
      mapView.setEndPin(tour.stops[session.endIndex].id);
      mapView.setPinNumberMap(null);
      overviewControls.update(0, tour.stops.length, false, tour.stops[0].title);
      overviewControls.show();
      stopListOverlay.update(tour.stops, 0, session.getVisited(), session.tourOrder);

      if (!isMobile && sheetContentEl) {
        const ocEl = overviewControls.getElement();
        if (!sheetContentEl.contains(ocEl)) sheetContentEl.appendChild(ocEl);
        mapView.triggerSequencePulse();
      }

      renderWelcome();
      mapView.setActiveStop(tour.stops[0]);

    } else if (state === 'at_stop') {
      // Layout transitions
      mapView.setOverviewMode(false);
      overviewControls.hide();
      menuBar.getElement().style.display = '';
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) {
        mapPanel.setHeaderVisible(true);
        mapPanel.hide();
      }
      setStopListOpen(false);
      mapView.setMapPadding(0);
      progressBar.show();

      // Delegate card rendering and component updates to navController → onNavigate
      navController.goTo(stopIndex);
      onStopActivated?.(stopIndex);

    } else if (state === 'in_transit') {
      mapView.setOverviewMode(false);
      overviewControls.hide();
      if (sheet) sheet.setPosition('collapsed', true);
      const nextIndex = session.reversed
        ? Math.max(stopIndex - 1, 0)
        : Math.min(stopIndex + 1, tour.stops.length - 1);
      const nextStop = tour.stops[nextIndex];
      const nextDisplayNum = session.reversed ? (tour.stops.length - nextIndex) : (nextIndex + 1);
      transitBar.show(nextDisplayNum, nextStop.title);
      mapView.setPulsingPin(nextStop.id);
      progressBar.show();
      progressBar.setPrevDisabled(true);
      progressBar.setNextDisabled(true);
      onStopActivated?.(stopIndex);

    } else if (state === 'tour_complete') {
      mapView.setOverviewMode(false);
      overviewControls.hide();
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      mapView.setMapPadding(0);
      progressBar.hide();
      renderGoodbye();
    }
  };
}
