import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AlertBanner, LoadingState, EmptyState } from '@/components/Feedback';
import { useAuth } from '@/context/AuthContext';
import { fetchStops, fetchMyActiveSession } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Stop, ShuttleSession, PickupRequest, StudentProfile } from '@/types';
import { TRIP_TYPE_LABEL, TRIBE_STOP_ID } from '@/constants';
import { colors, spacing, font } from '@/theme';

interface ManifestEntry {
  stop_id: string;
  count: number;
  students: string[];
}

export default function DriverManifestScreen() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [session, setSession] = useState<ShuttleSession | null>(null);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [s, sess] = await Promise.all([
      fetchStops(),
      user ? fetchMyActiveSession(user.id) : Promise.resolve(null),
    ]);
    setStops(s);
    setSession(sess);

    if (sess) {
      const coveredStops = sess.trip_type === 'tribe_run'
        ? ['college', TRIBE_STOP_ID]
        : ['college', 'hostel_1', 'hostel_2'];

      const { data } = await supabase
        .from('pickup_requests')
        .select('*')
        .in('stop_id', coveredStops)
        .eq('status', 'dispatched')
        .order('created_at', { ascending: true });

      const reqs = (data as PickupRequest[]) ?? [];
      setRequests(reqs);

      // Resolve student names
      const names: Record<string, string> = {};
      for (const req of reqs) {
        const { data: prof } = await supabase
          .from('students')
          .select('full_name')
          .eq('user_id', req.student_id)
          .maybeSingle();
        if (prof) names[req.student_id] = (prof as StudentProfile).full_name;
      }
      setStudentNames(names);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  const entries = useMemo<ManifestEntry[]>(() => {
    const map = new Map<string, ManifestEntry>();
    for (const req of requests) {
      const e = map.get(req.stop_id) ?? { stop_id: req.stop_id, count: 0, students: [] };
      e.count += 1;
      e.students.push(studentNames[req.student_id] ?? 'Student');
      map.set(req.stop_id, e);
    }
    return Array.from(map.values());
  }, [requests, studentNames]);

  const tribeRisk = useMemo(() => {
    if (!session || session.trip_type !== 'tribe_run') return false;
    // A tribe run must never include hostel_1/hostel_2 passengers.
    return requests.some((r) => r.stop_id === 'hostel_1' || r.stop_id === 'hostel_2');
  }, [session, requests]);

  if (loading) return <Screen><LoadingState message="Building manifest…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader
        title="Manifest"
        subtitle={session ? TRIP_TYPE_LABEL[session.trip_type as keyof typeof TRIP_TYPE_LABEL] : 'No active run'}
      />

      {tribeRisk ? (
        <AlertBanner
          title="Tribe isolation at risk"
          message="This is a Tribe Run but hostel_1/hostel_2 passengers appear in the manifest. Verify before departure — Tribe must never share with these hostels."
          tone="danger"
          icon="warning"
        />
      ) : null}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {!session ? (
          <EmptyState icon="list-outline" title="No active session" message="Activate a shuttle to see the passenger manifest." />
        ) : entries.length === 0 ? (
          <EmptyState icon="people-outline" title="No passengers yet" message="Dispatched pickups will appear here." />
        ) : (
          entries.map((entry) => {
            const stop = stops.find((s) => s.id === entry.stop_id);
            return (
              <Card key={entry.stop_id} style={styles.card}>
                <CardHeader
                  title={stop?.name ?? entry.stop_id}
                  right={<Badge label={`${entry.count} passenger${entry.count > 1 ? 's' : ''}`} tone="primary" />}
                />
                {entry.students.map((name, i) => (
                  <View key={`${entry.stop_id}-${i}`} style={styles.studentRow}>
                    <Text style={styles.studentName}>{name}</Text>
                  </View>
                ))}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  studentRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentName: {
    fontSize: font.size.sm,
    color: colors.text,
  },
});
