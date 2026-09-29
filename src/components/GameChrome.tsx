import React from 'react';
import { BlurView } from 'expo-blur';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, useTheme } from '../theme';
import { useSettings } from '../settings';

const MARBLE_BG = require('../../assets/login-bg.jpg');

// Royal = warm gold accent. Glass = cool silver accent. Classic = the app's normal
// plain grey theme, completely untouched. Every in-game surface (buttons, panels,
// the timer pill, popups) reads its colours from here, so all three modes stay
// consistent without repeating this logic in every screen.
export function useGameSkin() {
  const t = useTheme();
  const { s } = useSettings();
  const mode = s.pieceStyle; // 'royal' | 'glass' | 'classic'

  if (mode === 'classic') {
    return {
      mode, premium: false as const, bg: t.bg,
      accent: t.primary, onAccent: t.onPrimary, border: 'transparent',
      panelBg: t.surface, panelBg2: t.surface2, text: t.text, textMuted: t.textMuted,
      Background: null as React.ComponentType<{ children: React.ReactNode }> | null,
    };
  }

  const gold = mode === 'royal';
  const accent = gold ? '#e9c46a' : '#dfe7ee';
  const onAccent = gold ? '#1a1408' : '#12181d';
  const border = gold ? 'rgba(210,175,110,0.55)' : 'rgba(200,215,230,0.4)';
  const scrim = gold ? 'rgba(10,8,5,0.4)' : 'rgba(8,10,14,0.55)';

  // Only Royal gets the marble image background. Glass stays on plain black (bg below)
  // with no image behind it.
  const Background = gold
    ? ({ children }: { children: React.ReactNode }) => (
        <ImageBackground source={MARBLE_BG} resizeMode="cover" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
          {children}
        </ImageBackground>
      )
    : null;

  return {
    mode, premium: true as const, bg: '#0D0D0D',
    accent, onAccent, border,
    panelBg: 'rgba(255,255,255,0.03)', panelBg2: gold ? 'rgba(255,220,160,0.10)' : 'rgba(220,235,250,0.08)',
    text: '#fff', textMuted: gold ? 'rgba(230,222,205,0.8)' : 'rgba(220,230,238,0.8)',
    Background,
  };
}

export function SkinPanel({ skin, children, style }: { skin: ReturnType<typeof useGameSkin>; children: React.ReactNode; style?: any }) {
  if (!skin.premium) {
    return <View style={[{ backgroundColor: skin.panelBg, borderRadius: radius.card, padding: 12 }, style]}>{children}</View>;
  }
  return (
    <View style={[{ borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: skin.border }, style]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: skin.panelBg }]} />
      <View style={{ padding: 12 }}>{children}</View>
    </View>
  );
}

export function SkinButton({ skin, label, onPress, primary = false, disabled = false, flex = false }: {
  skin: ReturnType<typeof useGameSkin>; label: string; onPress: () => void; primary?: boolean; disabled?: boolean; flex?: boolean;
}) {
  if (!skin.premium) {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({
        minHeight: 48, borderRadius: radius.button, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
        flex: flex ? 1 : undefined, backgroundColor: primary ? skin.accent : skin.panelBg2,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: primary ? skin.onAccent : skin.text }}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({
      minHeight: 48, borderRadius: radius.button, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flex: flex ? 1 : undefined,
      overflow: 'hidden', opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      backgroundColor: primary ? skin.accent : 'rgba(255,255,255,0.06)',
      borderWidth: primary ? 0 : 1, borderColor: skin.border,
    })}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: primary ? skin.onAccent : skin.text }}>{label}</Text>
    </Pressable>
  );
}