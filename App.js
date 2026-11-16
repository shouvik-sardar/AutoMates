import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isConfigured, supabase } from './src/lib/supabase';
import { DataProvider, useData } from './src/lib/DataContext';
import AuthScreen from './src/screens/AuthScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import BrandScreen from './src/screens/BrandScreen';
import MyGroupsScreen from './src/screens/MyGroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { Button } from './src/components/ui';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isConfigured ? <Root /> : <NotConfigured />}
    </SafeAreaProvider>
  );
}

function Root() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Loading />;
  if (!session) return <AuthScreen />;
  return (
    <DataProvider key={session.user.id} session={session}>
      <Main session={session} />
    </DataProvider>
  );
}

function Main({ session }) {
  const insets = useSafeAreaInsets();
  const { loading, error, profile, cities, reload } = useData();
  const [tab, setTab] = useState('brands');
  const [stack, setStack] = useState([]); // [{ screen: 'brand', brandId, cityId } | { screen: 'editProfile' }]
  const [viewCity, setViewCity] = useState(null);
  const [cityPicker, setCityPicker] = useState(false);

  const cityId = viewCity || profile?.city_id || cities[0]?.id;

  // Android hardware back button pops our little stack
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cityPicker) { setCityPicker(false); return true; }
      if (stack.length) { setStack((s) => s.slice(0, -1)); return true; }
      if (tab !== 'brands') { setTab('brands'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack, tab, cityPicker]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={styles.errTitle}>Could not load data</Text>
        <Text style={styles.errText}>{error}</Text>
        <Text style={styles.errText}>If this is a fresh setup, make sure the database SQL script has been run in Supabase.</Text>
        <Button title="Try again" onPress={reload} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        <Button variant="secondary" title="Sign out" onPress={() => supabase.auth.signOut()} style={{ marginTop: 10, alignSelf: 'stretch' }} />
      </View>
    );
  }

  // First run after sign-up: need city + phone
  if (!profile?.city_id || !profile?.phone) {
    return <ProfileSetupScreen />;
  }

  const top = stack[stack.length - 1];
  const pop = () => setStack((s) => s.slice(0, -1));
  const openBrand = (brandId, c) => setStack((s) => [...s, { screen: 'brand', brandId, cityId: c || cityId }]);

  if (top?.screen === 'brand') {
    return <BrandScreen brandId={top.brandId} cityId={top.cityId} onBack={pop} />;
  }
  if (top?.screen === 'editProfile') {
    return <ProfileSetupScreen onDone={() => { setViewCity(null); pop(); }} onCancel={pop} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flex: 1 }}>
        {tab === 'brands' && (
          <HomeScreen cityId={cityId} onChangeCity={() => setCityPicker(true)} onOpenBrand={(id) => openBrand(id)} />
        )}
        {tab === 'mine' && <MyGroupsScreen onOpenBrand={openBrand} onBrowse={() => setTab('brands')} />}
        {tab === 'profile' && (
          <ProfileScreen session={session} onEdit={() => setStack((s) => [...s, { screen: 'editProfile' }])} />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Tab label="Brands" icon="◉" active={tab === 'brands'} onPress={() => setTab('brands')} />
        <Tab label="My groups" icon="★" active={tab === 'mine'} onPress={() => setTab('mine')} />
        <Tab label="Profile" icon="●" active={tab === 'profile'} onPress={() => setTab('profile')} />
      </View>

      <Modal visible={cityPicker} transparent animationType="fade" onRequestClose={() => setCityPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCityPicker(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Show groups in</Text>
            {cities.map((c) => (
              <Pressable key={c.id} style={styles.sheetRow} onPress={() => { setViewCity(c.id); setCityPicker(false); }}>
                <Text style={[styles.sheetText, c.id === cityId && { color: colors.primary, fontWeight: '900' }]}>
                  {c.name}{c.id === profile?.city_id ? '  (your city)' : ''}
                </Text>
                {c.id === cityId ? <Text style={{ color: colors.primary, fontWeight: '900' }}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Tab({ label, icon, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} hitSlop={6}>
      <Text style={[styles.tabIcon, active && { color: colors.primary }]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function NotConfigured() {
  return (
    <View style={[styles.center, { padding: 24 }]}>
      <Text style={styles.errTitle}>Supabase not configured</Text>
      <Text style={styles.errText}>
        This build was made without EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
        Add them as GitHub repository secrets (or in a local .env file) and build again.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 8, textAlign: 'center' },
  errText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 18, color: colors.muted },
  tabLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetText: { fontSize: 16, color: colors.text },
});
