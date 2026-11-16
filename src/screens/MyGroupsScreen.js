import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useData } from '../lib/DataContext';
import { describeGroup } from '../lib/groupStatus';
import { BrandBadge, Button, GroupProgress, StatusChip } from '../components/ui';
import { colors, radius, TIMELINES } from '../theme';

export default function MyGroupsScreen({ onOpenBrand, onBrowse }) {
  const { myInterests, brandById, cityById, modelById, settings, countFor } = useData();

  return (
    <FlatList
      data={myInterests}
      keyExtractor={(i) => String(i.id)}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
      ListHeaderComponent={<Text style={styles.title}>My groups</Text>}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>You haven't joined a group yet</Text>
          <Text style={styles.emptyText}>Pick the brand you plan to buy. When enough buyers join, we negotiate a group price for everyone.</Text>
          <Button title="Browse brands" onPress={onBrowse} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </View>
      }
      renderItem={({ item }) => {
        const brand = brandById[item.brand_id];
        if (!brand) return null;
        const info = describeGroup(countFor(item.brand_id, item.city_id), settings);
        return (
          <Pressable onPress={() => onOpenBrand(item.brand_id, item.city_id)} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <BrandBadge brand={brand} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.brand}>{brand.name}</Text>
                <Text style={styles.meta}>
                  {cityById[item.city_id]?.name} · {item.preferred_model_id ? modelById[item.preferred_model_id]?.name : 'Any model'} · {TIMELINES.find((t) => t.id === item.timeline)?.label}
                </Text>
              </View>
              <StatusChip info={info} />
            </View>
            <Text style={styles.headline}>{info.headline}</Text>
            <Text style={styles.detail}>{info.detail}</Text>
            <View style={{ marginTop: 12 }}>
              <GroupProgress n={info.n} min={info.min} best={info.best} height={8} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  brand: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  headline: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 12 },
  detail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
