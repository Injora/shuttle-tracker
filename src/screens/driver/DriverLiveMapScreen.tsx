import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { AlertBanner, LoadingState, EmptyState } from '@/components/Feedback';
import { LiveMap } from '@/components/LiveMap';
import { useAuth } from '@/context/AuthContext';
import {
  fetchStops,
  fetchMyActiveSession,
  callEdgeFunction,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import {
  startForegroundTracking,
  startBackgroundTracking,
  stopForegroundTracking,
  stopBackgroundTracking,
  addLocationListener,
  LocationSample,
} from '@/services/location';
import { KalmanFilter } from '@/utils/kalman';
import { Stop, ShuttleSession } from '@/types';
import { TRIP_TYPE_LABEL } from '@/constants';
import { colors, spacing, font } from '@/theme';

export default function DriverLiveMapScreen() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [session, setSession] = useState<ShuttleSession | null>(null);
  const [current, setCurrent] = useState<LocationSample | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPersisted, setLastPersisted] = useState(0);

  const kalman = useRef(new KalmanFilter());

  useEffect(() => {
    load();
    return () => {
      stopForegroundTracking();
      stopBackgroundTracking();
    };
  }, []);

  async function load() {
    const [s, sess] = await Promise.all([fetchStops(), user ? fetchMyActiveSession(user.id) : Promise.resolve(null)]);
    setStops(s);
    setSession(sess);
  }

  async function startTracking() {
    setError(null);
    try {
      await startBackgroundTracking();
      await startForegroundTracking(true, onLocation);
      setTracking(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function stopTracking() {
    stopForegroundTracking();
    await stopBackgroundTracking();
    kalman.current.reset();
    setCurrent(null);
    setTracking(false);
  }

  function onLocation(sample: LocationSample) {
    const smoothed = kalman.current.update({ lat: sample.lat, lng: sample.lng });
    setCurrent({ ...sample, lat: smoothed.lat, lng: smoothed.lng });

    // Persist sparingly (~every 12s) for history. Live map uses Realtime.
    const now = Date.now();
    if (session && now - lastPersisted > 12000) {
      setLastPersisted(now);
      callEdgeFunction('record-location', {
        session_id: session.id,
        lat: sample.lat,
        lng: sample.lng,
        heading: sample.heading,
        speed: sample.speed,
        accuracy: sample.accuracy,
      }).catch(() => {});
    }
  }

  if (!session) {
    return (
      <Screen>
        <ScreenHeader title="Live Map" subtitle="Share your location" />
        <EmptyState
          icon="navigate-outline"
          title="No active session"
          message="Activate a shuttle session from the Dashboard before sharing your location."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Live Map"
        subtitle={TRIP_TYPE_LABEL[session.trip_type as keyof typeof TRIP_TYPE_LABEL]}
        right={<Badge label={tracking ? 'Sharing' : 'Idle'} tone={tracking ? 'success' : 'neutral'} />}
      />
      <ScrollView>
        {error ? <AlertBanner title="Tracking error" message={error} tone="danger" /> : null}

        <Card style={styles.card}>
          <View style={styles.mapWrap}>
            <LiveMap
              stops={stops}
              shuttleLocation={current ? { ...current, session_id: session.id, id: '', recorded_at: new Date().toISOString() } : null}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <CardHeader title="Location Sharing" subtitle="Students see your live position" />
          {tracking ? (
            <>
              <AlertBanner title="Sharing live" message="Your location is being broadcast to connected students." tone="success" icon="radio" />
              {current ? (
                <Text style={styles.coords}>
                  Lat {current.lat.toFixed(6)} · Lng {current.lng.toFixed(6)}
                </Text>
              ) : null}
              <Button title="Stop Sharing" variant="danger" onPress={stopTracking} />
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Start sharing to broadcast your live location. Location keeps working
                in the background while you drive.
              </Text>
              <Button title="Start Sharing" onPress={startTracking} />
            </>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  mapWrap: {
    height: 320,
  },
  body: {
    fontSize: font.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  coords: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
