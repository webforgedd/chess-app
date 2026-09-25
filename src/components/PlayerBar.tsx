import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme';

export function fmt(ms: number) {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  if (total < 20000) return `0:${String(s).padStart(2, '0')}.${Math.floor((total % 1000) / 100)}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayerBar({ name, sub, time, active }: { name: string; sub: string; time: string; active: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <View>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>{sub}</Text>
      </View>
      <View style={{ backgroundColor: active ? t.primary : t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, minWidth: 84, alignItems: 'center' }}>
        <Text style={{ color: active ? t.onPrimary : t.text, fontSize: 20, fontWeight: '700' }}>{time}</Text>
      </View>
    </View>
  );
}
