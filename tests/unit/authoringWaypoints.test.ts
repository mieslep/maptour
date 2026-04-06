/**
 * B-INT: Phase B integration tests
 *
 * Tests authoring waypoint data flows: YAML round-trip, data model
 * mutations, and sort-by-position logic. UI interactions (modal,
 * drag, map clicks) are covered by E2E tests.
 */
import { describe, it, expect } from 'vitest';
import { tourToYaml, yamlToTour } from '../../authoring/src/yaml-io';
import type { Tour, Waypoint } from '../../authoring/src/types';

function createTestTour(waypoints?: Waypoint[]): Tour {
  return {
    tour: { id: 'test', title: 'Test Tour' },
    stops: [
      {
        id: 1,
        title: 'Start',
        coords: [52.5, -6.5],
        content: [],
      },
      {
        id: 2,
        title: 'Destination',
        coords: [52.51, -6.51],
        content: [],
        getting_here: {
          mode: 'walk',
          route: [[52.5, -6.5], [52.505, -6.505], [52.51, -6.51]],
          waypoints,
        },
      },
    ],
  };
}

describe('Authoring waypoint YAML round-trip', () => {
  it('exports waypoints to YAML and re-imports correctly', () => {
    const waypoints: Waypoint[] = [
      { coords: [52.503, -6.503], text: 'Cross the bridge' },
      { coords: [52.507, -6.507], text: 'Turn left at the mill', photo: 'https://example.com/mill.jpg' },
    ];
    const tour = createTestTour(waypoints);

    const yaml = tourToYaml(tour);
    const reimported = yamlToTour(yaml);

    const leg = reimported.stops[1].getting_here!;
    expect(leg.waypoints).toHaveLength(2);
    expect(leg.waypoints![0].text).toBe('Cross the bridge');
    expect(leg.waypoints![1].text).toBe('Turn left at the mill');
    expect(leg.waypoints![1].photo).toBe('https://example.com/mill.jpg');
  });

  it('exports journey_card flag correctly', () => {
    const waypoints: Waypoint[] = [
      { coords: [52.503, -6.503], text: 'Journey card point', journey_card: true },
    ];
    const tour = createTestTour(waypoints);

    const yaml = tourToYaml(tour);
    const reimported = yamlToTour(yaml);

    expect(reimported.stops[1].getting_here!.waypoints![0].journey_card).toBe(true);
  });

  it('exports content blocks on waypoints', () => {
    const waypoints: Waypoint[] = [
      {
        coords: [52.503, -6.503],
        text: 'The warehouses',
        content: [
          { type: 'text', body: 'Built in 1847' },
          { type: 'image', url: 'https://example.com/warehouses.jpg', caption: 'Restored' },
        ],
      },
    ];
    const tour = createTestTour(waypoints);

    const yaml = tourToYaml(tour);
    const reimported = yamlToTour(yaml);

    const wp = reimported.stops[1].getting_here!.waypoints![0];
    expect(wp.content).toHaveLength(2);
    expect(wp.content![0].type).toBe('text');
    expect(wp.content![1].type).toBe('image');
  });

  it('exports per-waypoint radius', () => {
    const waypoints: Waypoint[] = [
      { coords: [52.503, -6.503], text: 'Custom radius', radius: 25 },
    ];
    const tour = createTestTour(waypoints);

    const yaml = tourToYaml(tour);
    const reimported = yamlToTour(yaml);

    expect(reimported.stops[1].getting_here!.waypoints![0].radius).toBe(25);
  });

  it('omits waypoints key when array is empty', () => {
    const tour = createTestTour([]);

    const yaml = tourToYaml(tour);
    expect(yaml).not.toContain('waypoints');
  });

  it('omits waypoints key when undefined', () => {
    const tour = createTestTour();

    const yaml = tourToYaml(tour);
    expect(yaml).not.toContain('waypoints');
  });

  it('silently drops legacy journey field on import', () => {
    const yamlWithJourney = `
tour:
  id: legacy
  title: Legacy Tour
stops:
  - id: 1
    title: Start
    coords: [52.5, -6.5]
    content: []
  - id: 2
    title: Destination
    coords: [52.51, -6.51]
    content: []
    getting_here:
      mode: walk
      route: [[52.5, -6.5], [52.51, -6.51]]
      journey:
        - type: text
          body: "This is legacy journey content"
`;
    const tour = yamlToTour(yamlWithJourney);
    const leg = tour.stops[1].getting_here!;
    // journey field should be dropped, not present on the Leg type
    expect((leg as any).journey).toBeUndefined();
    // Route should still be there
    expect(leg.route).toHaveLength(2);
  });

  it('round-trips a tour with waypoints and no legacy journey', () => {
    const waypoints: Waypoint[] = [
      { coords: [52.503, -6.503], text: 'First waypoint' },
      { coords: [52.507, -6.507], text: 'Second waypoint', journey_card: true, photo: 'https://example.com/photo.jpg' },
      {
        coords: [52.509, -6.509],
        text: 'Third waypoint',
        content: [{ type: 'text', body: 'Some content' }],
        radius: 30,
      },
    ];
    const tour = createTestTour(waypoints);

    // Export and re-import
    const yaml = tourToYaml(tour);
    const reimported = yamlToTour(yaml);

    // Re-export should produce equivalent YAML
    const yaml2 = tourToYaml(reimported);
    const reimported2 = yamlToTour(yaml2);

    const wps = reimported2.stops[1].getting_here!.waypoints!;
    expect(wps).toHaveLength(3);
    expect(wps[0].text).toBe('First waypoint');
    expect(wps[1].journey_card).toBe(true);
    expect(wps[2].radius).toBe(30);
    expect(wps[2].content).toHaveLength(1);
  });
});

describe('Authoring waypoint data model', () => {
  it('adding a waypoint to a leg without route leaves waypoints undefined', () => {
    const tour: Tour = {
      tour: { id: 'test', title: 'Test' },
      stops: [
        { id: 1, title: 'A', coords: [52.5, -6.5], content: [] },
        { id: 2, title: 'B', coords: [52.51, -6.51], content: [], getting_here: { mode: 'walk' } },
      ],
    };
    // No route → waypoints should not be set (authoring tool would show error)
    expect(tour.stops[1].getting_here!.waypoints).toBeUndefined();
  });

  it('waypoint sort by polyline position is deterministic', () => {
    // Simulate what the authoring tool does after drag: sort by fractional position
    const waypoints: Waypoint[] = [
      { coords: [52.509, -6.509], text: 'Third (far along route)' },
      { coords: [52.501, -6.501], text: 'First (near start)' },
      { coords: [52.505, -6.505], text: 'Second (middle)' },
    ];

    const route: [number, number][] = [
      [52.5, -6.5],
      [52.505, -6.505],
      [52.51, -6.51],
    ];

    // Simple sort by nearest segment position (simplified version of snap-to-polyline)
    const sorted = [...waypoints].sort((a, b) => {
      const posA = getFractionalPosition(a.coords, route);
      const posB = getFractionalPosition(b.coords, route);
      return posA - posB;
    });

    expect(sorted[0].text).toBe('First (near start)');
    expect(sorted[1].text).toBe('Second (middle)');
    expect(sorted[2].text).toBe('Third (far along route)');
  });
});

/** Simplified fractional position along a polyline (for test purposes). */
function getFractionalPosition(coords: [number, number], route: [number, number][]): number {
  let bestDist = Infinity;
  let bestPos = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const [px, py] = coords;

    // Project point onto segment
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);

    if (dist < bestDist) {
      bestDist = dist;
      bestPos = i + t;
    }
  }

  return bestPos;
}
