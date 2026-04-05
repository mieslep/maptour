/**
 * MapTour i18n — lightweight string localisation.
 *
 * Default strings are English. Tour authors can override any label
 * via `tour.strings` in their YAML file.
 *
 * Dynamic placeholders use named tokens: {stop}, {n}, {total}.
 *
 * IMPORTANT: Keep DEFAULTS and PLACEHOLDERS sorted alphabetically by key.
 */

export interface StringOverrides {
  [key: string]: string;
}

const DEFAULTS: Record<string, string> = {
  about_description: 'An open-source, embeddable map tour player for static websites.',
  about_heading:     'Powered by MapTour',
  all_stops:         'All Stops',
  all_stops_title:   'All stops',
  arrived:           "I've arrived at {stop} →",
  audio_error:       'Audio could not be loaded.',
  back:              'Back',
  begin_from:        'Begin Tour from {stop}',
  begin_tour:        'Begin Tour',
  change_direction:  'Change direction',
  close:             'Close',
  complete:          'Complete',
  cycle_dir:         'Get cycling directions',
  directions_to:     'Directions to this stop',
  drive_me:          'Drive me there',
  en_route:          'En route',
  end_tour:          'End Tour',
  finish_here:       'Finish here',
  finish_modal_body: 'Would you like to return to the start?',
  finish_modal_no:   'End tour',
  finish_modal_title:'Tour finished!',
  finish_modal_yes:  'Return to start',
  finish_tour:       'Finish Tour',
  gallery_counter:   '{n} / {total}',
  get_started_prompt:'Open the map to explore stops and start your tour',
  getting_here_title:'Getting Here',
  how_to_get_here:   'How to get here',
  im_here:           "I'm here",
  image_error:       'Image could not be loaded',
  menu_about:        'About',
  menu_getting_here: 'Getting Here',
  menu_start_tour:   'Tour Overview',
  menu_tour_stops:   'Tour Stops',
  minimize:          'Minimize',
  nearest_to_you:    'Nearest to you: ',
  next_btn:          'Next →',
  next_journey:      'Next: Journey to {stop}',
  next_stop:         'Next: {stop}',
  open_app_nav:      'Open app to bring me to',
  picker_cancel:     'Cancel',
  picker_title:      'Open directions in:',
  progress_label:    'Tour progress',
  return_to_start:   'Return to start →',
  revisit:           'What next?',
  revisit_no:        'Browse tour stops',
  revisit_yes:       'Take the tour again',
  scroll_more:       'Scroll for more',
  show_map:          'Show map',
  show_stop:         'Show stop',
  start_at:          'Start at Stop {n} / {total}:',
  start_from:        'Start from {stop}',
  stop_label:        'Stop {n} — {stop}',
  stop_n:            'Stop {n} / {total}',
  stop_n_of_total:   'Stop {n} of {total}',
  stop_order:        'Stop order:',
  stops_visited:     '{n} / {total} stops visited',
  tip:               'Select a stop on the map or use the arrows above to change your starting point',
  tour_complete:     'Tour complete!',
  tour_load_error:   'Tour could not load',
  transit_dir:       'Get transit directions',
  transit_label:     'Stop {n}: {stop}',
  walk_me:           'Walk me there',
  welcome:           'Welcome',
};

/** Valid placeholder names per string key (for validation). */
const PLACEHOLDERS: Record<string, string[]> = {
  arrived:         ['stop'],
  begin_from:      ['stop'],
  gallery_counter: ['n', 'total'],
  next_journey:    ['stop'],
  next_stop:       ['stop'],
  start_at:        ['n', 'total'],
  start_from:      ['stop'],
  stop_label:      ['n', 'stop'],
  stop_n:          ['n', 'total'],
  stop_n_of_total: ['n', 'total'],
  stops_visited:   ['n', 'total'],
  transit_label:   ['n', 'stop'],
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
