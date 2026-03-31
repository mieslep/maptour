import * as yaml from 'js-yaml';
import type { TourLoadResult } from './types';
import { validateTourData, SCHEMA_VERSION } from './schema';
import type { Tour, Stop, ContentBlock } from './schema';

export { SCHEMA_VERSION };

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

  const validationError = validateTourData(data);
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

  const validationError = validateTourData(data);
  if (validationError) {
    return { error: `Tour validation error: ${validationError}` };
  }

  return { tour: data as Tour };
}

export type { Tour, Stop, ContentBlock };
