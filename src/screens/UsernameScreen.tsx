import React, { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';
import { Field } from './AuthScreen';

export default function UsernameScreen({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const t = useTheme();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const valid = /^[A-Za-z0-9_]{3,20}$/.test(name);

  const save = async () => {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('create_profile', { p_username: name });
    setBusy(false);
    if (error) setMsg(error.message); else onDone();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', marginTop: 16 }}>Choose a username</Text>
        <Text style={{ color: t.textMuted, fontSize: 15 }}>Other players will see this name. 3-20 letters, numbers or underscores.</Text>
        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Field placeholder="Username" value={name} onChangeText={setName} autoCapitalize="none" autoCorrect={false} />
          {!!msg && <Text style={{ color: t.text, fontSize: 14 }}>{msg}</Text>}
          <Button primary label={busy ? 'Saving...' : 'Continue'} onPress={save} disabled={!valid || busy} />
        </View>
        <Button label="Sign out" onPress={onSignOut} />
      </View>
    </SafeAreaView>
  );
}
