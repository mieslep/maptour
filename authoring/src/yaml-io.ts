import yaml from 'js-yaml';
import type { Tour, TourMeta, Stop, ContentBlock, Leg, GpsConfig, Waypoint } from './types';

/** Remove undefined/null/empty-array fields from an object (shallow). */
function cleanObj(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    result[k] = v;
  }
  return result;
}

function cleanBlock(block: ContentBlock): Record<string, unknown> {
  if (block.type === 'text') {
    return { type: 'text', body: block.body };
  }
  if (block.type === 'image') {
    return cleanObj({ type: 'image', url: block.url, caption: block.caption, alt: block.alt });
  }
  if (block.type === 'gallery') {
    return {
      type: 'gallery',
      images: block.images.map(img => cleanObj({ url: img.url, caption: img.caption, alt: img.alt })),
    };
  }
  if (block.type === 'video') {
    return cleanObj({ type: 'video', url: block.url, caption: block.caption });
  }
  if (block.type === 'audio') {
    return cleanObj({ type: 'audio', url: block.url, label: block.label });
  }
  return block as Record<string, unknown>;
}

function cleanWaypoint(wp: Waypoint): Record<string, unknown> {
  const result: Record<string, unknown> = {
    coords: wp.coords,
    text: wp.text,
  };
  if (wp.photo) result.photo = wp.photo;
  if (wp.journey_card === true) result.journey_card = true;
  if (wp.content && wp.content.length > 0) result.content = wp.content.map(cleanBlock);
  if (wp.radius !== undefined) result.radius = wp.radius;
  return result;
}

function cleanLeg(leg: Leg): Record<string, unknown> {
  const result: Record<string, unknown> = { mode: leg.mode };
  if (leg.note) result.note = leg.note;
  if (leg.route && leg.route.length > 0) result.route = leg.route;
  if (leg.waypoints && leg.waypoints.length > 0) result.waypoints = leg.waypoints.map(cleanWaypoint);
  return result;
}

function cleanStop(stop: Stop): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: stop.id,
    title: stop.title,
    coords: stop.coords,
    content: stop.content.map(cleanBlock),
  };
  if (stop.getting_here) {
    result.getting_here = cleanLeg(stop.getting_here);
  }
  if (stop.arrival_radius !== undefined) {
    result.arrival_radius = stop.arrival_radius;
  }
  return result;
}

/** Current schema version written by the authoring tool. */
const SCHEMA_VERSION = '1.0';

function cleanTourMeta(meta: TourMeta): Record<string, unknown> {
  const result: Record<string, unknown> = {
    schema_version: SCHEMA_VERSION,
    id: meta.id,
    title: meta.title,
  };
  if (meta.description) result.description = meta.description;
  if (meta.duration) result.duration = meta.duration;
  if (meta.nav_mode) result.nav_mode = meta.nav_mode;
  if (meta.close_url) result.close_url = meta.close_url;
  if (meta.welcome && meta.welcome.length > 0) result.welcome = meta.welcome.map(cleanBlock);
  if (meta.goodbye && meta.goodbye.length > 0) result.goodbye = meta.goodbye.map(cleanBlock);
  if (meta.gps) {
    const gps = cleanObj(meta.gps as unknown as Record<string, unknown>);
    if (Object.keys(gps).length > 0) result.gps = gps;
  }
  if (meta.strings) {
    // Only include non-empty string overrides
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta.strings)) {
      if (v && v.trim() !== '') filtered[k] = v;
    }
    if (Object.keys(filtered).length > 0) result.strings = filtered;
  }
  if (meta.getting_here && meta.getting_here.length > 0) result.getting_here = meta.getting_here.map(cleanBlock);
  if (meta.nudge_return) result.nudge_return = true;
  if (meta.require_scroll) result.require_scroll = true;
  return result;
}

export function tourToYaml(tour: Tour): string {
  const obj = {
    tour: cleanTourMeta(tour.tour),
    stops: tour.stops.map(cleanStop),
  };
  return yaml.dump(obj, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    flowLevel: -1,
  });
}

export function yamlToTour(text: string): Tour {
  const raw = yaml.load(text) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid YAML: expected an object');
  }

  const tourMeta = raw.tour as Record<string, unknown> | undefined;
  if (!tourMeta || typeof tourMeta !== 'object') {
    throw new Error('Invalid tour YAML: missing "tour" section');
  }

  const stops = raw.stops as unknown[] | undefined;
  if (!Array.isArray(stops)) {
    throw new Error('Invalid tour YAML: missing "stops" array');
  }

  // Parse tour meta
  const meta: TourMeta = {
    id: String(tourMeta.id ?? `imported-${Date.now()}`),
    title: String(tourMeta.title ?? 'Untitled Tour'),
  };
  if (tourMeta.description) meta.description = String(tourMeta.description);
  if (tourMeta.duration) meta.duration = String(tourMeta.duration);
  if (tourMeta.nav_mode) meta.nav_mode = tourMeta.nav_mode as TourMeta['nav_mode'];
  if (tourMeta.close_url) meta.close_url = String(tourMeta.close_url);
  if (tourMeta.strings) meta.strings = tourMeta.strings as Record<string, string>;
  if (Array.isArray(tourMeta.welcome)) meta.welcome = tourMeta.welcome as ContentBlock[];
  if (Array.isArray(tourMeta.goodbye)) meta.goodbye = tourMeta.goodbye as ContentBlock[];
  if (tourMeta.gps && typeof tourMeta.gps === 'object') meta.gps = tourMeta.gps as GpsConfig;
  if (Array.isArray(tourMeta.getting_here)) meta.getting_here = tourMeta.getting_here as ContentBlock[];
  if (tourMeta.nudge_return === true) meta.nudge_return = true;
  if (tourMeta.require_scroll === true) meta.require_scroll = true;

  // Parse stops
  const parsedStops: Stop[] = stops.map((s, i) => {
    const raw = s as Record<string, unknown>;
    const stop: Stop = {
      id: typeof raw.id === 'number' ? raw.id : i + 1,
      title: String(raw.title ?? `Stop ${i + 1}`),
      coords: Array.isArray(raw.coords) ? [Number(raw.coords[0]), Number(raw.coords[1])] : [0, 0],
      content: Array.isArray(raw.content) ? (raw.content as ContentBlock[]) : [],
    };
    if (raw.getting_here && typeof raw.getting_here === 'object') {
      const gh = raw.getting_here as Record<string, unknown>;
      const leg: Leg = {
        mode: (gh.mode as Leg['mode']) ?? 'walk',
      };
      if (gh.note) leg.note = String(gh.note);
      if (Array.isArray(gh.route)) leg.route = gh.route as [number, number][];
      if (Array.isArray(gh.waypoints)) leg.waypoints = gh.waypoints as Waypoint[];
      // Legacy: silently drop 'journey' field (replaced by waypoints)
      stop.getting_here = leg;
    }
    if (typeof raw.arrival_radius === 'number') {
      stop.arrival_radius = raw.arrival_radius;
    }
    return stop;
  });

  // Stitch route endpoints to match stop coordinates (legacy YAML may have mismatches)
  const n = parsedStops.length;
  for (let i = 0; i < n; i++) {
    const stop = parsedStops[i];
    if (!stop.getting_here?.route?.length) continue;
    const route = stop.getting_here.route;
    const prevIdx = i === 0 ? n - 1 : i - 1;
    route[0] = [...parsedStops[prevIdx].coords] as [number, number];
    route[route.length - 1] = [...stop.coords] as [number, number];
  }

  return { tour: meta, stops: parsedStops };
}

export function downloadYaml(tour: Tour): void {
  const yamlStr = tourToYaml(tour);
  const blob = new Blob([yamlStr], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tour.tour.id}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}
