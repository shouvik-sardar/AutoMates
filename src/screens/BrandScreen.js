import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../lib/DataContext';
import { describeGroup } from '../lib/groupStatus';
import { BrandBadge, Button, Card, Chip, GroupProgress, StatusChip } from '../components/ui';
import { colors, radius, TIMELINES } from '../theme';

export default function BrandScreen({ brandId, cityId, onBack }) {
  const insets = useSafeAreaInsets();
  const { brandById, cityById, modelsByBrand, modelById, settings, countFor, myInterestFor, joinGroup, updateInterest, leaveGroup } = useData();
  const brand = brandById[brandId];
  const city = cityById[cityId];
  const models = modelsByBrand[brandId] || [];
  const info = describeGroup(countFor(brandId, cityId), settings);
  const mine = myInterestFor(brandId, cityId);

  const [modelId, setModelId] = useState(mine?.preferred_model_id || null);
  const [timeline, setTimeline] = useState(mine?.timeline || '1_3_months');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setModelId(mine?.preferred_model_id || null);
    setTimeline(mine?.timeline || '1_3_months');
  }, [mine?.id]);

  if (!brand) return null;

  async function join() {
    setBusy(true);
    try {
      await joinGroup({ brandId, cityId, modelId, timeline });
    } catch (e) {
      Alert.alert('Could not join', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveChanges() {
    setBusy(true);
    try {
      await updateInterest(mine.id, { modelId, timeline });
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmLeave() {
    Alert.alert('Leave this group?', `You will be removed from the ${brand.name} group in ${city?.name}.`, [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try { await leaveGroup(mine.id); } catch (e) { Alert.alert('Could not leave', e.message); } finally { setBusy(false); }
        },
      },
    ]);
  }

  const showForm = !mine || editing;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <View style={styles.hero}>
          <BrandBadge brand={brand} size={60} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={styles.brand}>{brand.name}</Text>
            <Text style={styles.city}>Group in {city?.name}</Text>
          </View>
        </View>

        <Card style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.big}>{info.n}</Text>
            <StatusChip info={info} />
          </View>
          <Text style={styles.headline}>{info.headline}</Text>
          <Text style={styles.detail}>{info.detail}</Text>
          <View style={{ marginTop: 16 }}>
            <GroupProgress n={info.n} min={info.min} best={info.best} />
          </View>
        </Card>

        {mine && !editing ? (
          <Card style={{ marginTop: 16, borderColor: colors.success, backgroundColor: '#F6FEF9' }}>
            <Text style={styles.inTitle}>✓ You're in this group</Text>
            <Text style={styles.inLine}>
              Preferred model: <Text style={styles.bold}>{mine.preferred_model_id ? modelById[mine.preferred_model_id]?.name : 'Any / undecided'}</Text>
            </Text>
            <Text style={styles.inLine}>
              Planning to buy: <Text style={styles.bold}>{TIMELINES.find((t) => t.id === mine.timeline)?.label}</Text>
            </Text>
            <Text style={[styles.detail, { marginTop: 8 }]}>
              Invite friends and colleagues who are buying a {brand.name} — every extra buyer improves the group price.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
              <Button variant="secondary" title="Edit" onPress={() => setEditing(true)} style={{ flex: 1 }} />
              <Button variant="danger" title="Leave group" onPress={confirmLeave} loading={busy} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : null}

        {showForm ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.section}>Which model are you considering?</Text>
            <Text style={styles.detail}>Optional — the group is formed by brand, this helps us negotiate.</Text>
            <View style={styles.wrap}>
              <Chip small label="Any / undecided" selected={!modelId} onPress={() => setModelId(null)} />
              {models.map((m) => (
                <Chip key={m.id} small label={m.name} selected={modelId === m.id} onPress={() => setModelId(m.id)} />
              ))}
            </View>

            <Text style={[styles.section, { marginTop: 10 }]}>When do you plan to buy?</Text>
            <View style={styles.wrap}>
              {TIMELINES.map((t) => (
                <Chip key={t.id} small label={t.label} selected={timeline === t.id} onPress={() => setTimeline(t.id)} />
              ))}
            </View>

            {mine ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Button variant="secondary" title="Cancel" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                <Button title="Save" onPress={saveChanges} loading={busy} style={{ flex: 1 }} />
              </View>
            ) : (
              <Button title={`Join the ${brand.name} group`} onPress={join} loading={busy} style={{ marginTop: 6 }} />
            )}
            {!mine ? (
              <Text style={styles.fine}>
                Joining is free and not a booking. We contact you only when the group reaches {settings.min_group_size} buyers and we have a dealer offer.
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Text style={[styles.section, { marginTop: 22, marginBottom: 8 }]}>{brand.name} models ({models.length})</Text>
        <View style={styles.modelGrid}>
          {models.map((m) => (
            <View key={m.id} style={styles.model}>
              <Text style={styles.modelName}>{m.name}</Text>
              <Text style={styles.modelType}>{m.body_type}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingBottom: 4, backgroundColor: colors.bg },
  back: { paddingVertical: 6, paddingHorizontal: 4, alignSelf: 'flex-start' },
  backText: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 26, fontWeight: '900', color: colors.text },
  city: { color: colors.muted, fontSize: 15, marginTop: 2 },
  big: { fontSize: 44, fontWeight: '900', color: colors.text },
  headline: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },
  detail: { color: colors.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  section: { fontSize: 16, fontWeight: '800', color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  fine: { color: colors.muted, fontSize: 12, marginTop: 12, lineHeight: 17 },
  inTitle: { color: colors.success, fontWeight: '900', fontSize: 16, marginBottom: 8 },
  inLine: { color: colors.text, fontSize: 14, marginTop: 2 },
  bold: { fontWeight: '800' },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  model: {
    width: '50%', padding: 4,
  },
  modelName: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md,
    paddingHorizontal: 12, paddingTop: 10, fontWeight: '700', color: colors.text, fontSize: 14,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border,
  },
  modelType: {
    backgroundColor: colors.card, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md,
    paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2, color: colors.muted, fontSize: 12,
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.border,
  },
});
