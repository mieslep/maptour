import * as yaml from 'js-yaml';
import type { Tour, Stop, ContentBlock, TourLoadResult } from './types';

const VALID_BLOCK_TYPES = new Set(['text', 'image', 'gallery', 'video', 'audio']);
const VALID_LEG_MODES = new Set(['walk', 'drive', 'transit', 'cycle']);

function validateContentBlock(block: unknown, stopId: number | string, index: number): string | null {
  if (typeof block !== 'object' || block === null) {
    return `Stop ${stopId}, content[${index}]: block must be an object`;
  }
  const b = block as Record<string, unknown>;
  if (typeof b.type !== 'string') {
    return `Stop ${stopId}, content[${index}]: missing required field "type"`;
  }
  if (!VALID_BLOCK_TYPES.has(b.type)) {
    return `Stop ${stopId}, content[${index}]: unknown block type "${b.type}". Must be one of: text, image, gallery, video, audio`;
  }
  if (b.type === 'text' && typeof b.body !== 'string') {
    return `Stop ${stopId}, content[${index}]: text block missing required field "body"`;
  }
  if (b.type === 'image' && typeof b.url !== 'string') {
    return `Stop ${stopId}, content[${index}]: image block missing required field "url"`;
  }
  if (b.type === 'gallery') {
    if (!Array.isArray(b.images) || b.images.length === 0) {
      return `Stop ${stopId}, content[${index}]: gallery block requires a non-empty "images" array`;
    }
    for (let i = 0; i < b.images.length; i++) {
      const img = b.images[i];
      if (typeof img !== 'object' || img === null || typeof (img as Record<string, unknown>).url !== 'string') {
        return `Stop ${stopId}, content[${index}]: gallery images[${i}] missing required field "url"`;
      }
    }
  }
  if (b.type === 'video' && typeof b.url !== 'string') {
    return `Stop ${stopId}, content[${index}]: video block missing required field "url"`;
  }
  if (b.type === 'audio' && typeof b.url !== 'string') {
    return `Stop ${stopId}, content[${index}]: audio block missing required field "url"`;
  }
  return null;
}

function validateStop(stop: unknown, index: number): string | null {
  if (typeof stop !== 'object' || stop === null) {
    return `stops[${index}]: must be an object`;
  }
  const s = stop as Record<string, unknown>;

  if (typeof s.id !== 'number') {
    return `stops[${index}]: missing or invalid required field "id" (must be a number)`;
  }
  if (typeof s.title !== 'string' || s.title.trim() === '') {
    return `Stop ${s.id}: missing required field "title"`;
  }
  if (!Array.isArray(s.coords) || s.coords.length !== 2 ||
      typeof s.coords[0] !== 'number' || typeof s.coords[1] !== 'number') {
    return `Stop ${s.id}: "coords" must be an array of two numbers [lat, lng]`;
  }
  const [lat, lng] = s.coords as [number, number];
  if (lat < -90 || lat > 90) {
    return `Stop ${s.id}: latitude ${lat} is out of range (-90 to 90)`;
  }
  if (lng < -180 || lng > 180) {
    return `Stop ${s.id}: longitude ${lng} is out of range (-180 to 180)`;
  }
  if (!Array.isArray(s.content)) {
    return `Stop ${s.id}: "content" must be an array (can be empty)`;
  }
  for (let i = 0; i < s.content.length; i++) {
    const err = validateContentBlock(s.content[i], s.id, i);
    if (err) return err;
  }
  if (s.getting_here !== undefined) {
    const leg = s.getting_here as Record<string, unknown>;
    if (typeof leg !== 'object' || leg === null) {
      return `Stop ${s.id}: "getting_here" must be an object`;
    }
    if (typeof leg.mode !== 'string' || !VALID_LEG_MODES.has(leg.mode)) {
      return `Stop ${s.id}: "getting_here.mode" must be one of: walk, drive, transit, cycle`;
    }
  }
  return null;
}

function validateTour(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return 'Tour file must contain a YAML object at the root level';
  }
  const d = data as Record<string, unknown>;

  if (typeof d.tour !== 'object' || d.tour === null) {
    return 'Missing required top-level "tour" object';
  }
  const meta = d.tour as Record<string, unknown>;
  if (typeof meta.id !== 'string' || meta.id.trim() === '') {
    return 'Missing required field "tour.id"';
  }
  if (typeof meta.title !== 'string' || meta.title.trim() === '') {
    return 'Missing required field "tour.title"';
  }
  if (meta.nav_mode !== undefined) {
    if (typeof meta.nav_mode !== 'string' || !VALID_LEG_MODES.has(meta.nav_mode)) {
      console.warn(`MapTour: unrecognised tour.nav_mode "${meta.nav_mode}" — falling back to "walk". Valid values: walk, drive, transit, cycle`);
      meta.nav_mode = 'walk';
    }
  }
  // Validate optional welcome/goodbye content blocks
  for (const field of ['welcome', 'goodbye'] as const) {
    if (meta[field] !== undefined) {
      if (!Array.isArray(meta[field])) {
        return `"tour.${field}" must be an array of content blocks`;
      }
      for (let i = 0; i < (meta[field] as unknown[]).length; i++) {
        const err = validateContentBlock((meta[field] as unknown[])[i], field, i);
        if (err) return err;
      }
    }
  }

  if (!Array.isArray(d.stops) || d.stops.length === 0) {
    return 'Missing required "stops" array (must have at least one stop)';
  }

  const seenIds = new Set<number>();
  for (let i = 0; i < d.stops.length; i++) {
    const err = validateStop(d.stops[i], i);
    if (err) return err;
    const stop = d.stops[i] as Record<string, unknown>;
    const id = stop.id as number;
    if (seenIds.has(id)) {
      return `Duplicate stop id: ${id}`;
    }
    seenIds.add(id);
  }
  return null;
}

export async function loadTour(tourUrl: string): Promise<TourLoadResult> {
  let response: Response;
  try {
    response = await fetch(tourUrl);
  } catch (e) {
    return { error: `Network error: could not fetch tour file from "${tourUrl}". ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!response.ok) {
    return { error: `Failed to load tour file: HTTP ${response.status} ${response.statusText} for "${tourUrl}"` };
  }

  let text: string;
  try {
    text = await response.text();
  } catch (e) {
    return { error: `Failed to read tour file response: ${e instanceof Error ? e.message : String(e)}` };
  }

  let data: unknown;
  try {
    data = yaml.load(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `YAML parse error: ${msg}` };
  }

  const validationError = validateTour(data);
  if (validationError) {
    return { error: `Tour validation error: ${validationError}` };
  }

  return { tour: data as Tour };
}

export function parseTourFromString(yamlText: string): TourLoadResult {
  let data: unknown;
  try {
    data = yaml.load(yamlText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `YAML parse error: ${msg}` };
  }

  const validationError = validateTour(data);
  if (validationError) {
    return { error: `Tour validation error: ${validationError}` };
  }

  return { tour: data as Tour };
}

export type { Tour, Stop, ContentBlock };
