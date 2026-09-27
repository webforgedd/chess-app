import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import { radius, useTheme } from '../theme';
import { Mode, TimeControl } from '../game/useChessGame';

const LEVEL_NAMES = ['', 'Beginner', 'Casual', 'Club', 'Improver', 'Skilled', 'Strong', 'Expert', 'Master'];
const TIMES: { label: string; tc: TimeControl }[] = [
  { label: 'Untimed', tc: null },
  { label: '1+0', tc: { minutes: 1, increment: 0 } },
  { label: '3+2', tc: { minutes: 3, increment: 2 } },
  { label: '5+0', tc: { minutes: 5, increment: 0 } },
  { label: '10+0', tc: { minutes: 10, increment: 0 } },
  { label: '15+10', tc: { minutes: 15, increment: 10 } },
];

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';
const GOLD_DIM = 'rgba(210,175,110,0.45)';

// A gold-glass card: dark surface, subtle gold border, a thin bright rim-light along
// the top edge to catch the light -- the same "premium" treatment used on the login
// and profile screens, applied here to the Play tab's cards.
function GoldCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.card, padding: 16, gap: 12,
      borderWidth: 1, borderColor: GOLD_DIM,
    }}>
      <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,240,210,0.35)' }} />
      {children}
    </View>
  );
}

function Chip({ label, on, onPress, flex }: { label: string; on: boolean; onPress: () => void; flex?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        flex: flex ? 1 : undefined, backgroundColor: on ? GOLD : 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: on ? GOLD : GOLD_DIM,
      }}
    >
      <Text style={{ color: on ? '#1a1408' : 'rgba(230,222,205,0.9)', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function GoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: GOLD, opacity: pressed ? 0.85 : 1,
    })}>
      <Text style={{ color: '#1a1408', fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function GhostGoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: GOLD_DIM, opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ onPlay, onOnline }: { onPlay: (m: Mode, level: number, tc: TimeControl) => void; onOnline: () => void }) {
  const t = useTheme();
  const [level, setLevel] = useState(3);
  const [timeIdx, setTimeIdx] = useState(4); // 10+0
  const tc = TIMES[timeIdx].tc;
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        {/* Hero title */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
          <Text style={{
            color: GOLD_LIGHT, fontSize: 40, letterSpacing: 3,
            fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined,
            fontWeight: fontsLoaded ? undefined : '800',
            textShadowColor: 'rgba(233,196,106,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
          }}>
            CHESSMATE
          </Text>
          <View style={{ width: 120, height: 1, backgroundColor: GOLD, opacity: 0.6, marginTop: 8, marginBottom: 10 }} />
          <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 13, letterSpacing: 1 }}>PICK HOW YOU WANT TO PLAY</Text>
        </View>

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Time control</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((o, i) => (
              <Chip key={o.label} label={o.label} on={i === timeIdx} onPress={() => setTimeIdx(i)} />
            ))}
          </View>
        </GoldCard>

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>
            Computer level {level} · {LEVEL_NAMES[level]}
          </Text>
          <View style={{ flexDirection: 'row', gap: 1, marginTop: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Chip key={n} label={String(n)} on={n === level} onPress={() => setLevel(n)} flex />
            ))}
          </View>
          <GoldButton label="Play the Computer" onPress={() => onPlay('computer', level, tc)} />
        </GoldCard>

        <GoldCard>
          <GhostGoldButton label="Pass and Play" onPress={() => onPlay('local', level, tc)} />
          <GhostGoldButton label="Play Online" onPress={onOnline} />
        </GoldCard>
      </ScrollView>
    </SafeAreaView>
  );
}
