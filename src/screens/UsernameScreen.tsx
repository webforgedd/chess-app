import React, { useState } from 'react';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import { Text, View } from 'react-native';
import { GoldBackground, GlassCard, GlassInput, GoldButton, GhostButton } from '../components/GoldGlass';
import { supabase } from '../online/supabase';

export default function UsernameScreen({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const valid = /^[A-Za-z0-9_]{3,20}$/.test(name);

  const save = async () => {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('create_profile', { p_username: name, p_country: country.trim() || null });
    setBusy(false);
    if (error) setMsg(error.message); else onDone();
  };

  return (
    <GoldBackground>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Text style={{ fontSize: 30, letterSpacing: 2, color: '#f2d9a3', marginBottom: 2, fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined, fontWeight: fontsLoaded ? undefined : '700' }}>CHESSMATE</Text>
        <Text style={{ fontSize: 13, color: 'rgba(230,230,230,0.85)', marginBottom: 18 }}>One last step.</Text>

        <GlassCard>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Choose a username</Text>
          <Text style={{ fontSize: 12, color: 'rgba(230,222,205,0.85)', marginBottom: 4 }}>
            Other players will see this name. 3-20 letters, numbers or underscores.
          </Text>

          <GlassInput placeholder="Username" value={name} onChangeText={setName} autoCapitalize="none" autoCorrect={false} />
          <GlassInput placeholder="Country (optional)" value={country} onChangeText={setCountry} autoCorrect={false} />

          {!!msg && <Text style={{ color: '#f2d9a3', fontSize: 13, marginTop: 8 }}>{msg}</Text>}

          <GoldButton label={busy ? 'Saving...' : 'Continue'} onPress={save} disabled={!valid || busy} />
          <GhostButton label="Sign out" onPress={onSignOut} />
        </GlassCard>
      </View>
    </GoldBackground>
  );
}
