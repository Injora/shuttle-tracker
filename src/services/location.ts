import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const IS_WEB = Platform.OS === 'web';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

export interface LocationSample {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

type LocationListener = (sample: LocationSample) => void;

let listeners: LocationListener[] = [];
let foregroundSubscription: LocationSubscription | null = null;
let isTracking = false;

function toSample(loc: Location.LocationObject): LocationSample {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    heading: loc.coords.heading ?? null,
    speed: loc.coords.speed ?? null,
    accuracy: loc.coords.accuracy ?? null,
    timestamp: loc.timestamp,
  };
}

function emit(sample: LocationSample) {
  for (const l of listeners) {
    try {
      l(sample);
    } catch (e) {
      // A misbehaving listener shouldn't break the stream.
    }
  }
}

if (!IS_WEB) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
    if (error) {
      console.warn('Background location task error', error);
      return;
    }
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      emit(toSample(locations[locations.length - 1]));
    }
  });
}

export async function requestLocationPermissions(background = false) {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    throw new Error('Foreground location permission is required.');
  }
  if (background) {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      throw new Error('Background location permission is required for live tracking.');
    }
  }
  return true;
}

export async function startForegroundTracking(
  highAccuracy = false,
  onLocation?: LocationListener,
): Promise<void> {
  if (isTracking) return;
  await requestLocationPermissions(false);

  if (onLocation) listeners.push(onLocation);

  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: highAccuracy
        ? Location.Accuracy.BestForNavigation
        : Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: highAccuracy ? 2000 : 5000,
    },
    (loc) => emit(toSample(loc)),
  );

  isTracking = true;
}

export async function startBackgroundTracking(): Promise<void> {
  if (IS_WEB) return;
  await requestLocationPermissions(true);

  const started = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (!started) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 10,
      timeInterval: 10000,
      deferredUpdatesInterval: 10000,
      foregroundService: {
        notificationTitle: 'Shuttle Tracker',
        notificationBody: 'Sharing your live location with students',
        notificationColor: '#2563EB',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  if (IS_WEB) return;
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export function stopForegroundTracking(): void {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  isTracking = false;
}

export function addLocationListener(listener: LocationListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function clearLocationListeners(): void {
  listeners = [];
}

export async function getCurrentLocation(): Promise<LocationSample> {
  if (IS_WEB) {
    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        reject(new Error('Geolocation is not supported in this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: Location.LocationObject = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude ?? null,
              accuracy: position.coords.accuracy ?? null,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
            },
            timestamp: position.timestamp,
          };
          resolve(toSample(loc));
        },
        (err) => reject(new Error(err.message || 'Unable to get location.')),
        // Wi-Fi/cell triangulation is more reliable than GPS indoors and on
        // upper floors, so prefer a lower-accuracy, cached-position approach.
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 },
      );
    });
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required.');
  }
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return toSample(loc);
}
