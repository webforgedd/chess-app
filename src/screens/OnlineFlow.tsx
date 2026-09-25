import React, { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { isConfigured, supabase } from '../online/supabase';
import { useSession } from '../online/useSession';
import AuthScreen from './AuthScreen';
import UsernameScreen from './UsernameScreen';
import OnlineLobbyScreen from './OnlineLobbyScreen';
import FriendsScreen from './FriendsScreen';
import OnlineGameScreen from './OnlineGameScreen';

export default function OnlineFlow({ onExit, onReview }: { onExit: () => void; onReview: (sans: string[]) => void }) {
  const t = useTheme();
  const { userId, profile, loading, reload } = useSession();
  const [gameId, setGameId] = useState<string | null>(null);
  const [friends, setFriends] = useState(false);

  if (!isConfigured) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', marginTop: 16 }}>Online play needs setup</Text>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 8 }}>
            <Text style={{ color: t.text, fontSize: 15 }}>1. Create a free Supabase project.</Text>
            <Text style={{ color: t.text, fontSize: 15 }}>2. Run supabase/schema.sql in its SQL Editor.</Text>
            <Text style={{ color: t.text, fontSize: 15 }}>3. Paste your project URL and anon key into src/online/config.ts.</Text>
            <Text style={{ color: t.textMuted, fontSize: 14 }}>Full steps are in README.md.</Text>
          </View>
          <Button label="Back" onPress={onExit} />
        </View>
      </SafeAreaView>
    );
  }
  if (loading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: t.text }}>Loading...</Text></SafeAreaView>;
  }
  if (!userId) return <AuthScreen onBack={onExit} />;
  if (!profile) return <UsernameScreen onDone={reload} onSignOut={() => supabase.auth.signOut()} />;
  if (gameId) return <OnlineGameScreen gameId={gameId} me={userId} onExit={() => { setGameId(null); reload(); }} onReview={onReview} />;
  if (friends) return <FriendsScreen profile={profile} onGame={(id) => { setFriends(false); setGameId(id); }} onBack={() => setFriends(false)} />;
  return <OnlineLobbyScreen profile={profile} onGame={setGameId} onFriends={() => setFriends(true)} onBack={onExit} onSignOut={() => supabase.auth.signOut()} />;
}
