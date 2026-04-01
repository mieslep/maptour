import { describe, it, expect, beforeEach } from 'vitest';
import { t, setStrings, validateStrings, getDefaults } from '../../src/i18n';

describe('i18n', () => {
  beforeEach(() => {
    setStrings(); // reset to defaults
  });

  // === t() basic lookup ===

  it('returns default string for known key', () => {
    expect(t('welcome')).toBe('Welcome');
    expect(t('finish_tour')).toBe('Finish Tour');
  });

  it('returns the key itself for unknown key', () => {
    expect(t('nonexistent_key')).toBe('nonexistent_key');
  });

  // === Placeholder substitution ===

  it('replaces named placeholders', () => {
    expect(t('stop_n', { n: 3, total: 10 })).toBe('Stop 3 / 10');
  });

  it('replaces single placeholder', () => {
    expect(t('next_stop', { stop: 'Trinity' })).toBe('Next: Trinity');
  });

  it('replaces multiple occurrences of same placeholder', () => {
    setStrings({ stop_n: '{n} of {total} (stop {n})' });
    expect(t('stop_n', { n: 2, total: 5 })).toBe('2 of 5 (stop 2)');
  });

  it('leaves unreplaced placeholders as-is', () => {
    expect(t('stop_n', { n: 1 })).toBe('Stop 1 / {total}');
  });

  it('works with no params', () => {
    expect(t('welcome')).toBe('Welcome');
  });

  it('handles numeric params', () => {
    expect(t('stops_visited', { n: 5, total: 16 })).toBe('5 / 16 stops visited');
  });

  // === setStrings overrides ===

  it('overrides specific strings', () => {
    setStrings({ welcome: 'Bienvenue' });
    expect(t('welcome')).toBe('Bienvenue');
    expect(t('finish_tour')).toBe('Finish Tour'); // non-overridden stays default
  });

  it('overrides work with placeholders', () => {
    setStrings({ next_stop: 'Suivant: {stop}' });
    expect(t('next_stop', { stop: 'Market Day' })).toBe('Suivant: Market Day');
  });

  it('reset clears all overrides', () => {
    setStrings({ welcome: 'Hola' });
    expect(t('welcome')).toBe('Hola');
    setStrings(); // reset
    expect(t('welcome')).toBe('Welcome');
  });

  it('ignores non-string override values', () => {
    setStrings({ welcome: 123 as any });
    expect(t('welcome')).toBe('Welcome');
  });

  // === validateStrings ===

  it('returns null for valid overrides', () => {
    expect(validateStrings({ welcome: 'Hi', finish_tour: 'Done' })).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(validateStrings({})).toBeNull();
  });

  it('rejects unknown keys', () => {
    const err = validateStrings({ bogus_key: 'hello' });
    expect(err).toContain('Unknown string key "bogus_key"');
  });

  it('rejects non-string values', () => {
    const err = validateStrings({ welcome: 42 });
    expect(err).toContain('must be a string');
  });

  it('rejects non-object input', () => {
    expect(validateStrings('hello')).toContain('must be an object');
    expect(validateStrings(null)).toContain('must be an object');
    expect(validateStrings(42)).toContain('must be an object');
  });

  it('rejects unknown placeholders', () => {
    const err = validateStrings({ stop_n: 'Stop {n} of {bogus}' });
    expect(err).toContain('unknown placeholder {bogus}');
    expect(err).toContain('{n}');
    expect(err).toContain('{total}');
  });

  it('accepts valid placeholders', () => {
    expect(validateStrings({ stop_n: 'Number {n}, total {total}' })).toBeNull();
    expect(validateStrings({ next_stop: 'Go to {stop}' })).toBeNull();
  });

  it('allows strings without placeholders even for keys that have them', () => {
    expect(validateStrings({ stop_n: 'Current stop' })).toBeNull();
  });

  // === getDefaults ===

  it('returns a copy of defaults', () => {
    const d = getDefaults();
    expect(d.welcome).toBe('Welcome');
    d.welcome = 'modified';
    expect(getDefaults().welcome).toBe('Welcome'); // original unchanged
  });

  it('includes all expected keys', () => {
    const d = getDefaults();
    expect(d).toHaveProperty('welcome');
    expect(d).toHaveProperty('stop_n');
    expect(d).toHaveProperty('next_stop');
    expect(d).toHaveProperty('finish_tour');
    expect(d).toHaveProperty('return_to_start');
    expect(d).toHaveProperty('finish_here');
    expect(d).toHaveProperty('tour_complete');
    expect(d).toHaveProperty('revisit');
    expect(d).toHaveProperty('arrived');
  });
});
