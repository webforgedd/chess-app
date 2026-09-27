import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { isConfigured, supabase } from './supabase';
import { useSession } from './useSession';
import AuthScreen from '../screens/AuthScreen';
import UsernameScreen from '../screens/UsernameScreen';
import { GoldBackground } from '../components/GoldGlass';

// Sits above the whole app: nothing past this point renders until the person is signed
// in and has a username. If Supabase hasn't been configured at all (src/online/config.ts
// still has placeholder values), the gate steps aside so the app is still usable offline
// during development, rather than locking the developer out before setup is done.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { userId, profile, loading, reload } = useSession();

  if (!isConfigured) return <>{children}</>;

  if (loading) {
    return (
      <GoldBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#e9c46a" />
        </View>
      </GoldBackground>
    );
  }

  if (!userId) return <AuthScreen />;
  if (!profile) return <UsernameScreen onDone={reload} onSignOut={() => supabase.auth.signOut()} />;

  return <>{children}</>;
}
