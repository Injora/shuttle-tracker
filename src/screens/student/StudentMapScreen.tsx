import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AlertBanner, LoadingState } from '@/components/Feedback';
import { LiveMap } from '@/components/LiveMap';
import {
  fetchStops,
  fetchActiveSessions,
  fetchSessionLocation,
  subscribeToChannel,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Stop, ShuttleSession, ShuttleLocation, LiveSession, DriverProfile, GeoPoint } from '@/types';
import { SIGNAL_STATUS_LABEL, TRIP_TYPE_LABEL } from '@/constants';
import { colors, spacing, font } from '@/theme';
import { distanceMeters, formatDistance } from '@/utils/geo';
import { startForegroundTracking, stopForegroundTracking, addLocationListener } from '@/services/location';

export default function StudentMapScreen() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [sessions, setSessions] = useState<ShuttleSession[]>([]);
  const [locations, setLocations] = useState<Record<string, ShuttleLocation | null>>({});
  const [drivers, setDrivers] = useState<Record<string, DriverProfile>>({});
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [s, active] = await Promise.all([fetchStops(), fetchActiveSessions()]);
    setStops(s);
    setSessions(active);

    const locMap: Record<string, ShuttleLocation | null> = {};
    const driverMap: Record<string, DriverProfile> = {};
    for (const session of active) {
      const [loc, driverRes] = await Promise.all([
        fetchSessionLocation(session.id),
        supabase.from('drivers').select('*').eq('user_id', session.driver_id).maybeSingle(),
      ]);
      locMap[session.id] = loc;
      if (driverRes.data) driverMap[session.driver_id] = driverRes.data as DriverProfile;
    }
    setLocations(locMap);
    setDrivers(driverMap);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = subscribeToChannel<ShuttleLocation>('shuttle_locations', () => load());
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const remove = addLocationListener((sample) => {
      if (active) setUserLocation({ lat: sample.lat, lng: sample.lng });
    });
    startForegroundTracking(false).catch(() => {
      // Location is optional on the map; don't block the screen on it.
    });
    return () => {
      active = false;
      remove();
      stopForegroundTracking();
    };
  }, []);

  const liveSessions: LiveSession[] = useMemo(
    () =>
      sessions.map((s) => ({
        ...s,
        driver: drivers[s.driver_id],
        location: locations[s.id] ?? null,
      })),
    [sessions, locations, drivers],
  );

  const myStop = useMemo(() => stops.find((s) => s.id === user?.student?.hostel_stop_id), [stops, user]);

  const primarySession = liveSessions[0] ?? null;

  if (loading) return <Screen><LoadingState message="Loading map…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Live Shuttle" subtitle="Your location and nearby stops" />

      <ScrollView>
        {primarySession ? (
          <Card style={styles.card}>
            <CardHeader
              title={TRIP_TYPE_LABEL[primarySession.trip_type as keyof typeof TRIP_TYPE_LABEL]}
              subtitle={`Driver: ${primarySession.driver?.full_name ?? 'Assigned'}`}
              right={<Badge label={SIGNAL_STATUS_LABEL[primarySession.signal as keyof typeof SIGNAL_STATUS_LABEL]} tone={primarySession.signal === 'ok' ? 'success' : 'warning'} />}
            />

            {primarySession.signal === 'degraded' ? (
              <AlertBanner
                title="Driver's network is unavailable"
                message="The bus was last seen heading toward the hostels. Tracking will resume automatically."
                tone="warning"
                icon="cloud-offline-outline"
              />
            ) : null}
          </Card>
        ) : (
          <AlertBanner
            title="No active shuttle"
            message="There is no shuttle on the road right now. You can still see your own location and the stops below."
            tone="info"
            icon="bus-outline"
          />
        )}

        <Card style={styles.card}>
          <View style={styles.mapWrap}>
            <LiveMap
              stops={stops}
              shuttleLocation={primarySession?.location ?? null}
              userLocation={userLocation}
              signalDegraded={primarySession?.signal === 'degraded'}
            />
          </View>

          {primarySession?.location && myStop ? (
            <View style={styles.etaRow}>
              <Text style={styles.etaLabel}>Distance to your stop</Text>
              <Text style={styles.etaValue}>
                {formatDistance(distanceMeters({ lat: primarySession.location.lat, lng: primarySession.location.lng }, myStop))}
              </Text>
            </View>
          ) : null}
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
    height: 280,
    marginBottom: spacing.md,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: font.size.sm,
    color: colors.textSecondary,
  },
  etaValue: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: colors.text,
  },
});
