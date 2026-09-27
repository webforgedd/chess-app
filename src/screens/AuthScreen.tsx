import React, { useState } from 'react';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import { Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme';
import { GoldBackground, GlassCard, GlassInput, GoldButton, GhostButton } from '../components/GoldGlass';
import { supabase } from '../online/supabase';

export default function AuthScreen() {
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  const [signUp, setSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setBusy(true); setMsg('');
    const creds = { email: email.trim(), password };
    const { data, error } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (error) setMsg(error.message);
    else if (signUp && !data.session) setMsg('Account created. Check your email to confirm it, then sign in.');
  };

  return (
    <GoldBackground>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Text style={{ fontSize: 30, letterSpacing: 2, color: '#f2d9a3', marginBottom: 2, fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined, fontWeight: fontsLoaded ? undefined : '700' }}>CHESSMATE</Text>
        <Text style={{ fontSize: 13, color: 'rgba(230,230,230,0.85)', marginBottom: 18 }}>Play online. Anywhere.</Text>

        <GlassCard>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
            {signUp ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(230,222,205,0.85)', marginBottom: 4 }}>
            {signUp ? 'Sign up to play online and track your rating.' : 'Sign in to keep your rating and games.'}
          </Text>

          <GlassInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          <GlassInput placeholder="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

          {!!msg && <Text style={{ color: '#f2d9a3', fontSize: 13, marginTop: 8 }}>{msg}</Text>}

          <GoldButton label={busy ? 'Please wait...' : signUp ? 'Create account' : 'Sign In'} onPress={submit} disabled={busy || !email || password.length < 6} />
          <GhostButton
            label={signUp ? 'I already have an account' : "Don't have an account?  Sign up"}
            onPress={() => { setSignUp(!signUp); setMsg(''); }}
          />
        </GlassCard>
      </View>
    </GoldBackground>
  );
}

// Kept for FriendsScreen and UsernameScreen, which use a plain (non-glass) text field
// on the app's normal theme, not the gold/marble background.
export function Field(props: any) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.textMuted}
      style={{ backgroundColor: t.surface2, color: t.text, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 16 }}
      {...props}
    />
  );
}
