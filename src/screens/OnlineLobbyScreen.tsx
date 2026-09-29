import React, { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';
import { Game, Profile } from '../online/types';

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';
const GOLD_DIM = 'rgba(210,175,110,0.45)';

const TIMES = [
  { label: '3+2', m: 3, i: 2 }, { label: '5+0', m: 5, i: 0 }, { label: '10+0', m: 10, i: 0 }, { label: '15+10', m: 15, i: 10 },
];

// Gold Cinzel hero title -- same treatment as Home/Profile/Friends, font size
// dialed down to 15 for this screen as requested. Back arrow on the left,
// a proper Sign out button on the right (was plain text before).
function LobbyHeroTitle({ onBack, onSignOut }: { onBack: () => void; onSignOut: () => void }) {
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  return (
    <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 4, paddingHorizontal: 20 }}>
      <Pressable onPress={onBack} style={{ position: 'absolute', left: 20, top: 2, padding: 4 }}>
        <Text style={{ color: GOLD_LIGHT, fontSize: 22 }}>‹</Text>
      </Pressable>
      <Text style={{
        color: GOLD_LIGHT, fontSize: 15, letterSpacing: 3,
        fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined,
        fontWeight: fontsLoaded ? undefined : '800',
        textShadowColor: 'rgba(233,196,106,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
      }}>
        PLAY ONLINE
      </Text>
      <Pressable onPress={onSignOut} style={({ pressed }) => ({
        position: 'absolute', right: 16, top: 0,
        paddingHorizontal: 12, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GOLD_DIM, opacity: pressed ? 0.7 : 1,
      })}>
        <Text style={{ color: GOLD_LIGHT, fontSize: 12, fontWeight: '700' }}>Sign out</Text>
      </Pressable>
      <View style={{ width: 120, height: 1, backgroundColor: GOLD, opacity: 0.6, marginTop: 8 }} />
    </View>
  );
}

// A gold-glass card: dark surface, subtle gold border, a thin bright rim-light along
// the top edge -- same "premium" treatment used on the Home/Profile/Friends screens.
function GoldCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.card, padding: 16, gap: 12,
      borderWidth: 1, borderColor: GOLD_DIM,
    }}>
      <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,240,210,0.35)' }} />
      {children}
    </View>
  );
}

function GoldButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({
      height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: GOLD, opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
    })}>
      <Text style={{ color: '#1a1408', fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function GhostGoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GOLD_DIM, opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

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
      <LobbyHeroTitle onBack={onBack} onSignOut={onSignOut} />
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ marginTop: 4 }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '700' }}>{profile.username}</Text>
          <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 14 }}>Rating {profile.rating}</Text>
        </View>

        {resume && !searching && (
          <GoldCard>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>You have a game in progress</Text>
            <GoldButton label="Resume game" onPress={() => onGame(resume)} />
          </GoldCard>
        )}

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Time (minutes + increment seconds)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TIMES.map((o, i) => (
              <Pressable key={o.label} onPress={() => !searching && setIdx(i)}
                style={{
                  paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center',
                  backgroundColor: i === idx ? GOLD : 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: i === idx ? GOLD : GOLD_DIM,
                }}>
                <Text style={{ color: i === idx ? '#1a1408' : 'rgba(230,222,205,0.9)', fontWeight: '700' }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          {searching ? (
            <>
              <Text style={{ color: t.text, fontSize: 15 }}>Searching for an opponent... keep this screen open.</Text>
              <GhostGoldButton label="Cancel search" onPress={cancel} />
            </>
          ) : (
            <GoldButton label="Find opponent" onPress={find} />
          )}
          {!!msg && <Text style={{ color: 'rgba(230,222,205,0.85)', fontSize: 14 }}>{msg}</Text>}
        </GoldCard>
        <GhostGoldButton label="Friends and challenges" onPress={onFriends} />
        <GhostGoldButton label="Back" onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}