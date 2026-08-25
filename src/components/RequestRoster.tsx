import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { LoadingState, EmptyState } from '@/components/Feedback';
import { fetchRequestRoster } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { RequestRosterRow } from '@/types';
import { PICKUP_STATUS_LABEL } from '@/constants';
import { colors, spacing, font } from '@/theme';

function toneFor(status: RequestRosterRow['status']) {
  if (status === 'dispatched') return 'success' as const;
  return 'primary' as const;
}

export default function RequestRoster() {
  const [rows, setRows] = useState<RequestRosterRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await fetchRequestRoster();
      setRows(data);
    } catch {
      // Keep last known roster on transient errors.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel('request-roster')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const byStop = useMemo(() => {
    const map = new Map<string, RequestRosterRow[]>();
    for (const row of rows) {
      const list = map.get(row.stop_id) ?? [];
      list.push(row);
      map.set(row.stop_id, list);
    }
    return Array.from(map.values());
  }, [rows]);

  if (loading) return <Card><LoadingState message="Loading request roster…" /></Card>;

  return (
    <Card style={styles.card}>
      <CardHeader
        title="Who has requested"
        subtitle="Pending & dispatched pickups across all stops"
        right={<Badge label={`${rows.length}`} tone={rows.length > 0 ? 'primary' : 'neutral'} />}
      />
      {byStop.length === 0 ? (
        <EmptyState icon="people-outline" title="No requests yet" message="Requests will appear here in real time." />
      ) : (
        byStop.map((group) => (
          <View key={group[0].stop_id} style={styles.group}>
            <Text style={styles.stopName}>{group[0].stop_name}</Text>
            {group.map((row) => (
              <View key={row.request_id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{row.full_name}</Text>
                  <Text style={styles.studentNumber}>{row.student_number}</Text>
                </View>
                <Badge label={PICKUP_STATUS_LABEL[row.status]} tone={toneFor(row.status)} />
              </View>
            ))}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  group: {
    marginBottom: spacing.md,
  },
  stopName: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentName: {
    fontSize: font.size.sm,
    color: colors.text,
    fontWeight: font.weight.medium,
  },
  studentNumber: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
