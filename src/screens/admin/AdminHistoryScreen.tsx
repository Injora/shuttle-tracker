import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LoadingState, EmptyState } from '@/components/Feedback';
import { supabase } from '@/lib/supabase';
import { TripHistoryRow } from '@/types';
import { TRIP_TYPE_LABEL } from '@/constants';
import { colors, spacing, font } from '@/theme';

export default function AdminHistoryScreen() {
  const [rows, setRows] = useState<TripHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from('shuttle_sessions')
      .select('id, driver_id, trip_type, status, started_at, ended_at')
      .order('started_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const withNames: TripHistoryRow[] = [];
      for (const s of data as unknown as TripHistoryRow[]) {
        const { data: driver } = await supabase
          .from('drivers')
          .select('full_name')
          .eq('user_id', s.driver_id)
          .maybeSingle();
        withNames.push({ ...s, driver_name: driver?.full_name ?? 'Unknown' });
      }
      setRows(withNames);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Screen><LoadingState message="Loading trip history…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="History" subtitle="Recent shuttle sessions" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {rows.length === 0 ? (
          <EmptyState icon="time-outline" title="No trips yet" message="Completed shuttle sessions will appear here." />
        ) : (
          rows.map((row) => (
            <Card key={row.id} style={styles.card}>
              <CardHeader
                title={row.driver_name}
                subtitle={new Date(row.started_at).toLocaleString()}
                right={<Badge label={TRIP_TYPE_LABEL[row.trip_type as keyof typeof TRIP_TYPE_LABEL]} tone={row.trip_type === 'tribe_run' ? 'warning' : 'primary'} />}
              />
              <View style={styles.row}>
                <Text style={styles.label}>Status</Text>
                <Badge label={row.status === 'active' ? 'Active' : 'Ended'} tone={row.status === 'active' ? 'success' : 'neutral'} />
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Ended</Text>
                <Text style={styles.value}>{row.ended_at ? new Date(row.ended_at).toLocaleString() : '—'}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: font.size.sm,
    color: colors.textSecondary,
  },
  value: {
    fontSize: font.size.sm,
    color: colors.text,
    fontWeight: font.weight.medium,
  },
});
