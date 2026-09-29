import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { radius } from '../theme';
import { useGameSkin } from './GameChrome';
import { supabase } from '../online/supabase';

const EMOJI = ['👍', '😊', '😮', '😢', '🤝', '♟️'];

// Ephemeral, in-game reactions: nothing is saved, so a fresh viewer never sees old ones.
export default function Reactions({ gameId, mySide }: { gameId: string; mySide: 'w' | 'b' }) {
  const skin = useGameSkin();
  const [incoming, setIncoming] = useState<string | null>(null);
  const chanRef = useRef<any>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`react-${gameId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'emoji' }, (msg: any) => {
      if (msg.payload?.from === mySide) return;
      setIncoming(msg.payload.emoji);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setIncoming(null), 2200);
    }).subscribe();
    chanRef.current = ch;
    return () => { supabase.removeChannel(ch); if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [gameId]);

  const send = (emoji: string) => chanRef.current?.send({ type: 'broadcast', event: 'emoji', payload: { emoji, from: mySide } });

  return (
    <View style={{ width: '100%', gap: 8 }}>
      {incoming && (
        <View style={{ alignSelf: 'flex-start', backgroundColor: skin.panelBg2, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 8, borderWidth: skin.premium ? 1 : 0, borderColor: skin.border }}>
          <Text style={{ fontSize: 22 }}>{incoming}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {EMOJI.map((e) => (
          <Pressable key={e} onPress={() => send(e)} style={{
            width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: skin.panelBg2, borderWidth: skin.premium ? 1 : 0, borderColor: skin.border,
          }}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
