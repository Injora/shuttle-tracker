import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Card, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { fetchStop } from '@/lib/api';
import { Stop } from '@/types';
import { colors, spacing, font } from '@/theme';

export default function StudentProfileScreen() {
  const { user, signOut } = useAuth();
  const [hostel, setHostel] = useState<Stop | null>(null);

  useEffect(() => {
    if (user?.student?.hostel_stop_id) {
      fetchStop(user.student.hostel_stop_id).then(setHostel);
    }
  }, [user]);

  return (
    <Screen>
      <ScreenHeader title="Profile" subtitle="Your account details" />
      <Card style={styles.card}>
        <CardHeader title={user?.student?.full_name ?? 'Student'} right={<Badge label="Student" tone="primary" />} />
        <Row label="Student ID" value={user?.student?.student_number ?? '—'} />
        <Row label="Hostel" value={hostel?.name ?? '—'} />
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
