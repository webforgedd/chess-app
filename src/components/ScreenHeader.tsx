import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

// One consistent gold-glass header for every screen. `onBack` is optional: tab-root
// screens (Home, Puzzles, Profile, Settings) have nowhere to go "back" to, since the
// tab bar itself is their navigation, so they pass no onBack and just get the title bar.
export default function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack && (
            <Pressable onPress={onBack} accessibilityLabel="Back" style={styles.backBtn}>
              <Text style={styles.backChevron}>{'\u2039'}</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  );
}

const GOLD = '#e9c46a';
const styles = StyleSheet.create({
  wrap: {
    height: Platform.OS === 'ios' ? 88 : 64, paddingTop: Platform.OS === 'ios' ? 40 : 0,
    borderBottomWidth: 1, borderBottomColor: 'rgba(210,175,110,0.55)', overflow: 'hidden',
  },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,3,0.72)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  side: { width: 44, alignItems: 'flex-start', justifyContent: 'center' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(40,32,18,0.9)', borderWidth: 1, borderColor: GOLD,
  },
  backChevron: { color: '#f7e7bd', fontSize: 22, fontWeight: '700', marginRight: 2 },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '700' },
});
