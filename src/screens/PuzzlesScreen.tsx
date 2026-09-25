import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Chess, Square } from 'chess.js';
import Board from '../components/Board';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { Puzzle, PUZZLES } from '../game/puzzles';
import { load, save } from '../storage';

const day = () => Math.floor(Date.now() / 86400000);
type Streak = { last: number; count: number };

function PuzzlePlay({ puzzle, onDone, onNext, onBack }: {
  puzzle: Puzzle; onDone: () => void; onNext: () => void; onBack: () => void;
}) {
  const t = useTheme();
  const game = useRef(new Chess(puzzle.fen)).current;
  const solver = useRef(game.turn()).current;
  const [fen, setFen] = useState(game.fen());
  const [sel, setSel] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null);
  const [hint, setHint] = useState<Square | null>(null);
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [msg, setMsg] = useState(puzzle.kind === 'mate1' ? 'Find checkmate in 1.' : 'Find checkmate in 2.');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const reset = (text: string) => { setSel(null); setTargets([]); setFen(game.fen()); setMsg(text); };

  const press = (sq: Square) => {
    if (solved || game.turn() !== solver) return;
    if (sel && targets.includes(sq)) {
      const m = game.move({ from: sel, to: sq, promotion: 'q' });
      setHint(null);
      const mate = game.isCheckmate();
      if (puzzle.kind === 'mate1' || step === 1) {
        if (mate) { setSolved(true); setLast({ from: m.from, to: m.to }); reset('Checkmate. Puzzle solved.'); onDone(); }
        else { game.undo(); reset('That is not checkmate. Try again.'); }
        return;
      }
      // mate in 2, first move
      if (!puzzle.moves.includes(m.san)) { game.undo(); reset('That does not force mate in 2. Try again.'); return; }
      setLast({ from: m.from, to: m.to });
      reset('Good move. Waiting for the reply...');
      timer.current = setTimeout(() => {
        const replies = game.moves({ verbose: true });
        const r = game.move(replies[0].san);
        setLast({ from: r.from, to: r.to });
        setStep(1);
        reset('Now deliver checkmate.');
      }, 600);
      return;
    }
    const p = game.get(sq);
    if (p && p.color === solver) { setSel(sq); setTargets(game.moves({ square: sq, verbose: true }).map((m) => m.to)); }
    else { setSel(null); setTargets([]); }
  };

  const showHint = () => {
    const wanted = step === 0 && puzzle.kind === 'mate2' ? puzzle.moves : null;
    const all = game.moves({ verbose: true });
    const m = wanted ? all.find((x) => wanted.includes(x.san)) : all.find((x) => { game.move(x.san); const c = game.isCheckmate(); game.undo(); return c; });
    if (m) { setHint(m.from); setMsg('Hint: look at the highlighted piece.'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16, gap: 12, alignItems: 'center' }}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '700', alignSelf: 'flex-start' }}>
          {puzzle.kind === 'mate1' ? 'Mate in 1' : 'Mate in 2'} · {solver === 'w' ? 'White' : 'Black'} to move
        </Text>
        <Board board={game.board()} selected={sel} targets={targets} lastMove={last} hintSquare={hint} onSquarePress={press} />
        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 12, width: '100%' }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{msg}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Button flex label="Hint" onPress={showHint} disabled={solved} />
          <Button flex label="Back" onPress={onBack} />
          <Button flex primary label="Next puzzle" onPress={onNext} disabled={!solved} />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function PuzzlesScreen() {
  const t = useTheme();
  const [solved, setSolved] = useState<string[]>([]);
  const [streak, setStreak] = useState<Streak>({ last: 0, count: 0 });
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    load<string[]>('solved-puzzles', []).then(setSolved);
    load<Streak>('puzzle-streak', { last: 0, count: 0 }).then(setStreak);
  }, []);

  const markSolved = (p: Puzzle) => {
    const ids = solved.includes(p.id) ? solved : [...solved, p.id];
    setSolved(ids); save('solved-puzzles', ids);
    const today = day();
    if (streak.last !== today) {
      const s = { last: today, count: streak.last === today - 1 ? streak.count + 1 : 1 };
      setStreak(s); save('puzzle-streak', s);
    }
  };

  if (current !== null) {
    const p = PUZZLES[current];
    return (
      <PuzzlePlay key={p.id} puzzle={p} onDone={() => markSolved(p)}
        onNext={() => setCurrent((current + 1) % PUZZLES.length)} onBack={() => setCurrent(null)} />
    );
  }

  const daily = day() % PUZZLES.length;
  const streakNow = streak.last === day() || streak.last === day() - 1 ? streak.count : 0;
  const groups: { title: string; kind: Puzzle['kind'] }[] = [{ title: 'Mate in 1', kind: 'mate1' }, { title: 'Mate in 2', kind: 'mate2' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: '700', marginTop: 16 }}>Puzzles</Text>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 8 }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Daily puzzle</Text>
          <Text style={{ color: t.textMuted, fontSize: 14 }}>
            {PUZZLES[daily].kind === 'mate1' ? 'Mate in 1' : 'Mate in 2'} · Streak: {streakNow} {streakNow === 1 ? 'day' : 'days'}
          </Text>
          <Button primary label={solved.includes(PUZZLES[daily].id) ? 'Solved. Play again' : 'Solve'} onPress={() => setCurrent(daily)} />
        </View>

        {groups.map((g) => {
          const list = PUZZLES.map((p, i) => ({ p, i })).filter((x) => x.p.kind === g.kind);
          const done = list.filter((x) => solved.includes(x.p.id)).length;
          return (
            <View key={g.kind} style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, gap: 10 }}>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{g.title}  ({done}/{list.length} solved)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {list.map((x, n) => (
                  <View key={x.p.id} style={{ width: 56 }}>
                    <Button label={`${solved.includes(x.p.id) ? '✓ ' : ''}${n + 1}`} onPress={() => setCurrent(x.i)} />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
