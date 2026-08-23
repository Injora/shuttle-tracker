import { useEffect, useState } from 'react';
import { Stop, GeoPoint } from '@/types';
import { getCurrentLocation } from '@/services/location';
import { isWithinRadius } from '@/utils/geo';

export interface GeofenceResult {
  stop: Stop | null;
  inside: boolean;
  distanceM: number | null;
  checking: boolean;
  error: string | null;
}

export function useGeofence(stops: Stop[], allowCollege = false, hostelStopId?: string) {
  const [result, setResult] = useState<GeofenceResult>({
    stop: null,
    inside: false,
    distanceM: null,
    checking: true,
    error: null,
  });

  const candidates = allowCollege
    ? stops.filter((s) => s.id === 'college' || s.id === hostelStopId)
    : stops.filter((s) => s.id === hostelStopId);

  async function check() {
    setResult((r) => ({ ...r, checking: true, error: null }));
    try {
      const loc = await getCurrentLocation();
      const point: GeoPoint = { lat: loc.lat, lng: loc.lng };

      let best: GeofenceResult = {
        stop: null,
        inside: false,
        distanceM: null,
        checking: false,
        error: null,
      };

      for (const stop of candidates) {
        const d = isWithinRadius(point, stop, stop.geofence_radius_m);
        if (d) {
          best = { stop, inside: true, distanceM: 0, checking: false, error: null };
          break;
        }
      }

      setResult(best);
    } catch (e) {
      setResult({
        stop: null,
        inside: false,
        distanceM: null,
        checking: false,
        error: (e as Error).message,
      });
    }
  }

  useEffect(() => {
    if (stops.length > 0) check();
  }, [stops.length, hostelStopId, allowCollege]);

  return { ...result, refresh: check };
}
