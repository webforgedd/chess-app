import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Button from '../components/Button';
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

export default function HomeScreen({ onPlay, onOnline }: { onPlay: (m: Mode, level: number, tc: TimeControl) => void; onOnline: () => void }) {
  const t = useTheme();
  const [level, setLevel] = useState(3);
  const [timeIdx, setTimeIdx] = useState(4); // 10+0
  const tc = TIMES[timeIdx].tc;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', marginTop: 16 }}>Chess</Text>
        <Text style={{ color: t.textMuted, fontSize: 15 }}>Pick how you want to play.</Text>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Time (minutes + increment seconds)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((o, i) => (
              <Pressable
                key={o.label}
                onPress={() => setTimeIdx(i)}
                style={{
                  paddingHorizontal: 14, height: 40, borderRadius: 20, justifyContent: 'center',
                  backgroundColor: i === timeIdx ? t.primary : t.surface2,
                }}
              >
                <Text style={{ color: i === timeIdx ? t.onPrimary : t.text, fontWeight: '600' }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>
            Computer level {level}: {LEVEL_NAMES[level]}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Pressable
                key={n}
                onPress={() => setLevel(n)}
                accessibilityLabel={`Level ${n}`}
                style={{
                  flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: n === level ? t.primary : t.surface2,
                }}
              >
                <Text style={{ color: n === level ? t.onPrimary : t.text, fontWeight: '600' }}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Button primary label="Play the computer" onPress={() => onPlay('computer', level, tc)} />
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 12 }}>
          <Button label="Pass and play" onPress={() => onPlay('local', level, tc)} />
          <Button label="Play online" onPress={onOnline} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
