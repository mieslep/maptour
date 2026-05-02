/**
 * TOUR-044: Authoring round-trip for tour.scroll_hint
 */
import { describe, it, expect } from 'vitest';
import { tourToYaml, yamlToTour } from '../../authoring/src/yaml-io';
import type { Tour } from '../../authoring/src/types';

function makeTour(scroll_hint?: 'auto' | 'always' | 'off'): Tour {
  return {
    tour: { id: 'test', title: 'Test Tour', scroll_hint },
    stops: [{ id: 1, title: 'Stop 1', coords: [52.5, -6.5], content: [] }],
  };
}

describe('Authoring scroll_hint round-trip', () => {
  it('preserves "always" through save and load', () => {
    const yaml = tourToYaml(makeTour('always'));
    expect(yaml).toMatch(/scroll_hint:\s*always/);
    const reloaded = yamlToTour(yaml);
    expect(reloaded.tour.scroll_hint).toBe('always');
  });

  it('preserves "off" through save and load', () => {
    const yaml = tourToYaml(makeTour('off'));
    expect(yaml).toMatch(/scroll_hint:\s*"?off"?/);
    const reloaded = yamlToTour(yaml);
    expect(reloaded.tour.scroll_hint).toBe('off');
  });

  it('omits scroll_hint when value is "auto"', () => {
    const yaml = tourToYaml(makeTour('auto'));
    expect(yaml).not.toMatch(/scroll_hint/);
    const reloaded = yamlToTour(yaml);
    expect(reloaded.tour.scroll_hint).toBeUndefined();
  });

  it('omits scroll_hint when undefined', () => {
    const yaml = tourToYaml(makeTour(undefined));
    expect(yaml).not.toMatch(/scroll_hint/);
  });

  it('hand-written scroll_hint: auto loads cleanly as undefined', () => {
    const handWritten = `
tour:
  id: test
  title: Test
  scroll_hint: auto
stops:
  - id: 1
    title: Stop 1
    coords: [52.5, -6.5]
    content: []
`;
    const tour = yamlToTour(handWritten);
    expect(tour.tour.scroll_hint).toBe('auto');
    // Round-trip back: 'auto' is canonicalised to absent on save
    const yaml = tourToYaml(tour);
    expect(yaml).not.toMatch(/scroll_hint/);
  });

  it('no stale-field leak: switching from "always" to undefined removes the field', () => {
    // Load a tour with scroll_hint: 'always'
    const tour = yamlToTour(`
tour:
  id: test
  title: Test
  scroll_hint: always
stops:
  - id: 1
    title: Stop 1
    coords: [52.5, -6.5]
    content: []
`);
    expect(tour.tour.scroll_hint).toBe('always');

    // Author switches the control to "Auto" -> editor sets meta.scroll_hint = undefined
    tour.tour.scroll_hint = undefined;

    // Save: field must be omitted (no leak of stale 'always')
    const yaml = tourToYaml(tour);
    expect(yaml).not.toMatch(/scroll_hint/);
    expect(yaml).not.toMatch(/always/);
  });

  it('no stale-field leak: switching from "always" to "off" writes only "off"', () => {
    const tour = yamlToTour(`
tour:
  id: test
  title: Test
  scroll_hint: always
stops:
  - id: 1
    title: Stop 1
    coords: [52.5, -6.5]
    content: []
`);
    tour.tour.scroll_hint = 'off';
    const yaml = tourToYaml(tour);
    expect(yaml).toMatch(/scroll_hint:\s*"?off"?/);
    expect(yaml).not.toMatch(/always/);
  });

  it('ignores unknown scroll_hint values on load (does not set the field)', () => {
    const tour = yamlToTour(`
tour:
  id: test
  title: Test
  scroll_hint: pulse
stops:
  - id: 1
    title: Stop 1
    coords: [52.5, -6.5]
    content: []
`);
    expect(tour.tour.scroll_hint).toBeUndefined();
  });
});
