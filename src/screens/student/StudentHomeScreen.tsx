import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { AlertBanner, LoadingState, EmptyState } from '@/components/Feedback';
import RequestRoster from '@/components/RequestRoster';
import { useGeofence } from '@/hooks/useGeofence';
import { fetchStops, fetchMyActiveRequest, callEdgeFunction, fetchPendingCount } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation } from '@/services/location';
import { Stop, PickupRequest } from '@/types';
import { QUORUM_SIZE, PICKUP_STATUS_LABEL } from '@/constants';
import { colors, spacing, radius, font } from '@/theme';

export default function StudentHomeScreen() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [activeRequest, setActiveRequest] = useState<PickupRequest | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hostelStopId = user?.student?.hostel_stop_id;

  const geofence = useGeofence(stops, false, hostelStopId);

  async function load() {
    try {
      const [s, req, count] = await Promise.all([
        fetchStops(),
        user ? fetchMyActiveRequest(user.id) : Promise.resolve(null),
        hostelStopId ? fetchPendingCount(hostelStopId) : Promise.resolve(0),
      ]);
      setStops(s);
      setActiveRequest(req);
      setPendingCount(count);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [hostelStopId]);

  useEffect(() => {
    if (!hostelStopId) return;
    const channel = supabase
      .channel('student-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests', filter: `student_id=eq.${user?.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostelStopId]);

  const hostelStop = useMemo(
    () => stops.find((s) => s.id === hostelStopId),
    [stops, hostelStopId],
  );

  async function handleRequest() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const loc = await getCurrentLocation();
      const stopId = geofence.stop?.id ?? hostelStopId;
      const result = await callEdgeFunction<{ ok: boolean; error?: string; dispatched?: boolean }>(
        'submit-request',
        {
          student_id: user!.id,
          stop_id: stopId,
          lat: loc.lat,
          lng: loc.lng,
        },
      );
      if (!result.ok) {
        setError(result.error ?? 'Request failed.');
      } else {
        setSuccess(result.dispatched ? 'Pickup dispatched! The driver is on the way.' : 'Request submitted.');
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!activeRequest) return;
    const { error: cancelErr } = await supabase
      .from('pickup_requests')
      .update({ status: 'cancelled' })
      .eq('id', activeRequest.id)
      .eq('student_id', user!.id);
    if (cancelErr) setError(cancelErr.message);
    else await load();
  }

  if (loading) return <Screen><LoadingState message="Loading your stop…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Hi there" subtitle="Track your hostel shuttle" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <AlertBanner title="Something went wrong" message={error} tone="danger" /> : null}
        {success ? <AlertBanner title="Success" message={success} tone="success" /> : null}

        {activeRequest ? (
          <Card style={styles.card}>
            <CardHeader title="Your pickup request" right={<Badge label={PICKUP_STATUS_LABEL[activeRequest.status as keyof typeof PICKUP_STATUS_LABEL]} tone={activeRequest.status === 'dispatched' ? 'success' : 'primary'} />} />
            <Text style={styles.body}>
              {activeRequest.status === 'dispatched'
                ? 'A shuttle has been dispatched to your stop. Watch the live map for the bus location.'
                : 'Your request is pending. You will be notified when the shuttle is dispatched.'}
            </Text>
            <Button title="Cancel Request" variant="outline" onPress={handleCancel} style={styles.cancel} />
          </Card>
        ) : (
          <Card style={styles.card}>
            <CardHeader
              title={geofence.stop?.name ?? hostelStop?.name ?? 'Your stop'}
              subtitle={geofence.stop ? 'Request a pickup from your current stop' : 'Request a pickup from your hostel'}
              right={<Badge label={`${pendingCount} / ${QUORUM_SIZE} requested`} tone={pendingCount >= QUORUM_SIZE ? 'success' : 'info'} />}
            />

            {geofence.checking ? (
              <LoadingState message="Checking your location…" />
            ) : geofence.inside && geofence.stop ? (
              <View>
                <AlertBanner title="You're at your stop" message={`You're inside the ${geofence.stop.name} pickup area.`} tone="success" icon="location" />
                <Button
                  title="Request Pickup"
                  onPress={handleRequest}
                  loading={submitting}
                  size="lg"
                />
              </View>
            ) : (
              <View>
                <AlertBanner
                  title="Not at a registered stop"
                  message="You must be inside your hostel's or the college geofence to request a pickup."
                  tone="warning"
                  icon="location-outline"
                />
                <Button title="Check Location Again" variant="outline" onPress={geofence.refresh} />
              </View>
            )}
          </Card>
        )}

        <Card style={styles.card}>
          <CardHeader title="How it works" />
          <Text style={styles.body}>
            Request a pickup from your hostel. Once 10 students at your stop have
            requested, the shuttle is dispatched automatically and you can track it
            live on the map.
          </Text>
        </Card>

        <RequestRoster />
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
  },
  cancel: {
    marginTop: spacing.md,
  },
});
