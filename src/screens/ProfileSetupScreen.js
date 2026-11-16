import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../lib/DataContext';
import { Button, Chip, Field } from '../components/ui';
import { colors } from '../theme';

// Shown after sign-up (city + phone needed), and reused from the Profile tab.
export default function ProfileSetupScreen({ onDone, onCancel }) {
  const insets = useSafeAreaInsets();
  const { cities, profile, saveProfile } = useData();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [cityId, setCityId] = useState(profile?.city_id || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    setErr(null);
    const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (name.trim().length < 2) return setErr('Please enter your name.');
    if (!/^[6-9]\d{9}$/.test(digits)) return setErr('Please enter a valid 10-digit Indian mobile number.');
    if (!cityId) return setErr('Please choose your city.');
    setBusy(true);
    try {
      await saveProfile({ full_name: name.trim(), phone: digits, city_id: cityId });
      onDone && onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{onCancel ? 'Edit profile' : 'Almost there'}</Text>
        <Text style={styles.sub}>We group buyers by city, and call you only when your group deal is ready.</Text>

        <Text style={styles.label}>Your city</Text>
        <View style={styles.row}>
          {cities.map((c) => (
            <Chip key={c.id} label={c.name} selected={cityId === c.id} onPress={() => setCityId(c.id)} />
          ))}
        </View>

        <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile" maxLength={14} />

        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Button title={onCancel ? 'Save' : 'Continue'} onPress={save} loading={busy} />
        {onCancel ? <Button variant="secondary" title="Cancel" onPress={onCancel} style={{ marginTop: 12 }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900', color: colors.text },
  sub: { color: colors.muted, fontSize: 15, marginTop: 6, marginBottom: 24, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  err: { color: colors.danger, marginBottom: 12 },
});
