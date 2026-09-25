import { useCallback, useEffect, useState } from 'react';
import { supabase, isConfigured } from './supabase';
import { Profile } from './types';

export function useSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('id, username, rating').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }: any) => {
      const uid = data.session?.user.id ?? null;
      if (!alive) return;
      setUserId(uid);
      if (uid) await loadProfile(uid);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e: string, s: any) => {
      const uid = s?.user?.id ?? null;
      setUserId(uid);
      if (uid) loadProfile(uid); else setProfile(null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  return { userId, profile, loading, reload: () => (userId ? loadProfile(userId) : Promise.resolve()) };
}
