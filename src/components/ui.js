import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const bg = isPrimary ? colors.primary : isDanger ? colors.dangerSoft : colors.card;
  const fg = isPrimary ? '#fff' : isDanger ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: isPrimary ? colors.primary : isDanger ? colors.dangerSoft : colors.border },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function Chip({ label, selected, onPress, small }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        small && { paddingVertical: 6, paddingHorizontal: 10 },
        selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
      ]}
    >
      <Text style={[styles.chipText, small && { fontSize: 13 }, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusChip({ info }) {
  return (
    <View style={[styles.status, { backgroundColor: info.chipBg }]}>
      <Text style={[styles.statusText, { color: info.chipColor }]}>{info.chip}</Text>
    </View>
  );
}

export function BrandBadge({ brand, size = 44 }) {
  const initials = brand.name
    .replace(/[^A-Za-z0-9 -]/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3.2, backgroundColor: brand.color || colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// Progress toward the best-deal size, with a tick mark at the minimum size.
export function GroupProgress({ n, min, best, height = 10 }) {
  const pct = Math.min(1, n / best);
  const minPct = min / best;
  const fill = n >= min ? colors.success : colors.warning;
  return (
    <View>
      <View style={[styles.track, { height, borderRadius: height }]}>
        <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: fill }} />
        <View style={[styles.tick, { left: `${minPct * 100}%`, height: height + 8, top: -4 }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressCount}>{n} / {best}</Text>
        <Text style={styles.progressHint}>Negotiation starts at {min} · best deal at {best}</Text>
      </View>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  track: { backgroundColor: colors.border, width: '100%', overflow: 'visible', justifyContent: 'center' },
  tick: { position: 'absolute', width: 2, backgroundColor: colors.text, opacity: 0.55, marginLeft: -1 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  progressCount: { fontWeight: '800', color: colors.text, fontSize: 14 },
  progressHint: { color: colors.muted, fontSize: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
