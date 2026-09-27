import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';
import { Challenge, Profile } from '../online/types';
import { Field } from './AuthScreen';

const TIMES = [
  { label: '3+2', m: 3, i: 2 }, { label: '5+0', m: 5, i: 0 }, { label: '10+0', m: 10, i: 0 }, { label: '15+10', m: 15, i: 10 },
];

type FriendRequest = { id: string; from_user: string; to_user: string; status: string };

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
      <ScreenHeader title="Friends" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{friendCount} friends</Text>
          <Field placeholder="Add friend by username" value={friendName} onChangeText={setFriendName} autoCapitalize="none" autoCorrect={false} />
          <Button primary label="Send friend request" onPress={sendFriend} disabled={!friendName.trim()} />
          {!!friendMsg && <Text style={{ color: t.text, fontSize: 14 }}>{friendMsg}</Text>}
        </View>

        {incomingFriend.length > 0 && (
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Friend requests</Text>
            {incomingFriend.map((f) => (
              <View key={f.id} style={{ gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: 14 }}>{f.fromName}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button flex primary label="Accept" onPress={() => acceptFriend(f.id)} />
                  <Button flex label="Decline" onPress={() => declineFriend(f.id)} />
                </View>
              </View>
            ))}
          </View>
        )}

        {incoming.length > 0 && (
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Challenges for you</Text>
            {incoming.map((c) => (
              <View key={c.id} style={{ gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: 14 }}>{c.fromName} · {c.minutes}+{c.increment}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button flex primary label="Accept" onPress={() => accept(c.id)} />
                  <Button flex label="Decline" onPress={() => decline(c.id)} />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Challenge a friend by username</Text>
          <Field placeholder="Their username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((o, i) => (
              <View key={o.label} style={{ width: 70 }}>
                <Button label={o.label} primary={i === idx} onPress={() => setIdx(i)} />
              </View>
            ))}
          </View>
          <Button primary label="Send challenge" onPress={send} disabled={!username.trim()} />
          {!!msg && <Text style={{ color: t.text, fontSize: 14 }}>{msg}</Text>}
        </View>

        {outgoing.length > 0 && (
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Waiting for a reply</Text>
            {outgoing.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: t.textMuted, fontSize: 14 }}>{c.toName} · {c.minutes}+{c.increment}</Text>
                <View style={{ width: 90 }}><Button label="Cancel" onPress={() => cancel(c.id)} /></View>
              </View>
            ))}
          </View>
        )}

        <Button label="Back" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}
