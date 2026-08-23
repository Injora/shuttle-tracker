import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '@/theme';

export function Logo({ size = 64 }: { size?: number }) {
  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.logoGlyph, { fontSize: size * 0.45 }]}>S</Text>
    </View>
  );
}

export function BrandMark() {
  return (
    <View style={styles.brand}>
      <Logo size={72} />
      <Text style={styles.title}>Shuttle Tracker</Text>
      <Text style={styles.subtitle}>Live campus shuttle for hostel students</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
  },
  logo: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGlyph: {
    color: colors.textOnPrimary,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});
