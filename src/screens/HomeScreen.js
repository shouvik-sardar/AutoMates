import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useData } from '../lib/DataContext';
import { describeGroup } from '../lib/groupStatus';
import { BrandBadge, Chip, GroupProgress, StatusChip } from '../components/ui';
import { colors, radius, SEGMENTS } from '../theme';

export default function HomeScreen({ cityId, onChangeCity, onOpenBrand }) {
  const { brands, cities, cityById, modelsByBrand, settings, countFor, myInterestFor, refreshCounts, live } = useData();
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const city = cityById[cityId];

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((b) => {
      if (segment !== 'all' && b.segment !== segment) return false;
      if (!q) return true;
      if (b.name.toLowerCase().includes(q)) return true;
      return (modelsByBrand[b.id] || []).some((m) => m.name.toLowerCase().includes(q));
    });
  }, [brands, segment, query, modelsByBrand]);

  const totals = useMemo(() => {
    let buyers = 0; let active = 0;
    brands.forEach((b) => {
      const n = countFor(b.id, cityId).interested;
      buyers += n; if (n > 0) active += 1;
    });
    return { buyers, active };
  }, [brands, countFor, cityId]);

  async function onRefresh() {
    setRefreshing(true);
    try { await refreshCounts(); } finally { setRefreshing(false); }
  }

  const header = (
    <View>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Car groups in</Text>
          <Pressable onPress={onChangeCity} hitSlop={8}>
            <Text style={styles.city}>{city?.name || 'Select city'} ▾</Text>
          </Pressable>
        </View>
        <View style={[styles.liveDot, { backgroundColor: live ? colors.success : colors.border }]} />
        <Text style={styles.liveText}>{live ? 'Live' : 'Offline'}</Text>
      </View>

      <View style={styles.summary}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryNum}>{totals.buyers}</Text>
          <Text style={styles.summaryLabel}>buyers waiting</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryNum}>{totals.active}</Text>
          <Text style={styles.summaryLabel}>brand groups forming</Text>
        </View>
        <View style={{ flex: 1.2 }}>
          <Text style={styles.summaryNum}>{settings.min_group_size} → {settings.best_group_size}</Text>
          <Text style={styles.summaryLabel}>start → best deal</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search brand or model (e.g. Nexon, Creta)"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />
      <View style={styles.segments}>
        {SEGMENTS.map((s) => (
          <Chip key={s.id} small label={s.label} selected={segment === s.id} onPress={() => setSegment(s.id)} />
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      data={list}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No brand or model matches “{query}”.</Text>}
      renderItem={({ item: b }) => {
        const info = describeGroup(countFor(b.id, cityId), settings);
        const mine = myInterestFor(b.id, cityId);
        const q = query.trim().toLowerCase();
        const matchedModels = q && !b.name.toLowerCase().includes(q)
          ? (modelsByBrand[b.id] || []).filter((m) => m.name.toLowerCase().includes(q)).map((m) => m.name)
          : null;
        return (
          <Pressable onPress={() => onOpenBrand(b.id)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
            <View style={styles.cardTop}>
              <BrandBadge brand={b} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.brand}>{b.name}</Text>
                <Text style={styles.models} numberOfLines={1}>
                  {matchedModels ? `Matches: ${matchedModels.join(', ')}` : `${(modelsByBrand[b.id] || []).length} models`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <StatusChip info={info} />
                {mine ? <Text style={styles.youre}>✓ You're in</Text> : null}
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <GroupProgress n={info.n} min={info.min} best={info.best} height={8} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  hello: { color: colors.muted, fontSize: 14 },
  city: { color: colors.text, fontSize: 26, fontWeight: '900' },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  liveText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summary: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
  summaryNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: '#C7D6FF', fontSize: 12, marginTop: 2 },
  search: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text, marginBottom: 10,
  },
  segments: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 17, fontWeight: '800', color: colors.text },
  models: { fontSize: 13, color: colors.muted, marginTop: 2 },
  youre: { color: colors.success, fontWeight: '800', fontSize: 12, marginTop: 6 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
