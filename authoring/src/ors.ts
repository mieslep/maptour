import { getOrsApiKey, setOrsApiKey } from './store';

/**
 * Generate a walking route between two points using OpenRouteService.
 * Returns an array of [lat, lng] coordinate pairs.
 */
export async function generateRoute(
  from: [number, number],
  to: [number, number],
): Promise<[number, number][]> {
  const apiKey = getOrsApiKey();
  if (!apiKey) {
    throw new Error('ORS API key is required. Set it via the API key dialog.');
  }

  // ORS expects [lng, lat] not [lat, lng]
  const body = {
    coordinates: [
      [from[1], from[0]],
      [to[1], to[0]],
    ],
  };

  const response = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let text = '';
    try { text = await response.text(); } catch { /* ignore */ }
    if (response.status === 401) {
      setOrsApiKey(''); // Only clear on definite auth rejection
      throw new Error('Invalid ORS API key. It has been cleared — try again.');
    }
    if (response.status === 403) {
      throw new Error('ORS API rejected the request (403). Check your API key and quota at openrouteservice.org/dev');
    }
    throw new Error(`ORS API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length === 0) {
    throw new Error('ORS returned no route geometry');
  }

  // GeoJSON returns [lng, lat], convert to [lat, lng]
  return coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
}

/** Decode Google-style encoded polyline (used by ORS). Returns [lat, lng][] */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Generate routes for all consecutive stop pairs.
 * Returns a map of stop index -> route points.
 */
export async function generateAllRoutes(
  stops: Array<{ coords: [number, number] }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<number, [number, number][]>> {
  const routes = new Map<number, [number, number][]>();
  const total = stops.length - 1;

  for (let i = 0; i < total; i++) {
    try {
      const route = await generateRoute(stops[i].coords, stops[i + 1].coords);
      routes.set(i, route);
      onProgress?.(i + 1, total);
      // Rate limit: ORS free tier is 40 req/min
      if (i < total - 1) {
        await new Promise(r => setTimeout(r, 1600));
      }
    } catch (e) {
      console.error(`Failed to generate route ${i + 1} -> ${i + 2}:`, e);
      throw e;
    }
  }

  return routes;
}
