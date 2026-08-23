import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { AlertBanner, LoadingState } from '@/components/Feedback';
import { supabase } from '@/lib/supabase';
import { Deadzone } from '@/types';
import { DEFAULT_DEADZONE_RADIUS_M } from '@/constants';
import { colors, spacing, font } from '@/theme';

export default function AdminSettingsScreen() {
  const [deadzones, setDeadzones] = useState<Deadzone[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(String(DEFAULT_DEADZONE_RADIUS_M));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('deadzones').select('*');
    const dzs = (data as Deadzone[]) ?? [];
    setDeadzones(dzs);
    if (dzs.length > 0) {
      setRadius(String(dzs[0].radius_m));
      setNotes(dzs[0].notes ?? '');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (deadzones.length === 0) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: updateError } = await supabase
        .from('deadzones')
        .update({ radius_m: parseInt(radius, 10), notes })
        .eq('id', deadzones[0].id);
      if (updateError) throw updateError;
      setMessage('Dead-zone settings updated.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Screen><LoadingState message="Loading settings…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Settings" subtitle="Tune dead-zone detection" />
      <ScrollView>
        {error ? <AlertBanner title="Update failed" message={error} tone="danger" /> : null}
        {message ? <AlertBanner title="Saved" message={message} tone="success" /> : null}

        <Card style={styles.card}>
          <CardHeader title="Dead-zone Detection" subtitle="Signal-loss heuristic" />
          <Text style={styles.body}>
            When driver location updates stop arriving near the known dead-zone point,
            the session is marked degraded. The radius below is a starting guess —
            tune it after a few real trips through Lohegaon road.
          </Text>
          <Input label="Dead-zone radius (m)" value={radius} onChangeText={setRadius} keyboardType="numeric" />
          <Input label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
          <Button title="Save Settings" onPress={save} loading={saving} />
        </Card>

        {deadzones.map((dz) => (
          <Card key={dz.id} style={styles.card}>
            <CardHeader title={dz.name} subtitle={`${dz.radius_m}m radius`} />
            <Text style={styles.body}>{dz.notes}</Text>
            <Text style={styles.coords}>
              {dz.lat.toFixed(6)}, {dz.lng.toFixed(6)}
            </Text>
          </Card>
        ))}
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
  coords: {
    fontSize: font.size.xs,
    color: colors.textMuted,
  },
});
