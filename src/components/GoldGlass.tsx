import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';

// Shared "gold on marble" look for the auth screens: a photo background, a frosted
// glass card, and glass-pill inputs/buttons that match the design the user approved.
const BG = require('../../assets/login-bg.jpg');
const GOLD = '#e9c46a';
const GOLD_SOFT = 'rgba(233,196,106,0.55)';

export function GoldBackground({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground source={BG} resizeMode="cover" style={styles.bg}>
      <View style={styles.scrim} />
      {children}
    </ImageBackground>
  );
}

export function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.cardWrap, style]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.cardTint} />
      {children}
    </View>
  );
}

export function GlassInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrap}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      <TextInput placeholderTextColor="rgba(235,228,212,0.65)" style={styles.input} {...props} />
    </View>
  );
}

export function GoldButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,5,0.35)' },
  cardWrap: {
    borderRadius: 28, overflow: 'hidden', padding: 22, gap: 4,
    borderWidth: 1.5, borderColor: GOLD_SOFT,
  },
  cardTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(40,32,20,0.35)' },
  inputWrap: {
    borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(235,205,140,0.55)', marginTop: 8,
  },
  input: { height: 50, paddingHorizontal: 16, fontSize: 15, color: '#f2ead8' },
  button: {
    height: 52, borderRadius: 16, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#1a1408' },
  ghostText: { textAlign: 'center', marginTop: 16, color: 'rgba(230,222,205,0.85)', fontSize: 13 },
});
