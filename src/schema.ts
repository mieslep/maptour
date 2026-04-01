/**
 * MapTour YAML Schema — Zod definitions.
 *
 * This is the single source of truth for the tour YAML format.
 * The player uses it for validation and the types are inferred from it.
 */

import { z } from 'zod';

/** Current schema version. */
export const SCHEMA_VERSION = '1.0';

/** Schema versions this player can load. */
export const SUPPORTED_VERSIONS = ['1.0'] as const;

// ---- Content blocks ----

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  body: z.string(),
});

export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string(),
  caption: z.string().optional(),
  caption_position: z.enum(['above', 'below']).optional(),
  alt: z.string().optional(),
  padding_x: z.number().min(0).max(50).optional(),
  padding_y: z.number().min(0).max(50).optional(),
});

export const GalleryImageSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
  alt: z.string().optional(),
});

export const GalleryBlockSchema = z.object({
  type: z.literal('gallery'),
  images: z.array(GalleryImageSchema).min(1),
});

export const VideoBlockSchema = z.object({
  type: z.literal('video'),
  url: z.string(),
  caption: z.string().optional(),
});

export const AudioBlockSchema = z.object({
  type: z.literal('audio'),
  url: z.string(),
  label: z.string().optional(),
});

export const ContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  ImageBlockSchema,
  GalleryBlockSchema,
  VideoBlockSchema,
  AudioBlockSchema,
]);

// ---- Leg / getting_here ----

export const LegModeSchema = z.enum(['walk', 'drive', 'transit', 'cycle']);

export const LegSchema = z.object({
  mode: LegModeSchema,
  note: z.string().optional(),
  route: z.array(z.tuple([z.number(), z.number()])).optional(),
  journey: z.array(ContentBlockSchema).optional(),
});

// ---- GPS config ----

export const BatterySaverConfigSchema = z.object({
  stationary_timeout: z.number().optional(),
  stationary_radius: z.number().optional(),
  far_stop_distance: z.number().optional(),
  far_stop_max_age: z.number().optional(),
  approach_distance: z.number().optional(),
});

export const GpsConfigSchema = z.object({
  max_distance: z.number().optional(),
  max_accuracy: z.number().optional(),
  arrival_radius: z.number().optional(),
  battery_saver: z.union([z.boolean(), BatterySaverConfigSchema]).optional(),
});

// ---- Stop ----

export const StopSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  coords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  content: z.array(ContentBlockSchema),
  getting_here: LegSchema.optional(),
  arrival_radius: z.number().positive().optional(),
});

// ---- Tour metadata ----

export const TourMetaSchema = z.object({
  schema_version: z.string().optional(),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  duration: z.string().optional(),
  nav_mode: LegModeSchema.optional(),
  close_url: z.string().optional(),
  strings: z.record(z.string()).optional(),
  welcome: z.array(ContentBlockSchema).optional(),
  goodbye: z.array(ContentBlockSchema).optional(),
  gps: GpsConfigSchema.optional(),
});

// ---- Top-level tour file ----

export const TourFileSchema = z.object({
  tour: TourMetaSchema,
  stops: z.array(StopSchema).min(1),
});

// ---- Inferred types ----

export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type GalleryImage = z.infer<typeof GalleryImageSchema>;
export type Leg = z.infer<typeof LegSchema>;
export type LegMode = z.infer<typeof LegModeSchema>;
export type Stop = z.infer<typeof StopSchema>;
export type TourMeta = z.infer<typeof TourMetaSchema>;
export type Tour = z.infer<typeof TourFileSchema>;
export type GpsConfig = z.infer<typeof GpsConfigSchema>;
export type BatterySaverConfig = z.infer<typeof BatterySaverConfigSchema>;

/**
 * Validate a parsed YAML object against the tour schema.
 * Returns null on success, or a human-readable error string.
 */
export function validateTourData(data: unknown): string | null {
  // Check schema version first (before full validation)
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.tour === 'object' && d.tour !== null) {
      const meta = d.tour as Record<string, unknown>;
      if (meta.schema_version !== undefined) {
        const version = String(meta.schema_version);
        if (!SUPPORTED_VERSIONS.includes(version as typeof SUPPORTED_VERSIONS[number])) {
          return `Unsupported schema version "${version}". This player supports: ${SUPPORTED_VERSIONS.join(', ')}. Please update the player or downgrade the tour file.`;
        }
      }
    }
  }

  const result = TourFileSchema.safeParse(data);
  if (result.success) {
    // Additional checks that Zod can't express easily
    const tour = result.data;
    const seenIds = new Set<number>();
    for (const stop of tour.stops) {
      if (seenIds.has(stop.id)) {
        return `Duplicate stop id: ${stop.id}`;
      }
      seenIds.add(stop.id);
    }
    return null;
  }

  // Format the first Zod error into a readable message
  const issue = result.error.issues[0];
  const path = issue.path.join('.');
  return `${path ? path + ': ' : ''}${issue.message}`;
}
