import { describe, it, expect } from 'vitest';
import { parseTourFromString } from '../../src/loader';

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
});
