import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Button, Field } from '../components/ui';
import { colors } from '../theme';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function submit() {
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setMessage({ type: 'error', text: 'Please enter a valid email.' });
    if (password.length < 6) return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    if (mode === 'signup' && name.trim().length < 2) return setMessage({ type: 'error', text: 'Please enter your name.' });

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({
            type: 'info',
            text: 'Account created. Please confirm your email, then sign in. (Admin: turn off "Confirm email" in Supabase for instant sign-up.)',
          });
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}><Text style={styles.logoText}>AM</Text></View>
        <Text style={styles.title}>AutoMates</Text>
        <Text style={styles.subtitle}>Buy your next car together.{'\n'}Group buyers get fleet-level prices.</Text>

        <View style={styles.steps}>
          <Step n="1" text="Pick the brand you plan to buy" />
          <Step n="2" text="Watch the group fill up live in your city" />
          <Step n="3" text="At 5 buyers we negotiate; at 10 we push for the best deal" />
        </View>

        {mode === 'signup' ? (
          <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Priya Raman" autoCapitalize="words" />
        ) : null}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry autoCapitalize="none" />

        {message ? (
          <Text style={[styles.msg, { color: message.type === 'error' ? colors.danger : colors.primaryDark }]}>{message.text}</Text>
        ) : null}

        <Button title={mode === 'signup' ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />
        <Button
          variant="secondary"
          style={{ marginTop: 12 }}
          title={mode === 'signup' ? 'I already have an account' : 'New here? Create an account'}
          onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(null); }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Step({ n, text }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  title: { fontSize: 32, fontWeight: '900', color: colors.text, marginTop: 16 },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 6, lineHeight: 22 },
  steps: { marginVertical: 24, gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center' },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumText: { color: colors.primary, fontWeight: '800' },
  stepText: { color: colors.text, fontSize: 15, flex: 1 },
  msg: { marginBottom: 12, fontSize: 14, lineHeight: 20 },
});
