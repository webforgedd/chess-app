import React from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { boardThemes, radius, useTheme } from '../theme';
import { PieceStyle, useSettings } from '../settings';
import GlassPiece from '../components/GlassPiece';

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 16, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? t.primary : t.surface2 }}>
      <Text style={{ color: on ? t.onPrimary : t.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const { s, update } = useSettings();
  const c = boardThemes[s.boardTheme];
  const names: Record<string, string> = { grey: 'Grey', charcoal: 'Charcoal', mono: 'Mono' };
  const styles: { id: PieceStyle; label: string }[] = [{ id: 'glass', label: 'Glass' }, { id: 'royal', label: 'Royal' }, { id: 'classic', label: 'Classic' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', marginTop: 16 }}>Settings</Text>

        {/* live preview */}
        <View style={{ flexDirection: 'row', height: 96, borderRadius: radius.card, overflow: 'hidden' }}>
          {(['k', 'q', 'n', 'p'] as const).map((p, i) => (
            <View key={p} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: i % 2 ? c.dark : c.light }}>
              {s.pieceStyle === 'glass'
                ? <GlassPiece type={p} color={i < 2 ? 'w' : 'b'} size={72} style={s.pieceStyle as 'glass' | 'royal'} />
                : <Text style={{ fontSize: 56, color: i < 2 ? '#fff' : '#111' }}>{{ k: '♚', q: '♛', n: '♞', p: '♟' }[p]}{'\uFE0E'}</Text>}
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Piece style</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {styles.map((x) => <Chip key={x.id} label={x.label} on={s.pieceStyle === x.id} onPress={() => update({ pieceStyle: x.id })} />)}
          </View>
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Board colours</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(Object.keys(boardThemes) as (keyof typeof boardThemes)[]).map((k) => (
              <Chip key={k} label={names[k]} on={s.boardTheme === k} onPress={() => update({ boardTheme: k })} />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
