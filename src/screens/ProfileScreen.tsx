import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import * as ImagePicker from 'expo-image-picker';
import { radius, useTheme } from '../theme';
import Sparkline from '../components/Sparkline';
import { supabase, isConfigured } from '../online/supabase';
import { useSession } from '../online/useSession';
import { load } from '../storage';
import { classifyOpening } from '../game/openings';
import AuthScreen from './AuthScreen';
import UsernameScreen from './UsernameScreen';

const KING_AVATAR = require('../../assets/intro-king.jpg');

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';
const GOLD_DIM = 'rgba(210,175,110,0.45)';

function GoldCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.card, padding: 16, gap: 8,
      borderWidth: 1, borderColor: GOLD_DIM, overflow: 'hidden',
    }, style]}>
      <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,240,210,0.35)' }} />
      {children}
    </View>
  );
}

function GoldButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({
      height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: GOLD, opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
    })}>
      <Text style={{ color: '#1a1408', fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function GhostGoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GOLD_DIM, opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

type Fmt = 'bullet' | 'blitz' | 'rapid';
const FORMAT_LABEL: Record<Fmt, string> = { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid' };

type GameRow = {
  id: string; white: string; black: string; minutes: number; result: string | null; reason: string | null;
  move_count: number; created_at: string; white_rating_change: number | null; black_rating_change: number | null;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <GoldCard style={{ flex: 1 }}>
      <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: GOLD_LIGHT, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      {!!sub && <Text style={{ color: 'rgba(230,222,205,0.6)', fontSize: 11 }}>{sub}</Text>}
    </GoldCard>
  );
}

function ProfileInner({ userId, onOpenSettings, onOpenFriends, focused }: { userId: string; onOpenSettings: () => void; onOpenFriends: () => void; focused: boolean }) {
  const t = useTheme();
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  const [profile, setProfile] = useState<any>(null);
  const [trendData, setTrendData] = useState<Record<Fmt, number[]>>({ bullet: [], blitz: [], rapid: [] });
  const [trendFmt, setTrendFmt] = useState<Fmt | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [friends, setFriends] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [knightMate, setKnightMate] = useState(false);
  const [opening, setOpening] = useState<{ white?: string; black?: string }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameMsg, setNameMsg] = useState('');
  const [savingName, setSavingName] = useState(false);

  const load_ = async () => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(p);

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: hist } = await supabase.from('rating_history').select('format, rating, created_at')
      .eq('profile_id', userId).gte('created_at', since).order('created_at');
    const byFmt: Record<string, number[]> = { bullet: [], blitz: [], rapid: [] };
    (hist ?? []).forEach((h: any) => { byFmt[h.format]?.push(h.rating); });
    setTrendData(byFmt as Record<Fmt, number[]>);
    const best = (Object.entries(byFmt) as [Fmt, number[]][]).sort((a, b) => b[1].length - a[1].length)[0];
    setTrendFmt((prev) => (prev && byFmt[prev]?.length ? prev : best && best[1].length ? best[0] : null));

    const { data: g } = await supabase.from('games').select('*')
      .or(`white.eq.${userId},black.eq.${userId}`).eq('status', 'finished')
      .order('created_at', { ascending: false }).limit(50);
    const rows = (g ?? []) as GameRow[];
    setGames(rows);

    const oppIds = Array.from(new Set(rows.map((r) => (r.white === userId ? r.black : r.white))));
    if (oppIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, username').in('id', oppIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((r: any) => (map[r.id] = r.username));
      setNames(map);
    }

    const { data: fc } = await supabase.rpc('friends_count', { p_user: userId });
    setFriends(fc ?? 0);

    const solved = await load<string[]>('solved-puzzles', []);
    setPuzzlesSolved(solved.length);

    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const { data: openers } = await supabase.from('moves').select('game_id, ply, san').in('game_id', ids).lte('ply', 8).order('ply');
      const byGame: Record<string, string[]> = {};
      (openers ?? []).forEach((m: any) => { (byGame[m.game_id] ??= [])[m.ply - 1] = m.san; });
      const whiteNames: Record<string, number> = {}; const blackNames: Record<string, number> = {};
      rows.forEach((g) => {
        const sans = (byGame[g.id] ?? []).filter(Boolean);
        if (sans.length === 0) return;
        const name = classifyOpening(sans);
        if (!name) return;
        if (g.white === userId) whiteNames[name] = (whiteNames[name] ?? 0) + 1;
        if (g.black === userId) blackNames[name] = (blackNames[name] ?? 0) + 1;
      });
      const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];
      setOpening({ white: top(whiteNames), black: top(blackNames) });

      const mateGames = rows.filter((r) => r.reason === 'checkmate' &&
        ((r.result === 'w' && r.white === userId) || (r.result === 'b' && r.black === userId)));
      if (mateGames.length) {
        const { data: finals } = await supabase.from('moves').select('game_id, ply, san').in('game_id', mateGames.map((m) => m.id));
        const lastByGame: Record<string, string> = {};
        (finals ?? []).forEach((m: any) => {
          if (!lastByGame[m.game_id] || m.ply > (lastByGame as any)[`_ply_${m.game_id}`]) {
            lastByGame[m.game_id] = m.san; (lastByGame as any)[`_ply_${m.game_id}`] = m.ply;
          }
        });
        setKnightMate(Object.values(lastByGame).some((san) => san.startsWith('N')));
      }
    }
    setLoading(false);
  };

  const openEditName = () => { setNameInput(profile?.username ?? ''); setNameMsg(''); setEditingName(true); };
  const saveName = async () => {
    setSavingName(true); setNameMsg('');
    const { error } = await supabase.rpc('update_username', { p_new: nameInput.trim() });
    setSavingName(false);
    if (error) { setNameMsg(error.message); return; }
    setProfile((p: any) => ({ ...p, username: nameInput.trim() }));
    setEditingName(false);
  };

  const removePhoto = () => {
    Alert.alert('Remove profile picture?', 'This brings back the default picture.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('set_avatar_url', { p_url: null });
        if (!error) setProfile((p: any) => ({ ...p, avatar_url: null }));
      } },
    ]);
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/avatar.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
        upsert: true, contentType: blob.type || 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: rpcErr } = await supabase.rpc('set_avatar_url', { p_url: url });
      if (rpcErr) throw rpcErr;
      setProfile((p: any) => ({ ...p, avatar_url: url }));
    } catch (e: any) {
      Alert.alert('Could not update photo', e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => { load_(); }, [userId]);

  const wasFocused = React.useRef(focused);
  useEffect(() => {
    if (focused && !wasFocused.current) load_();
    wasFocused.current = focused;
  }, [focused]);

  const onRefresh = async () => { setRefreshing(true); await load_(); setRefreshing(false); };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.textMuted }}>Loading profile...</Text></View>;
  }

  const wins = games.filter((g) => (g.result === 'w' && g.white === userId) || (g.result === 'b' && g.black === userId)).length;
  const draws = games.filter((g) => g.result === 'd').length;
  const losses = games.length - wins - draws;
  const total = Math.max(1, games.length);

  let streak = 0;
  for (const g of games) {
    const won = (g.result === 'w' && g.white === userId) || (g.result === 'b' && g.black === userId);
    if (won) streak++; else break;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: t.bg }}
        contentContainerStyle={{ padding: 20, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
          <Text style={{
            color: GOLD_LIGHT, fontSize: 34, letterSpacing: 2,
            fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined,
            fontWeight: fontsLoaded ? undefined : '800',
            textShadowColor: 'rgba(233,196,106,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
          }}>
            PROFILE
          </Text>
          <View style={{ width: 110, height: 1, backgroundColor: GOLD, opacity: 0.6, marginTop: 8, marginBottom: 10 }} />
        </View>

        {/* Header card */}
        <GoldCard style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Pressable onPress={pickAvatar} style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 2, borderColor: GOLD }}>
            <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : KING_AVATAR} style={{ width: 72, height: 72 }} resizeMode="cover" />
            <View style={{ position: 'absolute', right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, alignItems: 'center' }}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>EDIT</Text>}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Pressable onPress={openEditName} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{profile?.username}</Text>
              <Text style={{ color: 'rgba(230,222,205,0.7)', fontSize: 12 }}>✎</Text>
            </Pressable>
            {!!profile?.country && <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12, marginTop: 2 }}>{profile.country}</Text>}
            <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12, marginTop: 2 }}>
              Member since {profile ? fmtDate(profile.created_at) : ''}
            </Text>
            {!!profile?.avatar_url && (
              <Pressable onPress={removePhoto}><Text style={{ color: 'rgba(230,222,205,0.6)', fontSize: 11, marginTop: 4, textDecorationLine: 'underline' }}>Remove photo</Text></Pressable>
            )}
          </View>
        </GoldCard>

        <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <GoldCard style={{ width: '86%', gap: 12 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>Change username</Text>
              <TextInput
                value={nameInput} onChangeText={setNameInput} autoCapitalize="none" autoCorrect={false}
                placeholder="Username" placeholderTextColor="rgba(230,222,205,0.5)"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 16, borderWidth: 1, borderColor: GOLD_DIM }}
              />
              {!!nameMsg && <Text style={{ color: GOLD_LIGHT, fontSize: 13 }}>{nameMsg}</Text>}
              <GoldButton label={savingName ? 'Saving...' : 'Save'} onPress={saveName} disabled={savingName || nameInput.trim().length < 3} />
              <GhostGoldButton label="Cancel" onPress={() => setEditingName(false)} />
            </GoldCard>
          </View>
        </Modal>

        {/* Ratings */}
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Ratings</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Bullet" value={String(profile?.rating_bullet ?? 1200)} />
          <Stat label="Blitz" value={String(profile?.rating_blitz ?? 1200)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Rapid" value={String(profile?.rating_rapid ?? 1200)} />
          <Stat label="Puzzles solved" value={String(puzzlesSolved)} />
        </View>

        {/* Trend */}
        <GoldCard>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Rating Trend (30 days)</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['bullet', 'blitz', 'rapid'] as Fmt[]).map((f) => (
                <Pressable key={f} onPress={() => setTrendFmt(f)}
                  style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: trendFmt === f ? GOLD : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: trendFmt === f ? GOLD : GOLD_DIM }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: trendFmt === f ? '#1a1408' : 'rgba(230,222,205,0.8)' }}>{FORMAT_LABEL[f]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {trendFmt && trendData[trendFmt].length >= 2 ? (
            <Sparkline values={trendData[trendFmt]} width={310} height={90} />
          ) : (
            <Text style={{ color: 'rgba(230,222,205,0.7)', fontSize: 13 }}>Play a few rated {trendFmt ? FORMAT_LABEL[trendFmt] : ''} games to see your trend here.</Text>
          )}
        </GoldCard>

        {/* Win/Loss/Draw */}
        <GoldCard>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 }}>Win / Loss / Draw (last {games.length})</Text>
          <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <View style={{ flex: wins, backgroundColor: '#6ec878' }} />
            <View style={{ flex: losses, backgroundColor: '#dc6464' }} />
            <View style={{ flex: draws || 0.0001, backgroundColor: 'rgba(230,222,205,0.5)' }} />
          </View>
          <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12 }}>
            {Math.round((wins / total) * 100)}% Wins · {Math.round((losses / total) * 100)}% Losses · {Math.round((draws / total) * 100)}% Draws
          </Text>
        </GoldCard>

        {/* Recent matches */}
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Recent Matches</Text>
        {games.length === 0 && <Text style={{ color: 'rgba(230,222,205,0.7)', fontSize: 13 }}>No finished online games yet.</Text>}
        {games.slice(0, 8).map((g) => {
          const mine = g.white === userId;
          const oppId = mine ? g.black : g.white;
          const won = (g.result === 'w' && mine) || (g.result === 'b' && !mine);
          const drew = g.result === 'd';
          const change = mine ? g.white_rating_change : g.black_rating_change;
          return (
            <GoldCard key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: drew ? 'rgba(230,222,205,0.6)' : won ? '#6ec878' : '#dc6464', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: drew ? 'rgba(230,222,205,0.8)' : won ? '#6ec878' : '#dc6464', fontWeight: '700' }}>{drew ? '=' : won ? '✓' : '✗'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{names[oppId] ?? 'Opponent'}</Text>
                <Text style={{ color: 'rgba(230,222,205,0.6)', fontSize: 11 }}>{g.move_count} moves</Text>
              </View>
              {change != null && (
                <Text style={{ color: change > 0 ? '#6ec878' : change < 0 ? '#dc6464' : 'rgba(230,222,205,0.7)', fontWeight: '700' }}>
                  {change > 0 ? '+' : ''}{change}
                </Text>
              )}
            </GoldCard>
          );
        })}

        {/* Trophies */}
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Trophies & Badges</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {streak >= 3 && (
            <GoldCard style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, color: GOLD_LIGHT }}>★</Text>
              <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 10, textAlign: 'center' }}>{streak}-Win{'\n'}Streak</Text>
            </GoldCard>
          )}
          {knightMate && (
            <GoldCard style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, color: GOLD_LIGHT }}>★</Text>
              <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 10, textAlign: 'center' }}>Knight{'\n'}Mate</Text>
            </GoldCard>
          )}
          {puzzlesSolved >= 10 && (
            <GoldCard style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, color: GOLD_LIGHT }}>★</Text>
              <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 10, textAlign: 'center' }}>Puzzle{'\n'}Solver</Text>
            </GoldCard>
          )}
          {streak < 3 && !knightMate && puzzlesSolved < 10 && (
            <Text style={{ color: 'rgba(230,222,205,0.7)', fontSize: 13 }}>Play games and solve puzzles to earn badges.</Text>
          )}
        </View>

        {/* Favorite opening */}
        {(opening.white || opening.black) && (
          <GoldCard>
            <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12 }}>Favorite Opening</Text>
            {!!opening.white && <Text style={{ color: GOLD_LIGHT, fontSize: 13, fontWeight: '600' }}>White: {opening.white}</Text>}
            {!!opening.black && <Text style={{ color: GOLD_LIGHT, fontSize: 13, fontWeight: '600' }}>Black: {opening.black}</Text>}
          </GoldCard>
        )}

        {/* Friends */}
        <Pressable onPress={onOpenFriends}>
          <GoldCard style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{friends} Friends</Text>
            <Text style={{ color: 'rgba(230,222,205,0.7)', fontSize: 16 }}>{'>'}</Text>
          </GoldCard>
        </Pressable>

        {/* Settings shortcut */}
        <GhostGoldButton label="Settings" onPress={onOpenSettings} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ProfileScreen({ onOpenSettings, onOpenFriends, focused = true }: { onOpenSettings: () => void; onOpenFriends: () => void; focused?: boolean }) {
  const t = useTheme();
  const { userId, profile, loading, reload } = useSession();

  if (!isConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: t.textMuted, fontSize: 14, textAlign: 'center' }}>
          Online profiles need Supabase set up first (see README).
        </Text>
      </View>
    );
  }
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.textMuted }}>Loading...</Text></View>;
  }
  if (!userId) return <AuthScreen />;
  if (!profile) return <UsernameScreen onDone={reload} onSignOut={() => supabase.auth.signOut()} />;
  return <ProfileInner userId={userId} onOpenSettings={onOpenSettings} onOpenFriends={onOpenFriends} focused={focused} />;
}
