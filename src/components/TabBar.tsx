import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

export type Tab = 'play' | 'puzzles' | 'profile' | 'settings';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'play', label: 'Play', icon: '♞\uFE0E' },
  { id: 'puzzles', label: 'Puzzles', icon: '♟\uFE0E' },
  { id: 'profile', label: 'Profile', icon: '♚\uFE0E' },
  { id: 'settings', label: 'Settings', icon: '⚙\uFE0E' },
];

const GOLD = '#f0dfae';
const GOLD_DIM = 'rgba(200,175,120,0.65)';

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={styles.wrap}>
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.row}>
        {TABS.map((x) => {
          const on = x.id === tab;
          return (
            <Pressable key={x.id} onPress={() => onChange(x.id)} style={styles.item}>
              {on && <View style={styles.activeBar} />}
              <Text style={[styles.icon, { color: on ? GOLD : GOLD_DIM }]}>{x.icon}</Text>
              <Text style={[styles.label, { color: on ? GOLD : GOLD_DIM, fontWeight: on ? '700' : '500' }]}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: Platform.OS === 'ios' ? 22 : 10, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(210,175,110,0.55)', overflow: 'hidden',
  },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,5,3,0.78)' },
  row: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', paddingTop: 6 },
  activeBar: { position: 'absolute', top: -8, height: 3, width: 32, borderRadius: 2, backgroundColor: '#e9c46a' },
  icon: { fontSize: 22 },
  label: { fontSize: 11, marginTop: 2 },
});
