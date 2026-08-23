import { GeoPoint } from '@/types';

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in meters between two points. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isWithinRadius(
  point: GeoPoint,
  center: GeoPoint,
  radiusM: number,
): boolean {
  return distanceMeters(point, center) <= radiusM;
}

/** Bearing in degrees (0–360) from `from` to `to`. */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export interface NeighborResult {
  nearest: GeoPoint;
  distance: number;
  bearing: number;
}

export function nearestOf(
  point: GeoPoint,
  candidates: GeoPoint[],
): NeighborResult | null {
  if (candidates.length === 0) return null;

  let nearest = candidates[0];
  let min = distanceMeters(point, nearest);

  for (const c of candidates) {
    const d = distanceMeters(point, c);
    if (d < min) {
      min = d;
      nearest = c;
    }
  }

  return { nearest, distance: min, bearing: bearingDegrees(point, nearest) };
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
}
