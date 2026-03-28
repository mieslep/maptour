// MapTour Type Definitions

export interface TourMeta {
  id: string;
  title: string;
  description?: string;
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

export type LegMode = 'walk' | 'drive';

export interface Leg {
  mode: LegMode;
  note?: string;
}

export interface Stop {
  id: number;
  title: string;
  coords: [number, number]; // [lat, lng]
  content: ContentBlock[];
  leg_to_next?: Leg;
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
