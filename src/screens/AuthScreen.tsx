import React, { useState } from 'react';
import { SafeAreaView, Text, TextInput, View } from 'react-native';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';

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

export default function AuthScreen({ onBack }: { onBack: () => void }) {
  const t = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', marginTop: 16 }}>Play online</Text>
        <Text style={{ color: t.textMuted, fontSize: 15 }}>{signUp ? 'Create an account to play rated games.' : 'Sign in to play rated games.'}</Text>
        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Field placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          <Field placeholder="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          {!!msg && <Text style={{ color: t.text, fontSize: 14 }}>{msg}</Text>}
          <Button primary label={busy ? 'Please wait...' : signUp ? 'Create account' : 'Sign in'} onPress={submit} disabled={busy || !email || password.length < 6} />
          <Button label={signUp ? 'I already have an account' : 'Create a new account'} onPress={() => { setSignUp(!signUp); setMsg(''); }} />
        </View>
        <Button label="Back" onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}
