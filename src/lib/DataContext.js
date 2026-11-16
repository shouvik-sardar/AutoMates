import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

const DataContext = createContext(null);

export function DataProvider({ session, children }) {
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({ min_group_size: 5, best_group_size: 10 });
  const [cities, setCities] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [counts, setCounts] = useState({}); // key `${brand}|${city}` -> row
  const [profile, setProfile] = useState(null);
  const [myInterests, setMyInterests] = useState([]);
  const [live, setLive] = useState(false);

  const loadCounts = useCallback(async () => {
    const { data, error: e } = await supabase.from('group_counts').select('*');
    if (e) throw e;
    const map = {};
    (data || []).forEach((r) => { map[`${r.brand_id}|${r.city_id}`] = r; });
    setCounts(map);
  }, []);

  const loadMine = useCallback(async () => {
    if (!userId) return;
    const [{ data: p, error: pe }, { data: i, error: ie }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('interests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    if (pe) throw pe;
    if (ie) throw ie;
    setProfile(p || { id: userId, full_name: session?.user?.user_metadata?.full_name || '' });
    setMyInterests(i || []);
  }, [userId]);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [s, c, b, m] = await Promise.all([
        supabase.from('app_settings').select('*'),
        supabase.from('cities').select('*').eq('active', true).order('sort'),
        supabase.from('brands').select('*').eq('active', true).order('sort'),
        supabase.from('models').select('*').eq('active', true).order('name'),
      ]);
      for (const r of [s, c, b, m]) if (r.error) throw r.error;
      const st = {};
      s.data.forEach((row) => { st[row.key] = row.value; });
      setSettings((prev) => ({ ...prev, ...st }));
      setCities(c.data);
      setBrands(b.data);
      setModels(m.data);
      await Promise.all([loadCounts(), loadMine()]);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCounts, loadMine]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Live counter updates from Supabase Realtime
  const channelRef = useRef(null);
  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel('group-counts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_counts' }, (payload) => {
        const row = payload.new && payload.new.brand_id ? payload.new : null;
        if (!row) return;
        setCounts((prev) => ({ ...prev, [`${row.brand_id}|${row.city_id}`]: row }));
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Safety net: refresh counts whenever the app comes back to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { loadCounts().catch(() => {}); loadMine().catch(() => {}); }
    });
    return () => sub.remove();
  }, [loadCounts, loadMine]);

  const saveProfile = useCallback(async (fields) => {
    const row = { id: userId, ...fields, updated_at: new Date().toISOString() };
    const { data, error: e } = await supabase.from('profiles').upsert(row).select().single();
    if (e) throw e;
    setProfile(data);
    return data;
  }, [userId]);

  const joinGroup = useCallback(async ({ brandId, cityId, modelId, timeline }) => {
    const { data, error: e } = await supabase
      .from('interests')
      .insert({ user_id: userId, brand_id: brandId, city_id: cityId, preferred_model_id: modelId || null, timeline })
      .select()
      .single();
    if (e) throw e;
    setMyInterests((prev) => [data, ...prev]);
    loadCounts().catch(() => {});
    return data;
  }, [userId, loadCounts]);

  const updateInterest = useCallback(async (id, { modelId, timeline }) => {
    const { data, error: e } = await supabase
      .from('interests')
      .update({ preferred_model_id: modelId || null, timeline })
      .eq('id', id)
      .select()
      .single();
    if (e) throw e;
    setMyInterests((prev) => prev.map((x) => (x.id === id ? data : x)));
    return data;
  }, []);

  const leaveGroup = useCallback(async (id) => {
    const { error: e } = await supabase.from('interests').delete().eq('id', id);
    if (e) throw e;
    setMyInterests((prev) => prev.filter((x) => x.id !== id));
    loadCounts().catch(() => {});
  }, [loadCounts]);

  const value = useMemo(() => {
    const brandById = {};
    brands.forEach((b) => { brandById[b.id] = b; });
    const cityById = {};
    cities.forEach((c) => { cityById[c.id] = c; });
    const modelsByBrand = {};
    models.forEach((m) => { (modelsByBrand[m.brand_id] = modelsByBrand[m.brand_id] || []).push(m); });
    const modelById = {};
    models.forEach((m) => { modelById[m.id] = m; });
    return {
      loading, error, live, settings, cities, brands, models, counts, profile, myInterests,
      brandById, cityById, modelsByBrand, modelById,
      countFor: (brandId, cityId) => counts[`${brandId}|${cityId}`] || { brand_id: brandId, city_id: cityId, interested: 0, status: 'forming' },
      myInterestFor: (brandId, cityId) => myInterests.find((x) => x.brand_id === brandId && x.city_id === cityId),
      reload: loadAll, refreshCounts: loadCounts, saveProfile, joinGroup, updateInterest, leaveGroup,
    };
  }, [loading, error, live, settings, cities, brands, models, counts, profile, myInterests,
      loadAll, loadCounts, saveProfile, joinGroup, updateInterest, leaveGroup]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
