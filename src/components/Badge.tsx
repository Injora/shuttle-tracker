import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, font } from '@/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

const toneStyles: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: colors.surfaceAlt, text: colors.textSecondary },
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  danger: { bg: colors.dangerLight, text: colors.danger },
  info: { bg: colors.infoLight, text: colors.info },
  primary: { bg: colors.primaryLight, text: colors.primaryDark },
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
});
