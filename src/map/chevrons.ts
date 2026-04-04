/**
 * ChevronPlacer — calculates chevron positions along a polyline path.
 *
 * Given a path of [lat, lng] coordinates and a direction flag, returns
 * evenly spaced chevron placements with bearing angles for rendering
 * directional indicators on the map.
 */

export interface ChevronPlacement {
  lat: number;
  lng: number;
  angle: number; // degrees, 0 = north, clockwise
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MIN_SEGMENT_M = 30;

/** Haversine distance between two points in metres. */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from point 1 to point 2 in degrees (0 = north, clockwise). */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2 * DEG_TO_RAD);
  const x = Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD)
    - Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLng);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

/** Interpolate a point along the segment from p1 to p2 at fraction t (0–1). */
function interpolate(
  lat1: number, lng1: number, lat2: number, lng2: number, t: number
): [number, number] {
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
}

/**
 * Place chevrons along a polyline path at regular intervals.
 *
 * @param path Array of [lat, lng] coordinates
 * @param reversed If true, chevrons point in the reverse direction
 * @param intervalM Distance between chevrons in metres (default 35)
 * @returns Array of chevron placements with position and bearing angle
 */
export function placeChevrons(
  path: [number, number][],
  reversed = false,
  intervalM = 35,
): ChevronPlacement[] {
  if (path.length < 2) return [];

  const placements: ChevronPlacement[] = [];
  let accumulated = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lng1] = path[i];
    const [lat2, lng2] = path[i + 1];
    const segDist = haversine(lat1, lng1, lat2, lng2);

    if (segDist < MIN_SEGMENT_M && i < path.length - 2) {
      accumulated += segDist;
      continue;
    }

    const segBearing = bearing(lat1, lng1, lat2, lng2);
    const angle = reversed ? (segBearing + 180) % 360 : segBearing;

    // Place chevrons along this segment
    let remaining = intervalM - accumulated;
    let pos = remaining;

    while (pos <= segDist) {
      const t = pos / segDist;
      const [lat, lng] = interpolate(lat1, lng1, lat2, lng2, t);
      placements.push({ lat, lng, angle });
      pos += intervalM;
    }

    accumulated = segDist - (pos - intervalM);
  }

  return placements;
}
