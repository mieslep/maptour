import type { Stop } from '../types';

const R = 6371e3; // Earth radius in metres

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearestStopResult {
  index: number;
  distance: number; // metres
}

/** Returns the index and distance of the stop nearest to the given position. */
export function nearestStop(lat: number, lng: number, stops: Stop[]): NearestStopResult {
  if (stops.length === 0) return { index: 0, distance: Infinity };

  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < stops.length; i++) {
    const [sLat, sLng] = stops[i].coords;
    const dist = haversine(lat, lng, sLat, sLng);
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }

  return { index: minIndex, distance: minDist };
}
