import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import { boardThemes, radius, useTheme } from '../theme';
import { PieceStyle, useSettings } from '../settings';
import GlassPiece from '../components/GlassPiece';

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';
const GOLD_DIM = 'rgba(210,175,110,0.45)';

function GoldCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.card, padding: 16, gap: 12,
      borderWidth: 1, borderColor: GOLD_DIM, overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,240,210,0.35)' }} />
      {children}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16, height: 40, borderRadius: 20, justifyContent: 'center',
        backgroundColor: on ? GOLD : 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: on ? GOLD : GOLD_DIM,
      }}
    >
      <Text style={{ color: on ? '#1a1408' : 'rgba(230,222,205,0.9)', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  const { s, update } = useSettings();
  const c = boardThemes[s.boardTheme];
  const names: Record<string, string> = { grey: 'Grey', charcoal: 'Charcoal', mono: 'Mono' };
  const styles: { id: PieceStyle; label: string }[] = [{ id: 'glass', label: 'Glass' }, { id: 'royal', label: 'Royal' }, { id: 'classic', label: 'Classic' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
          <Text style={{
            color: GOLD_LIGHT, fontSize: 34, letterSpacing: 2,
            fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined,
            fontWeight: fontsLoaded ? undefined : '800',
            textShadowColor: 'rgba(233,196,106,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
          }}>
            SETTINGS
          </Text>
          <View style={{ width: 110, height: 1, backgroundColor: GOLD, opacity: 0.6, marginTop: 8, marginBottom: 10 }} />
          <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12, letterSpacing: 1 }}>MAKE IT YOURS</Text>
        </View>

        {/* Live preview */}
        <GoldCard>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>Preview</Text>
          <View style={{ flexDirection: 'row', height: 96, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: GOLD_DIM }}>
            {(['k', 'q', 'n', 'p'] as const).map((p, i) => (
              <View key={p} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: i % 2 ? c.dark : c.light }}>
                {s.pieceStyle !== 'classic'
                  ? <GlassPiece type={p} color={i < 2 ? 'w' : 'b'} size={72} style={s.pieceStyle as 'glass' | 'royal'} />
                  : <Text style={{ fontSize: 56, color: i < 2 ? '#fff' : '#111' }}>{{ k: '♚', q: '♛', n: '♞', p: '♟' }[p]}{'\uFE0E'}</Text>}
              </View>
            ))}
          </View>
        </GoldCard>

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Piece style</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {styles.map((x) => <Chip key={x.id} label={x.label} on={s.pieceStyle === x.id} onPress={() => update({ pieceStyle: x.id })} />)}
          </View>
        </GoldCard>

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Board colours</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(Object.keys(boardThemes) as (keyof typeof boardThemes)[]).map((k) => (
              <Chip key={k} label={names[k]} on={s.boardTheme === k} onPress={() => update({ boardTheme: k })} />
            ))}
          </View>
        </GoldCard>
      </ScrollView>
    </SafeAreaView>
  );
}
