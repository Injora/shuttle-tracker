import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { AlertBanner, LoadingState, EmptyState } from '@/components/Feedback';
import { useAuth } from '@/context/AuthContext';
import {
  fetchStops,
  fetchMyActiveSession,
  fetchPendingCount,
  callEdgeFunction,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { showLocalAlert } from '@/services/notifications';
import { Stop, ShuttleSession, TripType, DispatchAlert } from '@/types';
import { QUORUM_SIZE, TRIP_TYPE_LABEL } from '@/constants';
import { colors, spacing, radius, font } from '@/theme';

export default function DriverDashboardScreen() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeSession, setActiveSession] = useState<ShuttleSession | null>(null);
  const [alerts, setAlerts] = useState<DispatchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState<TripType | null>(null);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [s, session] = await Promise.all([
        fetchStops(),
        user ? fetchMyActiveSession(user.id) : Promise.resolve(null),
      ]);
      setStops(s);
      setActiveSession(session);

      const countMap: Record<string, number> = {};
      for (const stop of s) {
        countMap[stop.id] = await fetchPendingCount(stop.id);
      }
      setCounts(countMap);

      const { data: alertData } = await supabase
        .from('dispatch_alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(20);
      setAlerts((alertData as DispatchAlert[]) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    const ch = supabase
      .channel('driver-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_alerts' }, (payload) => {
        load();
        const alert = payload.new as DispatchAlert;
        if (alert?.request_count >= QUORUM_SIZE) {
          showLocalAlert('Pickup dispatched', `${alert.request_count} students are waiting at ${alert.stop_id}.`);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const activeTripStops = useMemo(() => {
    if (!activeSession) return new Set<string>();
    if (activeSession.trip_type === 'tribe_run') return new Set(['college', 'hostel_3']);
    return new Set(['college', 'hostel_1', 'hostel_2']);
  }, [activeSession]);

  async function handleActivate(tripType: TripType) {
    setError(null);
    setActivating(tripType);
    try {
      const result = await callEdgeFunction<{ ok: boolean; error?: string }>('manage-session', {
        action: 'activate',
        trip_type: tripType,
      });
      if (!result.ok) setError(result.error ?? 'Failed to activate shuttle.');
      else await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActivating(null);
    }
  }

  async function handleEnd() {
    if (!activeSession) return;
    setError(null);
    setEnding(true);
    try {
      const result = await callEdgeFunction<{ ok: boolean; error?: string }>('manage-session', {
        action: 'end',
        session_id: activeSession.id,
      });
      if (!result.ok) setError(result.error ?? 'Failed to end shuttle.');
      else await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnding(false);
    }
  }

  if (loading) return <Screen><LoadingState message="Loading dashboard…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Driver" subtitle="Shuttle operations dashboard" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {error ? <AlertBanner title="Operation failed" message={error} tone="danger" /> : null}

        {activeSession ? (
          <Card style={styles.card}>
            <CardHeader
              title="Active Session"
              right={<Badge label={TRIP_TYPE_LABEL[activeSession.trip_type as keyof typeof TRIP_TYPE_LABEL]} tone="success" />}
            />
            <Text style={styles.body}>
              You are currently running a {TRIP_TYPE_LABEL[activeSession.trip_type as keyof typeof TRIP_TYPE_LABEL]}.
              Students can now see your live location.
            </Text>
            <Button title="End Shuttle Session" variant="danger" onPress={handleEnd} loading={ending} style={styles.endBtn} />
          </Card>
        ) : (
          <Card style={styles.card}>
            <CardHeader title="Activate Shuttle" subtitle="Choose a trip type to begin" />
            <Button
              title="Start Hostel Run"
              onPress={() => handleActivate('hostel_run')}
              loading={activating === 'hostel_run'}
              style={styles.activateBtn}
            />
            <Text style={styles.hint}>Serves College, YourSpace 2, and Your Space Lohegaon.</Text>
            <Button
              title="Start Tribe Run"
              variant="secondary"
              onPress={() => handleActivate('tribe_run')}
              loading={activating === 'tribe_run'}
              style={styles.activateBtn}
            />
            <Text style={styles.hint}>Serves College and Tribe Loka only (isolated).</Text>
          </Card>
        )}

        <Card style={styles.card}>
          <CardHeader title="Stop Request Counts" subtitle="Live quorum status" />
          {stops.length === 0 ? (
            <EmptyState icon="location-outline" title="No stops configured" />
          ) : (
            stops.map((stop) => {
              const count = counts[stop.id] ?? 0;
              const covered = activeTripStops.has(stop.id);
              return (
                <View key={stop.id} style={styles.stopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    <Text style={styles.stopKind}>{stop.kind === 'college' ? 'College' : 'Hostel'}</Text>
                  </View>
                  <Badge
                    label={`${count} / ${QUORUM_SIZE}`}
                    tone={count >= QUORUM_SIZE ? 'success' : 'info'}
                  />
                  {!covered && activeSession ? <Text style={styles.excluded}>not on this run</Text> : null}
                </View>
              );
            })
          )}
        </Card>

        {alerts.length > 0 ? (
          <Card style={styles.card}>
            <CardHeader title="Recent Dispatch Alerts" />
            {alerts.map((alert) => (
              <View key={alert.id} style={styles.alertRow}>
                <Text style={styles.alertText}>
                  {alert.request_count} students at {alert.stop_id}
                </Text>
                <Text style={styles.alertTime}>{new Date(alert.triggered_at).toLocaleTimeString()}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  body: {
    fontSize: font.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  endBtn: {
    marginTop: spacing.sm,
  },
  activateBtn: {
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopName: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.text,
  },
  stopKind: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  excluded: {
    fontSize: font.size.xs,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertText: {
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    color: colors.text,
  },
  alertTime: {
    fontSize: font.size.xs,
    color: colors.textMuted,
  },
});
