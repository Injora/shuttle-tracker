import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, font, radius } from '@/theme';

interface AlertBannerProps {
  title: string;
  message: string;
  tone?: 'warning' | 'danger' | 'info' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function AlertBanner({
  title,
  message,
  tone = 'info',
  icon,
}: AlertBannerProps) {
  const toneMap = {
    warning: { bg: colors.warningLight, border: colors.warning, text: '#92400E', icon: 'warning-outline' },
    danger: { bg: colors.dangerLight, border: colors.danger, text: colors.danger, icon: 'alert-circle-outline' },
    info: { bg: colors.infoLight, border: colors.info, text: colors.info, icon: 'information-circle-outline' },
    success: { bg: colors.successLight, border: colors.success, text: colors.success, icon: 'checkmark-circle-outline' },
  } as const;

  const t = toneMap[tone];
  const finalIcon = icon ?? t.icon;

  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Ionicons name={finalIcon} size={22} color={t.text} style={styles.icon} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Text style={[styles.message, { color: t.text }]}>{message}</Text>
      </View>
    </View>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'navigate-circle-outline',
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: font.size.sm,
    lineHeight: 20,
    opacity: 0.9,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: font.size.sm,
  },
  emptyTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyMessage: {
    fontSize: font.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});
