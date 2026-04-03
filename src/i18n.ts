/**
 * MapTour i18n — lightweight string localisation.
 *
 * Default strings are English. Tour authors can override any label
 * via `tour.strings` in their YAML file.
 *
 * Dynamic placeholders use named tokens: {stop}, {n}, {total}.
 */

export interface StringOverrides {
  [key: string]: string;
}

const DEFAULTS: Record<string, string> = {
  // Header labels
  welcome:       'Welcome',
  en_route:      'En route',
  complete:      'Complete',
  all_stops:     'All Stops',
  stop_n:        'Stop {n} / {total}',

  // Welcome card
  start_at:      'Start at Stop {n} / {total}:',
  start_from:    'Start from {stop}',
  tip:           'Select a stop on the map or use the arrows above to change your starting point',

  // Stop card footer
  next_stop:     'Next: {stop}',
  next_btn:      'Next →',
  finish_tour:   'Finish Tour',
  return_to_start: 'Return to start →',
  finish_here:   'Finish here',

  // Journey card
  arrived:       "I've arrived at {stop} →",

  // Goodbye card
  tour_complete: 'Tour complete!',
  stops_visited: '{n} / {total} stops visited',
  revisit:       'Revisit tour',
  close:         'Close',

  // Nav buttons
  walk_me:       'Walk me there',
  drive_me:      'Drive me there',
  transit_dir:   'Get transit directions',
  cycle_dir:     'Get cycling directions',
  directions_to: 'Directions to this stop',
  picker_title:  'Open directions in:',
  picker_cancel: 'Cancel',

  // Stop order toggle
  stop_order:        'Stop order:',

  // Transit bar
  im_here:           "I'm here",
  transit_label:     'Stop {n}: {stop}',

  // Nearest indicator
  nearest_to_you:    'Nearest to you: ',
  stop_label:        'Stop {n} — {stop}',

  // Gallery
  gallery_counter:   '{n} / {total}',

  // Stop list overlay
  all_stops_title:   'All stops',

  // Error messages
  tour_load_error:   'Tour could not load',
  image_error:       'Image could not be loaded',
  audio_error:       'Audio could not be loaded.',

  // Misc
  minimize:      'Minimize',
  show_map:      'Show map',
  show_stop:     'Show stop',
  open_app_nav:  'Open app to bring me to',
  scroll_more:   'Scroll for more',
};

/** Valid placeholder names per string key (for validation). */
const PLACEHOLDERS: Record<string, string[]> = {
  stop_n:        ['n', 'total'],
  start_at:      ['n', 'total'],
  start_from:    ['stop'],
  next_stop:     ['stop'],
  stops_visited: ['n', 'total'],
  arrived:       ['stop'],
  transit_label: ['n', 'stop'],
  stop_label:    ['n', 'stop'],
  gallery_counter: ['n', 'total'],
};

let strings: Record<string, string> = { ...DEFAULTS };

/** Merge tour.strings overrides into the active string map. */
export function setStrings(overrides?: StringOverrides): void {
  strings = { ...DEFAULTS };
  if (overrides) {
    for (const key of Object.keys(overrides)) {
      if (typeof overrides[key] === 'string') {
        strings[key] = overrides[key];
      }
    }
  }
}

/**
 * Look up a localised string by key, replacing named placeholders.
 *
 * Example: t('stop_n', { n: 2, total: 6 }) → "Stop 2 / 6"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = strings[key] ?? DEFAULTS[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}

/**
 * Validate tour.strings overrides. Returns an error message or null.
 * Checks that override keys exist in DEFAULTS and that placeholders
 * are valid.
 */
export function validateStrings(overrides: unknown): string | null {
  if (typeof overrides !== 'object' || overrides === null) {
    return '"tour.strings" must be an object';
  }
  const obj = overrides as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!(key in DEFAULTS)) {
      return `Unknown string key "${key}" in tour.strings. Valid keys: ${Object.keys(DEFAULTS).join(', ')}`;
    }
    if (typeof obj[key] !== 'string') {
      return `tour.strings.${key} must be a string`;
    }
    // Validate placeholders
    const value = obj[key] as string;
    const placeholderMatches = value.match(/\{(\w+)\}/g);
    if (placeholderMatches && key in PLACEHOLDERS) {
      const validNames = PLACEHOLDERS[key];
      for (const match of placeholderMatches) {
        const name = match.slice(1, -1);
        if (!validNames.includes(name)) {
          return `tour.strings.${key}: unknown placeholder {${name}}. Valid placeholders: ${validNames.map(n => `{${n}}`).join(', ')}`;
        }
      }
    }
  }
  return null;
}

/** Get all valid string keys and their default values (for documentation). */
export function getDefaults(): Record<string, string> {
  return { ...DEFAULTS };
}
