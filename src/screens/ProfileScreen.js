import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useData } from '../lib/DataContext';
import { Button, Card } from '../components/ui';
import { colors } from '../theme';

export default function ProfileScreen({ session, onEdit }) {
  const { profile, cityById, myInterests, settings } = useData();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={styles.title}>Profile</Text>
      <Card>
        <Row label="Name" value={profile?.full_name || '—'} />
        <Row label="Email" value={session?.user?.email || '—'} />
        <Row label="Mobile" value={profile?.phone ? `+91 ${profile.phone}` : '—'} />
        <Row label="City" value={cityById[profile?.city_id]?.name || '—'} />
        <Row label="Groups joined" value={String(myInterests.length)} last />
        <Button variant="secondary" title="Edit profile / change city" onPress={onEdit} style={{ marginTop: 14 }} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.h}>How AutoMates works</Text>
        <Text style={styles.p}>1. Join the group for the car brand you plan to buy in your city.</Text>
        <Text style={styles.p}>2. When {settings.min_group_size} buyers join, we start negotiating with authorised dealers for a group price.</Text>
        <Text style={styles.p}>3. At {settings.best_group_size} buyers we push for the best (fleet-level) deal.</Text>
        <Text style={styles.p}>4. We show you the normal individual price and the group price. You only pay us a share of what you save — and only if you buy.</Text>
      </Card>

      <Button variant="danger" title="Sign out" onPress={() => supabase.auth.signOut()} style={{ marginTop: 20 }} />
      <Text style={styles.version}>AutoMates prototype v1.0</Text>
    </ScrollView>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  label: { color: colors.muted, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  h: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  p: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 6 },
  version: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 16 },
});
