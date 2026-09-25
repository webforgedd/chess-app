import React, { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';
import { Game, Profile } from '../online/types';

const TIMES = [
  { label: '3+2', m: 3, i: 2 }, { label: '5+0', m: 5, i: 0 }, { label: '10+0', m: 10, i: 0 }, { label: '15+10', m: 15, i: 10 },
];

export default function OnlineLobbyScreen({ profile, onGame, onFriends, onBack, onSignOut }: {
  profile: Profile; onGame: (id: string) => void; onFriends: () => void; onBack: () => void; onSignOut: () => void;
}) {
  const t = useTheme();
  const [idx, setIdx] = useState(1);
  const [searching, setSearching] = useState<string | null>(null); // id of my waiting game
  const [resume, setResume] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const searchRef = useRef<string | null>(null);
  searchRef.current = searching;

  // Is there a game already in progress?
  useEffect(() => {
    supabase.from('games').select('id').eq('status', 'active').limit(1).then(({ data }: any) => setResume(data?.[0]?.id ?? null));
  }, []);

  // While searching: listen for an opponent, with a slow poll as a safety net
  useEffect(() => {
    if (!searching) return;
    const check = async () => {
      const { data } = await supabase.from('games').select('status').eq('id', searching).maybeSingle();
      if (data?.status === 'active') { setSearching(null); onGame(searching); }
    };
    const ch = supabase.channel(`search-${searching}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${searching}` }, check)
      .subscribe();
    const poll = setInterval(check, 3000);
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [searching]);

  // Leaving the screen cancels a search that is still waiting
  useEffect(() => () => { if (searchRef.current) supabase.rpc('cancel_search', { p_game: searchRef.current }); }, []);

  const find = async () => {
    setMsg('');
    const tc = TIMES[idx];
    const { data, error } = await supabase.rpc('find_game', { p_minutes: tc.m, p_increment: tc.i });
    if (error) { setMsg(error.message); return; }
    const g = data as Game;
    if (g.status === 'active') onGame(g.id); else setSearching(g.id);
  };

  const cancel = async () => {
    if (searching) await supabase.rpc('cancel_search', { p_game: searching });
    setSearching(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <View>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>{profile.username}</Text>
            <Text style={{ color: t.textMuted, fontSize: 14 }}>Rating {profile.rating}</Text>
          </View>
          <View style={{ width: 100 }}><Button label="Sign out" onPress={onSignOut} /></View>
        </View>

        {resume && !searching && (
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>You have a game in progress</Text>
            <Button primary label="Resume game" onPress={() => onGame(resume)} />
          </View>
        )}

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Time (minutes + increment seconds)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TIMES.map((o, i) => (
              <Pressable key={o.label} onPress={() => !searching && setIdx(i)}
                style={{ paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: i === idx ? t.primary : t.surface2 }}>
                <Text style={{ color: i === idx ? t.onPrimary : t.text, fontWeight: '600' }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          {searching ? (
            <>
              <Text style={{ color: t.text, fontSize: 15 }}>Searching for an opponent... keep this screen open.</Text>
              <Button label="Cancel search" onPress={cancel} />
            </>
          ) : (
            <Button primary label="Find opponent" onPress={find} />
          )}
          {!!msg && <Text style={{ color: t.text, fontSize: 14 }}>{msg}</Text>}
        </View>
        <Button label="Friends and challenges" onPress={onFriends} />
        <Button label="Back" onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}
