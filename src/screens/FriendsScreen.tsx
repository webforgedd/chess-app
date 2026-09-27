import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';
import { Challenge, Profile } from '../online/types';
import { Field } from './AuthScreen';

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';
const GOLD_DIM = 'rgba(210,175,110,0.45)';

const TIMES = [
  { label: '3+2', m: 3, i: 2 }, { label: '5+0', m: 5, i: 0 }, { label: '10+0', m: 10, i: 0 }, { label: '15+10', m: 15, i: 10 },
];

type FriendRequest = { id: string; from_user: string; to_user: string; status: string };

// Gold Cinzel hero title -- same treatment as Home/Profile, font size dialed
// down to 25 for this screen as requested.
function FriendsHeroTitle({ onBack }: { onBack: () => void }) {
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  return (
    <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
      <Pressable onPress={onBack} style={{ position: 'absolute', left: 20, top: 4, padding: 4 }}>
        <Text style={{ color: GOLD_LIGHT, fontSize: 22 }}>‹</Text>
      </Pressable>
      <Text style={{
        color: GOLD_LIGHT, fontSize: 20, letterSpacing: 3,
        fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined,
        fontWeight: fontsLoaded ? undefined : '800',
        textShadowColor: 'rgba(233,196,106,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
      }}>
        FRIENDS
      </Text>
      <View style={{ width: 120, height: 1, backgroundColor: GOLD, opacity: 0.6, marginTop: 8 }} />
    </View>
  );
}

// A gold-glass card: dark surface, subtle gold border, a thin bright rim-light along
// the top edge -- same "premium" treatment used on the Home/Profile screens.
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

function GoldButton({ label, onPress, disabled, flex }: { label: string; onPress: () => void; disabled?: boolean; flex?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({
      height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flex: flex ? 1 : undefined,
      backgroundColor: GOLD, opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
    })}>
      <Text style={{ color: '#1a1408', fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function GhostGoldButton({ label, onPress, flex, small }: { label: string; onPress: () => void; flex?: boolean; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: small ? 44 : 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flex: flex ? 1 : undefined,
      backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GOLD_DIM, opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// Time-control chip, matching the Home screen's chip style
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 70, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? GOLD : 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: on ? GOLD : GOLD_DIM,
      }}
    >
      <Text style={{ color: on ? '#1a1408' : 'rgba(230,222,205,0.9)', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export default function FriendsScreen({ profile, onGame, onBack }: {
  profile: Profile; onGame: (id: string) => void; onBack: () => void;
}) {
  const t = useTheme();
  const [username, setUsername] = useState('');
  const [idx, setIdx] = useState(1);
  const [msg, setMsg] = useState('');
  const [incoming, setIncoming] = useState<(Challenge & { fromName: string })[]>([]);
  const [outgoing, setOutgoing] = useState<(Challenge & { toName: string })[]>([]);

  const [friendName, setFriendName] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  const [friendCount, setFriendCount] = useState(0);
  const [incomingFriend, setIncomingFriend] = useState<(FriendRequest & { fromName: string })[]>([]);

  const refresh = async () => {
    const { data: inc } = await supabase.from('challenges').select('*, from_profile:profiles!challenges_from_user_fkey(username)')
      .eq('to_user', profile.id).eq('status', 'pending');
    const { data: out } = await supabase.from('challenges').select('*, to_profile:profiles!challenges_to_user_fkey(username)')
      .eq('from_user', profile.id).eq('status', 'pending');
    setIncoming((inc ?? []).map((r: any) => ({ ...r, fromName: r.from_profile?.username ?? '?' })));
    setOutgoing((out ?? []).map((r: any) => ({ ...r, toName: r.to_profile?.username ?? '?' })));
  };

  const refreshFriends = async () => {
    const { data: fc } = await supabase.rpc('friends_count', { p_user: profile.id });
    setFriendCount(fc ?? 0);
    const { data: fr } = await supabase.from('friend_requests').select('*, from_profile:profiles!friend_requests_from_user_fkey(username)')
      .eq('to_user', profile.id).eq('status', 'pending');
    setIncomingFriend((fr ?? []).map((r: any) => ({ ...r, fromName: r.from_profile?.username ?? '?' })));
  };

  useEffect(() => {
    refresh(); refreshFriends();
    const ch = supabase.channel(`challenges-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, refreshFriends)
      .subscribe();
    const poll = setInterval(() => { refresh(); refreshFriends(); }, 4000);
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [profile.id]);

  const send = async () => {
    setMsg('');
    const tc = TIMES[idx];
    const { error } = await supabase.rpc('send_challenge', { p_to_username: username.trim(), p_minutes: tc.m, p_increment: tc.i });
    if (error) setMsg(error.message); else { setMsg(`Challenge sent to ${username.trim()}.`); setUsername(''); refresh(); }
  };

  const accept = async (id: string) => {
    const { data, error } = await supabase.rpc('accept_challenge', { p_challenge: id });
    if (error) setMsg(error.message); else onGame((data as Challenge).game_id!);
  };
  const decline = async (id: string) => { await supabase.rpc('decline_challenge', { p_challenge: id }); refresh(); };
  const cancel = async (id: string) => { await supabase.rpc('cancel_challenge', { p_challenge: id }); refresh(); };

  const sendFriend = async () => {
    setFriendMsg('');
    const { error } = await supabase.rpc('send_friend_request', { p_to_username: friendName.trim() });
    if (error) setFriendMsg(error.message); else { setFriendMsg(`Friend request sent to ${friendName.trim()}.`); setFriendName(''); }
  };
  const acceptFriend = async (id: string) => { await supabase.rpc('respond_friend_request', { p_request: id, p_accept: true }); refreshFriends(); };
  const declineFriend = async (id: string) => { await supabase.rpc('respond_friend_request', { p_request: id, p_accept: false }); refreshFriends(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <FriendsHeroTitle onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>{friendCount} friends</Text>
          <Field placeholder="Add friend by username" value={friendName} onChangeText={setFriendName} autoCapitalize="none" autoCorrect={false} />
          <GoldButton label="Send friend request" onPress={sendFriend} disabled={!friendName.trim()} />
          {!!friendMsg && <Text style={{ color: 'rgba(230,222,205,0.85)', fontSize: 14 }}>{friendMsg}</Text>}
        </GoldCard>

        {incomingFriend.length > 0 && (
          <GoldCard>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>Friend requests</Text>
            {incomingFriend.map((f) => (
              <View key={f.id} style={{ gap: 8 }}>
                <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 14 }}>{f.fromName}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <GoldButton flex label="Accept" onPress={() => acceptFriend(f.id)} />
                  <GhostGoldButton flex small label="Decline" onPress={() => declineFriend(f.id)} />
                </View>
              </View>
            ))}
          </GoldCard>
        )}

        {incoming.length > 0 && (
          <GoldCard>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>Challenges for you</Text>
            {incoming.map((c) => (
              <View key={c.id} style={{ gap: 8 }}>
                <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 14 }}>{c.fromName} · {c.minutes}+{c.increment}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <GoldButton flex label="Accept" onPress={() => accept(c.id)} />
                  <GhostGoldButton flex small label="Decline" onPress={() => decline(c.id)} />
                </View>
              </View>
            ))}
          </GoldCard>
        )}

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Challenge a friend by username</Text>
          <Field placeholder="Their username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((o, i) => (
              <Chip key={o.label} label={o.label} on={i === idx} onPress={() => setIdx(i)} />
            ))}
          </View>
          <GoldButton label="Send challenge" onPress={send} disabled={!username.trim()} />
          {!!msg && <Text style={{ color: 'rgba(230,222,205,0.85)', fontSize: 14 }}>{msg}</Text>}
        </GoldCard>

        {outgoing.length > 0 && (
          <GoldCard>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>Waiting for a reply</Text>
            {outgoing.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: 'rgba(230,222,205,0.75)', fontSize: 14 }}>{c.toName} · {c.minutes}+{c.increment}</Text>
                <View style={{ width: 90 }}><GhostGoldButton small label="Cancel" onPress={() => cancel(c.id)} /></View>
              </View>
            ))}
          </GoldCard>
        )}

        <GhostGoldButton label="Back" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}