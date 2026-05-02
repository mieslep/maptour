/**
 * TOUR-045: Inline `{dot}` waypoint marker shortcode in markdown.
 */
import { describe, it, expect } from 'vitest';
import { renderTextBlock } from '../../src/card/blocks/TextBlock';
import type { TextBlock } from '../../src/types';

const block = (body: string): TextBlock => ({ type: 'text', body });

describe('Inline {dot} shortcode', () => {
  it('renders {dot} as a maptour-dot span with aria-label', () => {
    const el = renderTextBlock(block('Head towards the {dot} on the map'));
    const dot = el.querySelector('.maptour-dot');
    expect(dot).not.toBeNull();
    expect(dot!.getAttribute('aria-label')).toBe('waypoint marker');
    // Surrounding text intact
    expect(el.textContent).toContain('Head towards the');
    expect(el.textContent).toContain('on the map');
  });

  it('renders multiple {dot} occurrences as separate spans', () => {
    const el = renderTextBlock(block('First {dot} then {dot} again'));
    const dots = el.querySelectorAll('.maptour-dot');
    expect(dots.length).toBe(2);
  });

  it('does NOT replace {dot} inside an inline code span', () => {
    const el = renderTextBlock(block('The syntax is `{dot}` to insert one'));
    expect(el.querySelector('.maptour-dot')).toBeNull();
    // The literal text {dot} appears inside a <code> element
    const code = el.querySelector('code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('{dot}');
  });

  it('does NOT replace {dot} inside a fenced code block', () => {
    const el = renderTextBlock(block('Example:\n\n```\n{dot}\n```\n'));
    expect(el.querySelector('.maptour-dot')).toBeNull();
    const pre = el.querySelector('pre code');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain('{dot}');
  });

  it('does not match partial patterns', () => {
    const el = renderTextBlock(block('No match: {dotty} or {do} or {dot or dot}'));
    expect(el.querySelector('.maptour-dot')).toBeNull();
    expect(el.textContent).toContain('{dotty}');
    expect(el.textContent).toContain('{do}');
  });
});
