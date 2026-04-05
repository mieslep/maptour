// Authoring types — mirrors player types for YAML compatibility

export type LegMode = 'walk' | 'drive' | 'transit' | 'cycle';

export interface TextBlock {
  type: 'text';
  body: string;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  caption?: string;
  caption_position?: 'above' | 'below';
  alt?: string;
  padding_x?: number;
  padding_y?: number;
}

export interface GalleryImage {
  url: string;
  caption?: string;
  alt?: string;
}

export interface GalleryBlock {
  type: 'gallery';
  images: GalleryImage[];
}

export interface VideoBlock {
  type: 'video';
  url: string;
  caption?: string;
}

export interface AudioBlock {
  type: 'audio';
  url: string;
  label?: string;
}

export type ContentBlock = TextBlock | ImageBlock | GalleryBlock | VideoBlock | AudioBlock;

export interface Leg {
  mode: LegMode;
  note?: string;
  route?: [number, number][];
  journey?: ContentBlock[];
}

export interface GpsConfig {
  max_distance?: number;
  max_accuracy?: number;
  arrival_radius?: number;
}

export interface Stop {
  id: number;
  title: string;
  coords: [number, number];
  content: ContentBlock[];
  getting_here?: Leg;
  arrival_radius?: number;
}

export interface TourMeta {
  schema_version?: string;
  id: string;
  title: string;
  description?: string;
  duration?: string;
  nav_mode?: LegMode;
  close_url?: string;
  strings?: Record<string, string>;
  welcome?: ContentBlock[];
  goodbye?: ContentBlock[];
  gps?: GpsConfig;
  nudge_return?: boolean;
  require_scroll?: boolean;
}

export interface Tour {
  tour: TourMeta;
  stops: Stop[];
}

/** Stored tour entry in localStorage */
export interface StoredTour {
  tour: Tour;
  lastModified: string; // ISO date
}

/** All tours in localStorage */
export interface TourStore {
  tours: Record<string, StoredTour>; // keyed by tour.tour.id
  activeTourId: string | null;
}
