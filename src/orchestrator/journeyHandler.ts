import type { Tour } from '../types';
import type { JourneyState } from '../journey/JourneyStateManager';
import type { TourSession } from '../session/TourSession';
import type { MapView } from '../map/MapView';
import type { NavController } from '../navigation/NavController';
import type { BottomSheet } from '../layout/BottomSheet';
import type { MapPanel } from '../layout/MapPanel';
import type { MenuBar } from '../layout/MenuBar';
import type { TourFooter } from '../layout/TourFooter';
import type { OverviewControls } from '../layout/OverviewControls';
import type { StopListOverlay } from '../layout/StopListOverlay';
import type { InTransitBar } from '../layout/InTransitBar';
import type { CardHost } from '../card/CardHost';
import type { JourneyCardRenderer } from '../card/JourneyCardRenderer';
import type { GuidanceBanner } from '../waypoint/GuidanceBanner';
import type { ArrivingBanner } from '../card/ArrivingBanner';
import { WaypointTracker } from '../waypoint/WaypointTracker';

export interface JourneyHandlerDeps {
  tour: Tour;
  session: TourSession;
  mapView: MapView;
  navController: NavController;
  sheet: BottomSheet | null;
  mapPanel: MapPanel | null;
  menuBar: MenuBar;
  tourFooter: TourFooter;
  overviewControls: OverviewControls;
  stopListOverlay: StopListOverlay;
  transitBar: InTransitBar;
  cardHost: CardHost;
  journeyCardRenderer: JourneyCardRenderer;
  guidanceBanner: GuidanceBanner;
  arrivingBanner: ArrivingBanner;
  sheetContentEl: HTMLElement | null;
  isMobile: boolean;
  setStopListOpen: (open: boolean) => void;
  setViewingSystemCard: (card: string | null) => void;
  renderWelcome: () => void;
  renderGoodbye: () => void;
  onStopActivated?: (stopIndex: number) => void;
  onOverviewEnter?: () => void;
  transitionToStop: (stopIndex: number) => void;
}

/**
 * Creates the journey state change handler.
 *
 * For `at_stop`: handles layout transitions, then delegates to navController.goTo()
 * which triggers the onNavigate callback for card rendering and component updates.
 *
 * For `in_transit`: if the destination stop has waypoints, enters waypoint transit mode.
 * Otherwise, shows the InTransitBar.
 */
export function createJourneyHandler(deps: JourneyHandlerDeps): (state: JourneyState, stopIndex: number) => void {
  const {
    tour, session, mapView, navController,
    sheet, mapPanel, menuBar, tourFooter, overviewControls,
    stopListOverlay, transitBar, cardHost, journeyCardRenderer,
    guidanceBanner, arrivingBanner, sheetContentEl,
    isMobile, setStopListOpen, setViewingSystemCard,
    renderWelcome, renderGoodbye, onStopActivated, onOverviewEnter,
    transitionToStop,
  } = deps;

  let activeWaypointTracker: WaypointTracker | null = null;

  // Wire "I'm here" button to advance the waypoint tracker
  tourFooter.onImHere(() => {
    if (activeWaypointTracker && !activeWaypointTracker.isComplete()) {
      activeWaypointTracker.advance();
    }
  });

  function cleanupWaypointTransit(): void {
    activeWaypointTracker = null;
    guidanceBanner.hide();
    mapView.clearWaypoints();
    tourFooter.exitWaypointMode();
    // On mobile, hide the map panel so the card view shows
    if (mapPanel) {
      mapPanel.hide();
    }
  }

  return (state: JourneyState, stopIndex: number) => {
    transitBar.hide();
    mapView.setPulsingPin(null);
    setViewingSystemCard(null);

    if (state === 'tour_start') {
      cleanupWaypointTransit();
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      mapView.setMapPadding(0);
      mapView.fitBounds();
      tourFooter.hide();

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
      cleanupWaypointTransit();
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
      tourFooter.show();

      // Delegate card rendering and component updates to navController → onNavigate
      navController.goTo(stopIndex);
      onStopActivated?.(stopIndex);

    } else if (state === 'in_transit') {
      // Determine the destination stop
      const currentStop = tour.stops[stopIndex];
      const nextIndex = session.reversed
        ? (stopIndex - 1 + tour.stops.length) % tour.stops.length
        : (stopIndex + 1) % tour.stops.length;
      const destinationStop = tour.stops[nextIndex];

      const waypoints = destinationStop.getting_here?.waypoints;

      if (waypoints && waypoints.length > 0) {
        // === Waypoint transit mode ===
        mapView.setOverviewMode(false);
        overviewControls.hide();
        if (sheet) sheet.setPosition('collapsed', true);
        // On mobile, show the map panel full-screen for waypoint navigation
        if (mapPanel) {
          mapPanel.setHeaderVisible(false);
          mapPanel.show();
          // Allow map to settle before zooming
          requestAnimationFrame(() => mapView.invalidateSize());
        }

        // Create waypoint tracker
        activeWaypointTracker = new WaypointTracker(waypoints, {
          onAdvance: (nextWaypoint) => {
            // Update map markers and zoom to next segment
            const progress = activeWaypointTracker!.getProgress();
            mapView.setWaypoints(waypoints, progress.current);
            const bounds = activeWaypointTracker!.getSegmentBounds();
            mapView.zoomToSegment(bounds.from, bounds.to);
            // Update guidance banner and footer
            guidanceBanner.setWaypoint(nextWaypoint);
            tourFooter.updateWaypointProgress(progress);
            tourFooter.show();
          },
          onJourneyCard: (waypoint, onDismiss) => {
            // Show journey card for this waypoint
            guidanceBanner.hide();
            tourFooter.hide();
            // On mobile, hide map panel so card view is visible
            if (mapPanel) mapPanel.hide();
            cardHost.render((c) => journeyCardRenderer.renderWaypoint(c, waypoint, () => {
              // On continue: dismiss card, resume waypoint transit
              onDismiss();
              // Re-show map and guidance banner for next waypoint if not complete
              if (!activeWaypointTracker!.isComplete()) {
                const currentWp = activeWaypointTracker!.getCurrentWaypoint();
                guidanceBanner.setWaypoint(currentWp);
                tourFooter.show();
                if (mapPanel) {
                  mapPanel.setHeaderVisible(false);
                  mapPanel.show();
                  requestAnimationFrame(() => mapView.invalidateSize());
                }
                if (sheet) sheet.setPosition('collapsed', true);
              }
            }));
            if (sheet) sheet.setPosition('expanded', true);
          },
          onComplete: () => {
            // All waypoints cleared — show destination stop with arriving banner
            cleanupWaypointTransit();
            arrivingBanner.show(destinationStop.title);
            transitionToStop(nextIndex);
          },
        });

        // Initial state: zoom to first segment, show waypoint markers
        const firstWaypoint = waypoints[0];
        mapView.setWaypoints(waypoints, 0);
        mapView.zoomToSegment(currentStop.coords, firstWaypoint.coords);

        // Set footer to waypoint mode
        tourFooter.enterWaypointMode(activeWaypointTracker.getProgress());

        // Check if the first waypoint is a journey card — if so, advance
        // immediately so onJourneyCard fires and shows the card
        const firstIsJourneyCard = firstWaypoint.journey_card === true ||
          (firstWaypoint.content && firstWaypoint.content.length > 0);

        if (firstIsJourneyCard) {
          activeWaypointTracker.advance();
        } else {
          guidanceBanner.setWaypoint(firstWaypoint);
          tourFooter.show();
        }

      } else {
        // === No waypoints — show transit bar (existing behaviour) ===
        mapView.setOverviewMode(false);
        overviewControls.hide();
        if (sheet) sheet.setPosition('collapsed', true);
        const nextDisplayNum = session.reversed ? (tour.stops.length - nextIndex) : (nextIndex + 1);
        transitBar.show(nextDisplayNum, destinationStop.title);
        mapView.setPulsingPin(destinationStop.id);
        tourFooter.hide();
      }

      onStopActivated?.(stopIndex);

    } else if (state === 'tour_complete') {
      cleanupWaypointTransit();
      mapView.setOverviewMode(false);
      overviewControls.hide();
      if (sheet) sheet.setPosition('expanded', true);
      if (mapPanel) mapPanel.hide();
      mapView.setMapPadding(0);
      tourFooter.hide();
      renderGoodbye();
    }
  };
}
