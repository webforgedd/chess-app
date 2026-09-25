import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Chess, Square } from 'chess.js';
import Board from '../components/Board';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { analyseGame, Label, MoveReview } from '../game/engine';
import { explainMove } from '../game/coach';

const MARK: Record<Label, string> = { best: '✓', good: '✓', inaccuracy: '?!', mistake: '?', blunder: '??' };
const NAME: Record<Label, string> = { best: 'Best move', good: 'Good move', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' };

export default function ReviewScreen({ sans, onClose }: { sans: string[]; onClose: () => void }) {
  const t = useTheme();
  const [reviews, setReviews] = useState<MoveReview[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [ply, setPly] = useState(0); // 0 = start position, n = after move n

  useEffect(() => {
    let alive = true;
    analyseGame(sans, (d, n) => alive && setProgress(d / n)).then((r) => alive && setReviews(r));
    return () => { alive = false; };
  }, [sans]);

  const positions = useMemo(() => {
    const g = new Chess();
    const boards = [g.board()];
    const last: ({ from: Square; to: Square } | null)[] = [null];
    const beforeFen: string[] = [];
    for (const san of sans) {
      beforeFen.push(g.fen());
      const m = g.move(san);
      boards.push(g.board());
      last.push({ from: m.from, to: m.to });
    }
    return { boards, last, beforeFen };
  }, [sans]);

  const cur = ply > 0 && reviews ? reviews[ply - 1] : null;
  const coachText = useMemo(() => {
    if (!cur || cur.label === 'best' || cur.label === 'good') return null;
    try { return explainMove(positions.beforeFen[ply - 1], cur.san, cur.best).text; } catch { return null; }
  }, [cur, ply]);
  const count = (color: 'w' | 'b', label: Label) => reviews?.filter((r) => r.color === color && r.label === label).length ?? 0;
  const summary = (color: 'w' | 'b') =>
    `${count(color, 'blunder')} blunders · ${count(color, 'mistake')} mistakes · ${count(color, 'inaccuracy')} inaccuracies`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>Game review</Text>
          <View style={{ width: 90 }}><Button label="Close" onPress={onClose} /></View>
        </View>

        <Board board={positions.boards[ply]} lastMove={positions.last[ply]} />

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 12, width: '100%', gap: 4 }}>
          {!reviews ? (
            <>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Analysing your moves...</Text>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.round(progress * 100)}%`, backgroundColor: t.primary }} />
              </View>
            </>
          ) : cur ? (
            <>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>
                {Math.ceil(ply / 2)}{cur.color === 'w' ? '.' : '...'} {cur.san}  {MARK[cur.label]} {NAME[cur.label]}
              </Text>
              {coachText && (
                <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                  Coach
                </Text>
              )}
              <Text style={{ color: t.textMuted, fontSize: 14 }}>
                {cur.label === 'best' || cur.label === 'good'
                  ? cur.label === 'best' ? 'This was the strongest move found.' : `A solid move. ${cur.best} was slightly stronger.`
                  : coachText ?? `This cost about ${(cur.loss / 100).toFixed(1)} pawns. Better was ${cur.best}.`}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Summary</Text>
              <Text style={{ color: t.textMuted, fontSize: 14 }}>White: {summary('w')}</Text>
              <Text style={{ color: t.textMuted, fontSize: 14 }}>Black: {summary('b')}</Text>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>Quick check of a few moves ahead, so deep tactics can be missed.</Text>
            </>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
          <Button flex label="Start" onPress={() => setPly(0)} disabled={ply === 0} />
          <Button flex label="Back" onPress={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0} />
          <Button flex primary label="Next" onPress={() => setPly((p) => Math.min(sans.length, p + 1))} disabled={ply === sans.length} />
          <Button flex label="End" onPress={() => setPly(sans.length)} disabled={ply === sans.length} />
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 8, width: '100%' }}>
          {sans.map((san, i) => {
            const r = reviews?.[i];
            return (
              <Pressable key={i} onPress={() => setPly(i + 1)}
                style={{ flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: ply === i + 1 ? t.surface2 : 'transparent' }}>
                <Text style={{ width: 56, color: t.textMuted, fontSize: 14 }}>{Math.floor(i / 2) + 1}{i % 2 ? '...' : '.'}</Text>
                <Text style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: '600' }}>{san}</Text>
                <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>{r && r.label !== 'best' && r.label !== 'good' ? MARK[r.label] : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
