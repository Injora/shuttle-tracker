import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Stop, ShuttleLocation, GeoPoint } from '@/types';
import { colors } from '@/theme';

interface LiveMapProps {
  stops: Stop[];
  shuttleLocation?: ShuttleLocation | null;
  userLocation?: GeoPoint | null;
  signalDegraded?: boolean;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

let leafletPromise: Promise<unknown> | null = null;

async function fetchRouteGeometry(
  points: Array<[number, number]>,
): Promise<Array<[number, number]>> {
  if (points.length < 2) return points;

  const coords = points
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    );
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(geometry) || geometry.length === 0) {
      throw new Error('No route geometry');
    }
    // OSRM returns [lng, lat]; Leaflet wants [lat, lng].
    return geometry.map(([lng, lat]: [number, number]) => [lat, lng]);
  } catch {
    return points;
  }
}

function loadLeaflet(): Promise<unknown> {
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const existing = (window as any).L;
      if (existing) {
        resolve(existing);
        return;
      }

      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => resolve((window as any).L);
      script.onerror = () => reject(new Error('Leaflet failed to load.'));
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}

export function LiveMap({
  stops,
  shuttleLocation,
  userLocation,
  signalDegraded = false,
}: LiveMapProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;

        const map = new (L as any).Map(containerRef.current, {
          center: [18.614, 73.912],
          zoom: 15,
          zoomControl: true,
        });

        new (L as any).TileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          },
        ).addTo(map);

        mapRef.current = map;
        setReady(true);

        // Ensure tiles size correctly after the React Native flex layout settles.
        setTimeout(() => map.invalidateSize(), 0);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const L = (window as any).L;
    const map = mapRef.current;

    layersRef.current.forEach((layer) => {
      try {
        layer.remove();
      } catch {
        // Ignore layers already removed by Leaflet.
      }
    });
    layersRef.current = [];

    const points: Array<[number, number]> = [];

    if (stops.length > 1) {
      const stopPoints = stops.map((s) => [s.lat, s.lng] as [number, number]);
      fetchRouteGeometry(stopPoints)
        .then((routePoints) => {
          if (!mapRef.current) return;
          const route = L.polyline(routePoints, {
            color: colors.primary,
            weight: 5,
            opacity: 0.9,
          }).addTo(mapRef.current);
          layersRef.current.push(route);
        })
        .catch(() => {});
    }

    stops.forEach((stop) => {
      const marker = L.circleMarker([stop.lat, stop.lng], {
        radius: 8,
        color: '#FFFFFF',
        weight: 2,
        fillColor: stop.kind === 'college' ? colors.primary : colors.accent,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(stop.name);
      layersRef.current.push(marker);
      points.push([stop.lat, stop.lng]);
    });

    if (shuttleLocation) {
      const marker = L.circleMarker([shuttleLocation.lat, shuttleLocation.lng], {
        radius: 11,
        color: '#FFFFFF',
        weight: 3,
        fillColor: signalDegraded ? colors.warning : colors.primary,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('Shuttle');
      layersRef.current.push(marker);
      points.push([shuttleLocation.lat, shuttleLocation.lng]);
    }

    if (userLocation) {
      const marker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 7,
        color: '#FFFFFF',
        weight: 2,
        fillColor: colors.success,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('You');
      layersRef.current.push(marker);
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
    }
  }, [ready, stops, shuttleLocation, userLocation, signalDegraded]);

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Map unavailable</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  return <View ref={containerRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  error: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  errorDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
