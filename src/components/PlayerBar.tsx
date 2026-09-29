import React from 'react';
import { Text, View } from 'react-native';
import { useGameSkin } from './GameChrome';

export function fmt(ms: number) {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  if (total < 20000) return `0:${String(s).padStart(2, '0')}.${Math.floor((total % 1000) / 100)}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayerBar({ name, sub, time, active, skin }: {
  name: string; sub: string; time: string; active: boolean; skin?: ReturnType<typeof useGameSkin>;
}) {
  const fallback = useGameSkin();
  const k = skin ?? fallback;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <View>
        <Text style={{ color: k.text, fontSize: 15, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: k.textMuted, fontSize: 13 }}>{sub}</Text>
      </View>
      {/* Active clock is filled, so you can tell whose turn it is without colour */}
      <View style={{
        backgroundColor: active ? k.accent : k.panelBg2, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 6, minWidth: 84, alignItems: 'center',
        borderWidth: k.premium && !active ? 1 : 0, borderColor: k.border,
      }}>
        <Text style={{ color: active ? k.onAccent : k.text, fontSize: 20, fontWeight: '700' }}>{time}</Text>
      </View>
    </View>
  );
}
