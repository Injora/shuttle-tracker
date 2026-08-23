import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, font } from '@/theme';

export default function DriverProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <Screen>
      <ScreenHeader title="Profile" subtitle="Driver account details" />
      <Card style={styles.card}>
        <CardHeader title={user?.driver?.full_name ?? 'Driver'} right={<Badge label="Driver" tone="info" />} />
        <Row label="Driver ID" value={user?.driver?.driver_number ?? '—'} />
        <Row label="Carrier" value={user?.driver?.carrier ?? 'Other'} />
      </Card>
      <Button title="Sign Out" variant="outline" onPress={signOut} style={styles.signout} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
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
    fontWeight: font.weight.semibold,
    color: colors.text,
  },
  signout: {
    marginTop: 'auto',
  },
});
