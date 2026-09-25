import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';

export type Tab = 'play' | 'puzzles' | 'settings';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'play', label: 'Play', icon: '♞\uFE0E' },
  { id: 'puzzles', label: 'Puzzles', icon: '♟\uFE0E' },
  { id: 'settings', label: 'Settings', icon: '⚙\uFE0E' },
];

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface, paddingBottom: 12 }}>
      {TABS.map((x) => {
        const on = x.id === tab;
        return (
          <Pressable key={x.id} onPress={() => onChange(x.id)} style={{ flex: 1, alignItems: 'center', paddingTop: 8 }}>
            <View style={{ position: 'absolute', top: 0, height: 3, width: 32, borderRadius: 2, backgroundColor: on ? t.primary : 'transparent' }} />
            <Text style={{ fontSize: 22, color: on ? t.text : t.textMuted }}>{x.icon}</Text>
            <Text style={{ fontSize: 12, fontWeight: on ? '700' : '400', color: on ? t.text : t.textMuted }}>{x.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
