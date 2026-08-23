import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { AlertBanner } from '@/components/Feedback';
import { callEdgeFunction, fetchAllStops } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Stop } from '@/types';
import { colors, spacing, radius, font } from '@/theme';

type AccountRole = 'student' | 'driver';

export default function AdminProvisionScreen() {
  const [role, setRole] = useState<AccountRole>('student');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [hostelStopId, setHostelStopId] = useState('');
  const [carrier, setCarrier] = useState('Other');
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllStops().then(setStops);
  }, []);

  async function handleProvision() {
    setError(null);
    setMessage(null);
    if (!identifier.trim() || !fullName.trim() || !password) {
      setError('ID, full name, and password are required.');
      return;
    }
    if (role === 'student' && !hostelStopId) {
      setError('Select a hostel for the student.');
      return;
    }
    setLoading(true);
    try {
      const result = await callEdgeFunction<{ ok: boolean; error?: string; email?: string }>(
        'provision-account',
        {
          role,
          identifier: identifier.trim(),
          full_name: fullName.trim(),
          password,
          hostel_stop_id: role === 'student' ? hostelStopId : undefined,
          carrier: role === 'driver' ? carrier : undefined,
        },
      );
      if (!result.ok) setError(result.error ?? 'Provisioning failed.');
      else {
        setMessage(`Account created: ${result.email}`);
        setIdentifier('');
        setFullName('');
        setPassword('');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Accounts" subtitle="Provision student & driver logins" />
      <ScrollView>
        {error ? <AlertBanner title="Provisioning failed" message={error} tone="danger" /> : null}
        {message ? <AlertBanner title="Account created" message={message} tone="success" /> : null}

        <Card style={styles.card}>
          <CardHeader title="New Account" />
          <View style={styles.roleRow}>
            {(['student', 'driver'] as AccountRole[]).map((r) => (
              <Button
                key={r}
                title={r === 'student' ? 'Student' : 'Driver'}
                variant={role === r ? 'primary' : 'outline'}
                onPress={() => setRole(r)}
                style={styles.roleBtn}
              />
            ))}
          </View>

          <Input label="ID" placeholder="e.g. 2024-001 or DRV-01" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
          <Input label="Full Name" placeholder="Student or driver name" value={fullName} onChangeText={setFullName} />
          <Input label="Temporary Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          {role === 'student' ? (
            <View>
              <Text style={styles.sectionLabel}>Assign Hostel</Text>
              {stops.filter((s) => s.kind === 'hostel').map((s) => (
                <View key={s.id} style={styles.hostelRow}>
                  <Text style={styles.hostelName}>{s.name}</Text>
                  <Button
                    title={hostelStopId === s.id ? 'Selected' : 'Select'}
                    size="sm"
                    variant={hostelStopId === s.id ? 'primary' : 'outline'}
                    onPress={() => setHostelStopId(s.id)}
                    style={styles.selectBtn}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Input label="Carrier" placeholder="Jio / Airtel / Other" value={carrier} onChangeText={setCarrier} />
          )}

          <Button title="Create Account" onPress={handleProvision} loading={loading} style={styles.submit} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleBtn: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hostelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hostelName: {
    flex: 1,
    fontSize: font.size.sm,
    color: colors.text,
    marginRight: spacing.md,
  },
  selectBtn: {
    width: 100,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
