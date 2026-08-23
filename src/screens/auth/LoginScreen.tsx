import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { BrandMark } from '@/components/Brand';
import { AlertBanner } from '@/components/Feedback';
import { colors, spacing, radius, font } from '@/theme';
import { Role } from '@/types';

const roles: { key: Role; label: string; hint: string }[] = [
  { key: 'student', label: 'Student', hint: 'Student ID' },
  { key: 'driver', label: 'Driver', hint: 'Driver ID' },
  { key: 'admin', label: 'Admin', hint: 'Admin email' },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = roles.find((r) => r.key === role)!;

  async function handleSubmit() {
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please enter your ID and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier.trim(), password, role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen padded={false} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandWrap}>
            <BrandMark />
          </View>

          <View style={styles.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleChip, role === r.key && styles.roleChipActive]}
                onPress={() => setRole(r.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleText, role === r.key && styles.roleTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            {error ? <AlertBanner title="Sign in failed" message={error} tone="danger" /> : null}

            <Input
              label={active.hint}
              placeholder={active.key === 'admin' ? 'admin@college.edu' : 'Enter your ID'}
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSubmit}
            />

            <Button
              title="Sign In"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={styles.submit}
            />
          </View>

          <Text style={styles.footnote}>
            Accounts are provisioned by your campus administrator.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  brandWrap: {
    marginBottom: spacing.xl,
  },
  roleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.surface,
  },
  roleText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: font.weight.semibold,
    fontSize: font.size.sm,
  },
  roleTextActive: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  submit: {
    marginTop: spacing.sm,
  },
  footnote: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: font.size.xs,
  },
});
