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
  container: HTMLElement;
  mapPane: HTMLElement;
  sheetContentEl: HTMLElement | null;
  isMobile: boolean;
  setStopListOpen: (open: boolean) => void;
  setViewingSystemCard: (card: string | null) => void;
  renderWelcome: () => void;
  renderGoodbye: () => void;
  onStopActivated?: (stopIndex: number) => void;
  onOverviewEnter?: () => void;
  transitionToStop: (stopIndex: number) => void;
  setMapFabVisible?: (visible: boolean) => void;
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
    guidanceBanner, arrivingBanner, container, mapPane, sheetContentEl,
    isMobile, setStopListOpen, setViewingSystemCard,
    renderWelcome, renderGoodbye, onStopActivated, onOverviewEnter,
    transitionToStop, setMapFabVisible,
  } = deps;

  let activeWaypointTracker: WaypointTracker | null = null;
  let pendingJourneyCardDismiss: (() => void) | null = null;
  const footerOriginalParent = tourFooter.getElement().parentElement;
  const mapPaneOriginalParent = mapPane.parentElement;

  // Wire footer "Continue" button to advance the waypoint tracker
  tourFooter.onImHere(() => {
    if (pendingJourneyCardDismiss) {
      const dismiss = pendingJourneyCardDismiss;
      pendingJourneyCardDismiss = null;
      dismiss();
    } else if (activeWaypointTracker && !activeWaypointTracker.isComplete()) {
      activeWaypointTracker.advance();
    }
  });

  function cleanupWaypointTransit(): void {
    activeWaypointTracker = null;
    pendingJourneyCardDismiss = null;
    guidanceBanner.hide();
    mapView.clearWaypoints();
    tourFooter.exitWaypointMode();
    // Move footer back to its original parent (inside the sheet)
    if (footerOriginalParent) footerOriginalParent.appendChild(tourFooter.getElement());
    // Move map pane back if it was embedded in a journey card
    if (mapPaneOriginalParent && mapPane.parentElement !== mapPaneOriginalParent) {
      mapPaneOriginalParent.appendChild(mapPane);
      requestAnimationFrame(() => mapView.invalidateSize());
    }
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
      setMapFabVisible?.(false);
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
      setMapFabVisible?.(true);
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
      setMapFabVisible?.(false);
      // Determine the destination stop
      const currentStop = tour.stops[stopIndex];
      const nextIndex = session.reversed
        ? (stopIndex - 1 + tour.stops.length) % tour.stops.length
        : (stopIndex + 1) % tour.stops.length;
      const destinationStop = tour.stops[nextIndex];

      const waypoints = destinationStop.getting_here?.waypoints;

      if (waypoints && waypoints.length > 0) {
        // === Waypoint transit mode ===
        cardHost.render(() => {}); // Clear stop card content
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
            // Update guidance banner with next waypoint
            guidanceBanner.setWaypoint(nextWaypoint);
            tourFooter.updateWaypointProgress(progress);
            // Move footer to container overlay for map view
            container.appendChild(tourFooter.getElement());
            tourFooter.getElement().classList.add('maptour-tour-footer--waypoint');
            // Move map pane back to map panel if it was embedded in a journey card
            if (mapPaneOriginalParent && mapPane.parentElement !== mapPaneOriginalParent) {
              mapPaneOriginalParent.appendChild(mapPane);
            }
            // Ensure map is showing (may have been hidden for journey card)
            if (mapPanel) {
              mapPanel.setHeaderVisible(false);
              if (!mapPanel.isOpen()) {
                mapPanel.show();
                requestAnimationFrame(() => mapView.invalidateSize());
              }
            }
          },
          onJourneyCard: (waypoint, onDismiss) => {
            // Update map to this waypoint's segment (even though map is hidden,
            // it will be correct if the user peeks via the FAB).
            // Use current - 1 as active: advance() already incremented past this waypoint.
            const progress = activeWaypointTracker!.getProgress();
            const displayIndex = Math.max(0, progress.current - 1);
            mapView.setWaypoints(waypoints, displayIndex);
            const bounds = activeWaypointTracker!.getSegmentBounds();
            mapView.zoomToSegment(bounds.from, bounds.to);
            tourFooter.updateWaypointProgress(progress);

            // Show journey card — hide map, show card view
            guidanceBanner.hide();
            // Move footer back to sheet for journey card view
            if (footerOriginalParent) footerOriginalParent.appendChild(tourFooter.getElement());
            tourFooter.getElement().classList.remove('maptour-tour-footer--waypoint');
            cardHost.render((c) => journeyCardRenderer.renderWaypoint(c, waypoint));

            // Check if the card has a map block — embed the map pane inline
            const mapEmbed = cardHost.getContainer().querySelector('.maptour-card__map-embed') as HTMLElement | null;
            if (mapEmbed) {
              // Move map pane back from map panel first
              if (mapPaneOriginalParent) mapPaneOriginalParent.appendChild(mapPane);
              if (mapPanel) mapPanel.hide();
              // Embed into the card
              mapEmbed.appendChild(mapPane);
              requestAnimationFrame(() => {
                mapView.invalidateSize();
                // Re-fit bounds for the smaller embed container with extra padding
                const map = mapView.getMap();
                mapView.zoomToSegment(bounds.from, bounds.to, 60);

                // Apply optional relative zoom adjustment and centre nudge
                const zoomDelta = parseFloat(mapEmbed.dataset.zoom ?? '');
                const offsetX = parseFloat(mapEmbed.dataset.offsetX ?? '');
                const offsetY = parseFloat(mapEmbed.dataset.offsetY ?? '');
                if (!isNaN(zoomDelta) && zoomDelta !== 0) {
                  map.setZoom(map.getZoom() + zoomDelta, { animate: false });
                }
                if (!isNaN(offsetX) || !isNaN(offsetY)) {
                  const center = map.getCenter();
                  const dLat = (isNaN(offsetY) ? 0 : offsetY) / 111320;
                  const dLng = (isNaN(offsetX) ? 0 : offsetX) / (111320 * Math.cos(center.lat * Math.PI / 180));
                  map.setView([center.lat + dLat, center.lng + dLng], map.getZoom(), { animate: false });
                }
              });
              // No FAB needed — map is inline
              if (mapPanel) mapPanel.setHeaderVisible(false);
            } else {
              if (mapPanel) {
                mapPanel.hide();
                // Show FAB so user can peek at map for orientation
                mapPanel.setHeaderVisible(true);
              }
            }

            if (sheet) sheet.setPosition('expanded', true);
            // Store dismiss callback — footer "Continue" will call it
            pendingJourneyCardDismiss = onDismiss;
          },
          onComplete: () => {
            // All waypoints cleared — transition to destination stop
            cleanupWaypointTransit();
            transitionToStop(nextIndex);
          },
        });

        // Initial state: zoom to first segment, show waypoint markers
        const firstWaypoint = waypoints[0];
        mapView.setWaypoints(waypoints, 0);
        mapView.zoomToSegment(currentStop.coords, firstWaypoint.coords);

        // Move footer to container so it sits above the map panel (sheet has
        // will-change:transform which breaks position:fixed inside it)
        container.appendChild(tourFooter.getElement());
        // Set footer to waypoint mode (for progress track)
        tourFooter.enterWaypointMode(activeWaypointTracker.getProgress());

        // Check if the first waypoint is a journey card — if so, advance
        // immediately so onJourneyCard fires and shows the card
        const firstIsJourneyCard = firstWaypoint.journey_card === true ||
          (firstWaypoint.content && firstWaypoint.content.length > 0);

        if (firstIsJourneyCard) {
          activeWaypointTracker.advance();
        } else {
          guidanceBanner.setWaypoint(firstWaypoint);
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
      setMapFabVisible?.(false);
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
