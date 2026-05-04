import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTourFromString, loadTour } from '../../src/loader';

const VALID_TOUR_YAML = `
tour:
  id: test-tour
  title: Test Tour
  description: A test tour

stops:
  - id: 1
    title: First Stop
    coords: [52.5022, -6.5581]
    content:
      - type: text
        body: "Hello world"
    getting_here:
      mode: walk
      note: "Walk 5 min"
  - id: 2
    title: Second Stop
    coords: [52.5041, -6.5563]
    content:
      - type: image
        url: https://example.com/photo.jpg
        caption: A photo
  - id: 3
    title: Third Stop
    coords: [52.5060, -6.5545]
    content:
      - type: gallery
        images:
          - url: https://example.com/1.jpg
            caption: First
          - url: https://example.com/2.jpg
      - type: video
        url: https://youtube.com/watch?v=dQw4w9WgXcQ
      - type: audio
        url: https://example.com/audio.mp3
        label: Commentary
    getting_here:
      mode: drive
`;

describe('parseTourFromString', () => {
  it('parses a valid tour', () => {
    const result = parseTourFromString(VALID_TOUR_YAML);
    expect(result.error).toBeUndefined();
    expect(result.tour).toBeDefined();
    expect(result.tour?.tour.id).toBe('test-tour');
    expect(result.tour?.tour.title).toBe('Test Tour');
    expect(result.tour?.stops).toHaveLength(3);
  });

  it('parses all content block types', () => {
    const result = parseTourFromString(VALID_TOUR_YAML);
    expect(result.tour?.stops[0].content[0].type).toBe('text');
    expect(result.tour?.stops[1].content[0].type).toBe('image');
    const stop3 = result.tour?.stops[2];
    expect(stop3?.content[0].type).toBe('gallery');
    expect(stop3?.content[1].type).toBe('video');
    expect(stop3?.content[2].type).toBe('audio');
  });

  it('parses leg modes correctly', () => {
    const result = parseTourFromString(VALID_TOUR_YAML);
    expect(result.tour?.stops[0].getting_here?.mode).toBe('walk');
    expect(result.tour?.stops[2].getting_here?.mode).toBe('drive');
  });

  it('parses coordinates as tuples', () => {
    const result = parseTourFromString(VALID_TOUR_YAML);
    const coords = result.tour?.stops[0].coords;
    expect(coords).toEqual([52.5022, -6.5581]);
  });

  it('returns error for missing tour.id', () => {
    const yaml = `
tour:
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('tour.id');
  });

  it('returns error for missing tour.title', () => {
    const yaml = `
tour:
  id: test
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('tour.title');
  });

  it('returns error for missing stops', () => {
    const yaml = `
tour:
  id: test
  title: Test
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('stops');
  });

  it('returns error for unknown block type', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content:
      - type: unknown_type
        body: something
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
    expect(result.tour).toBeUndefined();
  });

  it('returns error for malformed coordinates — wrong length', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('coords');
  });

  it('returns error for malformed coordinates — non-numeric', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [not, a, number]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('coords');
  });

  it('returns error for out-of-range latitude', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [95.0, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
    expect(result.tour).toBeUndefined();
  });

  it('returns error for invalid leg mode', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
    getting_here:
      mode: bicycle
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('getting_here.mode');
  });

  it('returns error for duplicate stop IDs', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 1
    title: Stop 1 again
    coords: [52.5041, -6.5563]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('Duplicate');
  });

  it('returns error for malformed YAML', () => {
    const result = parseTourFromString('this: is: not: valid: yaml: [{{');
    expect(result.error).toContain('YAML parse error');
  });

  it('returns error for missing image URL', () => {
    const yaml = `
tour:
  id: test
  title: Test
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content:
      - type: image
        caption: no url here
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('url');
  });

  it('parses tour.duration when present', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
  duration: "45–60 minutes"
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.duration).toBe('45–60 minutes');
  });

  it('parses successfully when tour.duration is absent', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.duration).toBeUndefined();
  });

  it('parses tour.welcome and tour.goodbye content blocks', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
  welcome:
    - type: text
      body: "Welcome to the tour!"
    - type: image
      url: https://example.com/banner.jpg
  goodbye:
    - type: text
      body: "Thanks for visiting!"
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.welcome).toHaveLength(2);
    expect(result.tour?.tour.welcome?.[0].type).toBe('text');
    expect(result.tour?.tour.goodbye).toHaveLength(1);
  });

  it('parses successfully when welcome/goodbye are absent', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.welcome).toBeUndefined();
    expect(result.tour?.tour.goodbye).toBeUndefined();
  });

  it('handles empty welcome/goodbye arrays', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
  welcome: []
  goodbye: []
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.welcome).toHaveLength(0);
  });

  it('returns error for invalid block in welcome', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
  welcome:
    - type: invalid_type
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toContain('welcome');
  });

  // === Waypoint schema validation ===

  it('parses waypoints on a leg with a route', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.503, -6.557], [52.5041, -6.5563]]
      waypoints:
        - coords: [52.503, -6.557]
          text: "Head towards the bridge"
        - coords: [52.5035, -6.5565]
          text: "Turn left at the old mill"
          photo: "https://example.com/mill.jpg"
          journey_card: true
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    const leg = result.tour?.stops[1].getting_here;
    expect(leg?.waypoints).toHaveLength(2);
    expect(leg?.waypoints?.[0].text).toBe('Head towards the bridge');
    expect(leg?.waypoints?.[1].journey_card).toBe(true);
    expect(leg?.waypoints?.[1].photo).toBe('https://example.com/mill.jpg');
  });

  it('parses map_interactive flag on a waypoint', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.5041, -6.5563]]
      waypoints:
        - coords: [52.503, -6.557]
          text: "Locked map (default)"
        - coords: [52.5035, -6.5565]
          text: "Interactive map opt-in"
          map_interactive: true
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    const wps = result.tour?.stops[1].getting_here?.waypoints;
    expect(wps?.[0].map_interactive).toBeUndefined();
    expect(wps?.[1].map_interactive).toBe(true);
  });

  it('parses waypoint with content blocks (auto-promoted journey card)', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.5041, -6.5563]]
      waypoints:
        - coords: [52.503, -6.557]
          text: "The old warehouses"
          content:
            - type: text
              body: "These warehouses were built in 1847"
            - type: image
              url: "https://example.com/warehouses.jpg"
              caption: "The restored warehouses"
          radius: 25
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    const wp = result.tour?.stops[1].getting_here?.waypoints?.[0];
    expect(wp?.content).toHaveLength(2);
    expect(wp?.radius).toBe(25);
  });

  it('returns error for waypoints without a route', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      waypoints:
        - coords: [52.503, -6.557]
          text: "Head towards the bridge"
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
  });

  it('accepts journey card waypoint with empty text', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.5041, -6.5563]]
      waypoints:
        - coords: [52.503, -6.557]
          text: ""
          journey_card: true
          content:
            - type: text
              body: "Rich content here"
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.stops[1].getting_here?.waypoints?.[0].text).toBe('');
  });

  it('returns error for light waypoint with empty text', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.5041, -6.5563]]
      waypoints:
        - coords: [52.503, -6.557]
          text: ""
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
  });

  it('returns error for waypoint with missing coords', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.5041, -6.5563]]
      waypoints:
        - text: "Missing coords"
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
  });

  it('accepts a leg with empty waypoints array', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      waypoints: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
  });

  it('accepts a leg without waypoints (backward compatible)', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
    getting_here:
      mode: walk
      note: "Walk 5 min"
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.stops[0].getting_here?.waypoints).toBeUndefined();
  });

  it('parses tour_url and waypoint_radius in tour metadata', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
  tour_url: "https://example.com/tour.yaml"
  waypoint_radius: 20
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.tour_url).toBe('https://example.com/tour.yaml');
    expect(result.tour?.tour.waypoint_radius).toBe(20);
  });

  it('returns error for negative waypoint_radius', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
  waypoint_radius: -5
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
  });

  describe('scroll_hint', () => {
    const baseYaml = (extra: string) => `
tour:
  id: test
  title: Test
${extra}
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;

    it.each(['auto', 'always', 'off'])('accepts scroll_hint: %s', (value) => {
      const result = parseTourFromString(baseYaml(`  scroll_hint: ${value}`));
      expect(result.error).toBeUndefined();
      expect(result.tour?.tour.scroll_hint).toBe(value);
    });

    it('accepts tour with scroll_hint absent', () => {
      const result = parseTourFromString(baseYaml(''));
      expect(result.error).toBeUndefined();
      expect(result.tour?.tour.scroll_hint).toBeUndefined();
    });

    it('rejects invalid scroll_hint string', () => {
      const result = parseTourFromString(baseYaml('  scroll_hint: maybe'));
      expect(result.error).toBeDefined();
      expect(result.error).toContain('scroll_hint');
    });

    it('rejects scroll_hint with wrong type (boolean)', () => {
      const result = parseTourFromString(baseYaml('  scroll_hint: true'));
      expect(result.error).toBeDefined();
      expect(result.error).toContain('scroll_hint');
    });

    it('rejects scroll_hint with wrong type (number)', () => {
      const result = parseTourFromString(baseYaml('  scroll_hint: 1'));
      expect(result.error).toBeDefined();
      expect(result.error).toContain('scroll_hint');
    });
  });

  it('returns error for waypoint with out-of-range coords', () => {
    const yaml = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
  - id: 2
    title: Stop 2
    coords: [52.5041, -6.5563]
    content: []
    getting_here:
      mode: walk
      route: [[52.5022, -6.5581], [52.5041, -6.5563]]
      waypoints:
        - coords: [95.0, -6.557]
          text: "Invalid latitude"
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeDefined();
  });

  describe('header_url', () => {
    const baseYaml = (extra: string) => `
tour:
  id: test
  title: Test
${extra}
stops:
  - id: 1
    title: Stop 1
    coords: [52.5022, -6.5581]
    content: []
`;

    it('accepts a valid https header_url', () => {
      const result = parseTourFromString(baseYaml('  header_url: https://example.com'));
      expect(result.error).toBeUndefined();
      expect(result.tour?.tour.header_url).toBe('https://example.com');
    });

    it('accepts tour with header_url absent', () => {
      const result = parseTourFromString(baseYaml(''));
      expect(result.error).toBeUndefined();
      expect(result.tour?.tour.header_url).toBeUndefined();
    });

    it('rejects malformed header_url', () => {
      const result = parseTourFromString(baseYaml('  header_url: "not a url"'));
      expect(result.error).toBeDefined();
      expect(result.error).toContain('header_url');
    });
  });
});

const VALID_YAML = `
tour:
  id: test
  title: Test Tour
stops:
  - id: 1
    title: Stop 1
    coords: [52.5, -6.5]
    content: []
`;

describe('loadTour (fetch path)', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the parsed tour on a successful fetch', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => VALID_YAML,
    } as Response));

    const result = await loadTour('https://example.com/tour.yaml');
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.id).toBe('test');
    expect(result.tour?.stops.length).toBe(1);
  });

  it('returns a network error when fetch throws', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to connect');
    });

    const result = await loadTour('https://example.com/tour.yaml');
    expect(result.error).toContain('Network error');
    expect(result.error).toContain('Failed to connect');
    expect(result.tour).toBeUndefined();
  });

  it('returns an HTTP error when the response is not ok', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => '',
    } as Response));

    const result = await loadTour('https://example.com/missing.yaml');
    expect(result.error).toContain('HTTP 404 Not Found');
    expect(result.tour).toBeUndefined();
  });

  it('returns an error when text() throws', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => { throw new Error('stream broken'); },
    } as Response));

    const result = await loadTour('https://example.com/tour.yaml');
    expect(result.error).toContain('Failed to read tour file response');
    expect(result.error).toContain('stream broken');
  });

  it('returns a YAML parse error on malformed YAML', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'tour:\n  id: [unclosed',
    } as Response));

    const result = await loadTour('https://example.com/tour.yaml');
    expect(result.error).toContain('YAML parse error');
  });

  it('returns a validation error when the parsed YAML fails the schema', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'tour:\n  id: x\nstops: []',
    } as Response));

    const result = await loadTour('https://example.com/tour.yaml');
    expect(result.error).toContain('Tour validation error');
  });

  it('handles non-Error rejections from fetch', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw 'plain string error';
    });

    const result = await loadTour('https://example.com/tour.yaml');
    expect(result.error).toContain('Network error');
    expect(result.error).toContain('plain string error');
  });
});
