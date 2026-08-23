import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { AlertBanner, LoadingState } from '@/components/Feedback';
import { fetchAllStops } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Stop } from '@/types';
import { colors, spacing, font } from '@/theme';

export default function AdminStopsScreen() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Stop | null>(null);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const s = await fetchAllStops();
    setStops(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function beginEdit(stop: Stop) {
    setEditing(stop);
    setName(stop.name);
    setLat(String(stop.lat));
    setLng(String(stop.lng));
    setRadius(String(stop.geofence_radius_m));
    setError(null);
    setMessage(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('stops')
        .update({
          name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          geofence_radius_m: parseInt(radius, 10),
        })
        .eq('id', editing.id);
      if (updateError) throw updateError;
      setMessage('Stop updated.');
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Screen><LoadingState message="Loading stops…" /></Screen>;

  return (
    <Screen>
      <ScreenHeader title="Stops" subtitle="Adjust coordinates & geofence radii" />
      <ScrollView>
        {error ? <AlertBanner title="Update failed" message={error} tone="danger" /> : null}
        {message ? <AlertBanner title="Saved" message={message} tone="success" /> : null}

        {editing ? (
          <Card style={styles.card}>
            <CardHeader title="Edit Stop" subtitle={editing.id} right={<Badge label={editing.kind} tone="primary" />} />
            <Input label="Name" value={name} onChangeText={setName} />
            <Input label="Latitude" value={lat} onChangeText={setLat} keyboardType="numeric" />
            <Input label="Longitude" value={lng} onChangeText={setLng} keyboardType="numeric" />
            <Input label="Geofence radius (m)" value={radius} onChangeText={setRadius} keyboardType="numeric" />
            <Button title="Save Changes" onPress={save} loading={saving} />
            <Button title="Cancel" variant="ghost" onPress={() => setEditing(null)} />
          </Card>
        ) : (
          stops.map((stop) => (
            <Card key={stop.id} style={styles.card}>
              <CardHeader
                title={stop.name}
                subtitle={`${stop.kind === 'college' ? 'College' : 'Hostel'} · ${stop.geofence_radius_m}m radius`}
                right={<Badge label={`${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`} tone="neutral" />}
              />
              <Button title="Edit" variant="outline" onPress={() => beginEdit(stop)} />
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
});
