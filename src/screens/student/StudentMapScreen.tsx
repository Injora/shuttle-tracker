import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AlertBanner, LoadingState, EmptyState } from '@/components/Feedback';
import { LiveMap } from '@/components/LiveMap';
import {
  fetchStops,
  fetchActiveSessions,
  fetchSessionLocation,
  subscribeToChannel,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Stop, ShuttleSession, ShuttleLocation, LiveSession, DriverProfile } from '@/types';
import { SIGNAL_STATUS_LABEL, TRIP_TYPE_LABEL } from '@/constants';
import { colors, spacing, font } from '@/theme';
import { distanceMeters, formatDistance } from '@/utils/geo';

export default function StudentMapScreen() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [sessions, setSessions] = useState<ShuttleSession[]>([]);
  const [locations, setLocations] = useState<Record<string, ShuttleLocation | null>>({});
  const [drivers, setDrivers] = useState<Record<string, DriverProfile>>({});
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

  if (loading) return <Screen><LoadingState message="Loading live shuttle…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Live Shuttle" subtitle="Real-time shuttle location" />

      {liveSessions.length === 0 ? (
        <EmptyState
          icon="bus-outline"
          title="No active shuttle"
          message="There is no shuttle on the road right now. Check back when a trip is dispatched."
        />
      ) : (
        <ScrollView>
          {liveSessions.map((session) => (
            <Card key={session.id} style={styles.card}>
              <CardHeader
                title={TRIP_TYPE_LABEL[session.trip_type as keyof typeof TRIP_TYPE_LABEL]}
                subtitle={`Driver: ${session.driver?.full_name ?? 'Assigned'}`}
                right={<Badge label={SIGNAL_STATUS_LABEL[session.signal as keyof typeof SIGNAL_STATUS_LABEL]} tone={session.signal === 'ok' ? 'success' : 'warning'} />}
              />

              {session.signal === 'degraded' ? (
                <AlertBanner
                  title="Driver's network is unavailable"
                  message="The bus was last seen heading toward the hostels. Tracking will resume automatically."
                  tone="warning"
                  icon="cloud-offline-outline"
                />
              ) : null}

              <View style={styles.mapWrap}>
                <LiveMap
                  stops={stops}
                  shuttleLocation={session.location}
                  signalDegraded={session.signal === 'degraded'}
                />
              </View>

              {session.location && myStop ? (
                <View style={styles.etaRow}>
                  <Text style={styles.etaLabel}>Distance to your stop</Text>
                  <Text style={styles.etaValue}>
                    {formatDistance(distanceMeters({ lat: session.location.lat, lng: session.location.lng }, myStop))}
                  </Text>
                </View>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
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
