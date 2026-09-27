import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { isConfigured, supabase } from '../online/supabase';
import { useSession } from '../online/useSession';
import AuthScreen from './AuthScreen';
import UsernameScreen from './UsernameScreen';
import FriendsScreen from './FriendsScreen';
import OnlineGameScreen from './OnlineGameScreen';

// Lets the Profile tab open Friends directly, without going through the online
// lobby first. Mirrors OnlineFlow's own sign-in gating so it works the same way
// whichever screen you reach it from.
export default function FriendsFlow({ onExit, onReview }: { onExit: () => void; onReview: (sans: string[]) => void }) {
  const t = useTheme();
  const { userId, profile, loading, reload } = useSession();
  const [gameId, setGameId] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: t.textMuted, textAlign: 'center' }}>Friends need Supabase set up first (see README).</Text>
      </View>
    );
  }
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={t.text} /></View>;
  }
  if (!userId) return <AuthScreen />;
  if (!profile) return <UsernameScreen onDone={reload} onSignOut={() => supabase.auth.signOut()} />;
  if (gameId) return <OnlineGameScreen key={gameId} gameId={gameId} me={userId} onExit={() => { setGameId(null); onExit(); }} onReview={onReview} onRematch={setGameId} />;
  return <FriendsScreen profile={profile} onGame={setGameId} onBack={onExit} />;
}
