// MapTour Type Definitions

export interface BatterySaverConfig {
  stationary_timeout?: number;  // seconds stationary before downshift (default: 120)
  stationary_radius?: number;   // metres — movement within this is "stationary" (default: 10)
  far_stop_distance?: number;   // metres — next stop farther than this triggers reduced polling (default: 500)
  far_stop_max_age?: number;    // maximumAge in ms when far from next stop (default: 60000)
  approach_distance?: number;   // metres — resume high accuracy when this close (default: 200)
}

export interface GpsConfig {
  max_distance?: number;   // max metres from nearest stop for GPS pre-selection (default: 500)
  max_accuracy?: number;   // max GPS accuracy in metres to trust the reading (default: 50)
  arrival_radius?: number; // metres — proximity arrival detection radius (default: 7.5)
  battery_saver?: boolean | BatterySaverConfig;
}

export interface TourMeta {
  schema_version?: string;   // YAML schema version (e.g. "1.0")
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
  header_html?: string;      // custom HTML for menu bar header area (sanitised on render)
  getting_here?: ContentBlock[];  // content blocks for "Getting Here" card (directions to tour start)
  nudge_return?: boolean;          // if true, "Return to start" is the primary action in the finish modal (default false)
  require_scroll?: boolean;        // if true, user must scroll to bottom of stop content before advancing (default false)
  tour_url?: string;               // URL for "Open in MapTour" badge (deep link to native app)
  waypoint_radius?: number;        // default waypoint approach radius in metres (default: 15)
  scroll_hint?: 'auto' | 'always' | 'off';  // mobile scroll-hint rendering mode (default: 'auto')
}

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
  padding_x?: number; // percentage
  padding_y?: number; // percentage
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

export interface MapBlock {
  type: 'map';
  height?: number;      // container height in px (default: 200)
  zoom?: number;        // override zoom level
  offset_x?: number;    // horizontal centre nudge in metres (positive = east)
  offset_y?: number;    // vertical centre nudge in metres (positive = north)
}

export type ContentBlock = TextBlock | ImageBlock | GalleryBlock | VideoBlock | AudioBlock | MapBlock;

export type LegMode = 'walk' | 'drive' | 'transit' | 'cycle';

export interface Waypoint {
  coords: [number, number];
  text: string;
  photo?: string;
  photo_caption?: string;
  photo_alt?: string;
  journey_card?: boolean;
  content?: ContentBlock[];
  radius?: number;
  map_interactive?: boolean;   // default false: lock map (no controls, no pan/zoom) for this waypoint
}

export interface Leg {
  mode: LegMode;
  note?: string;
  route?: [number, number][];   // optional pre-computed waypoints for polyline
  waypoints?: Waypoint[];       // optional waypoints along the leg
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
