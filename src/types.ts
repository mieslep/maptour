// MapTour Type Definitions

export interface GpsConfig {
  max_distance?: number;   // max metres from nearest stop for GPS pre-selection (default: 5000)
  max_accuracy?: number;   // max GPS accuracy in metres to trust the reading (default: 500)
  arrival_radius?: number; // metres — proximity arrival detection radius (default: 50)
}

export interface TourMeta {
  id: string;
  title: string;
  description?: string;
  duration?: string;       // optional display string e.g. "45–60 minutes"
  nav_mode?: LegMode;      // tour-level default travel mode; per-stop getting_here.mode takes priority
  close_url?: string;      // URL to navigate to when user finishes the tour
  strings?: Record<string, string>;  // i18n overrides for UI labels
  welcome?: ContentBlock[];  // optional rich content for the start screen
  goodbye?: ContentBlock[];  // optional rich content for the completion screen
  gps?: GpsConfig;          // GPS behaviour tuning
}

export interface TextBlock {
  type: 'text';
  body: string;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  caption?: string;
  alt?: string;
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

export type LegMode = 'walk' | 'drive' | 'transit' | 'cycle';

export interface Leg {
  mode: LegMode;
  note?: string;
  route?: [number, number][];   // optional pre-computed waypoints for polyline
  journey?: ContentBlock[];     // optional content shown between stops
}

export interface Stop {
  id: number;
  title: string;
  coords: [number, number]; // [lat, lng]
  content: ContentBlock[];
  getting_here?: Leg;
  arrival_radius?: number;  // per-stop override for proximity arrival radius (metres)
}

export interface Tour {
  tour: TourMeta;
  stops: Stop[];
}

export interface TourLoadSuccess {
  tour: Tour;
  error?: never;
}

export interface TourLoadError {
  error: string;
  tour?: never;
}

export type TourLoadResult = TourLoadSuccess | TourLoadError;

export interface MapTourInitOptions {
  container: string | HTMLElement;
  tourUrl: string;
  startStop?: number;
}
