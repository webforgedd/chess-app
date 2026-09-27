import React, { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFonts, CinzelDecorative_900Black } from '@expo-google-fonts/cinzel-decorative';
import ScreenHeader from '../components/ScreenHeader';
import { Chess, Square } from 'chess.js';
import Board from '../components/Board';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { Puzzle, PUZZLES } from '../game/puzzles';
import { load, save } from '../storage';
import { supabase, isConfigured } from '../online/supabase';
import { useSession } from '../online/useSession';

const day = () => Math.floor(Date.now() / 86400000);
type Streak = { last: number; count: number };

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';
const GOLD_DIM = 'rgba(210,175,110,0.45)';

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

function GoldButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: GOLD, opacity: pressed ? 0.85 : 1,
    })}>
      <Text style={{ color: '#1a1408', fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

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
      <ScreenHeader title={`${puzzle.kind === 'mate1' ? 'Mate in 1' : 'Mate in 2'} · ${solver === 'w' ? 'White' : 'Black'} to move`} onBack={onBack} />
      <View style={{ padding: 16, gap: 12, alignItems: 'center' }}>
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

// A puzzle's solved day, from either source, as a day-number (see day() above).
function streakFromDays(days: number[]): number {
  const uniq = Array.from(new Set(days)).sort((a, b) => b - a);
  if (!uniq.length) return 0;
  const today = day();
  if (uniq[0] !== today && uniq[0] !== today - 1) return 0; // lapsed: no solve today or yesterday
  let streak = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1] - 1) streak++; else break;
  }
  return streak;
}

export default function PuzzlesScreen() {
  const t = useTheme();
  const [fontsLoaded] = useFonts({ CinzelDecorative_900Black });
  const { userId } = useSession(); // undefined/null while signed out -- puzzles still work as a guest
  const signedIn = isConfigured && !!userId;
  const [solved, setSolved] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);

  // Guest (signed-out) progress: kept exactly as before, on this phone only.
  const [localStreak, setLocalStreak] = useState<Streak>({ last: 0, count: 0 });
  useEffect(() => {
    if (signedIn) return;
    load<string[]>('solved-puzzles', []).then(setSolved);
    load<Streak>('puzzle-streak', { last: 0, count: 0 }).then((s) => {
      setLocalStreak(s);
      setStreakCount(s.last === day() || s.last === day() - 1 ? s.count : 0);
    });
  }, [signedIn]);

  // Signed-in progress: the real source of truth is Supabase, so it survives
  // reinstalling the app or switching phones.
  const loadServer = async () => {
    if (!userId) return;
    const { data } = await supabase.from('puzzle_solves').select('puzzle_id, solved_at').eq('profile_id', userId);
    const rows = data ?? [];
    setSolved(rows.map((r: any) => r.puzzle_id));
    const days = rows.map((r: any) => Math.floor(new Date(r.solved_at).getTime() / 86400000));
    setStreakCount(streakFromDays(days));
  };
  useEffect(() => { if (signedIn) loadServer(); }, [signedIn, userId]);

  const markSolved = async (p: Puzzle) => {
    if (signedIn) {
      if (!solved.includes(p.id)) setSolved([...solved, p.id]); // instant feedback
      const { error } = await supabase.rpc('record_puzzle_solve', { p_puzzle_id: p.id });
      if (!error) loadServer(); // re-derive the real streak from the server's own dates
      return;
    }
    const ids = solved.includes(p.id) ? solved : [...solved, p.id];
    setSolved(ids); save('solved-puzzles', ids);
    const today = day();
    if (localStreak.last !== today) {
      const s = { last: today, count: localStreak.last === today - 1 ? localStreak.count + 1 : 1 };
      setLocalStreak(s); save('puzzle-streak', s); setStreakCount(s.count);
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
  const streakNow = streakCount;
  const groups: { title: string; kind: Puzzle['kind'] }[] = [{ title: 'Mate in 1', kind: 'mate1' }, { title: 'Mate in 2', kind: 'mate2' }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
          <Text style={{
            color: GOLD_LIGHT, fontSize: 34, letterSpacing: 2,
            fontFamily: fontsLoaded ? 'CinzelDecorative_900Black' : undefined,
            fontWeight: fontsLoaded ? undefined : '800',
            textShadowColor: 'rgba(233,196,106,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
          }}>
            PUZZLES
          </Text>
          <View style={{ width: 110, height: 1, backgroundColor: GOLD, opacity: 0.6, marginTop: 8, marginBottom: 10 }} />
          <Text style={{ color: 'rgba(230,222,205,0.75)', fontSize: 12, letterSpacing: 1 }}>SHARPEN YOUR TACTICS</Text>
        </View>

        <GoldCard>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>Daily Puzzle</Text>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>
            {PUZZLES[daily].kind === 'mate1' ? 'Mate in 1' : 'Mate in 2'} · Streak: {streakNow} {streakNow === 1 ? 'day' : 'days'}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>
            {signedIn ? 'Progress saved to your account.' : 'Signed out: progress is only kept on this phone.'}
          </Text>
          <GoldButton label={solved.includes(PUZZLES[daily].id) ? "Solved. Play Again" : "Solve Today's Puzzle"} onPress={() => setCurrent(daily)} />
        </GoldCard>

        {groups.map((g) => {
          const list = PUZZLES.map((p, i) => ({ p, i })).filter((x) => x.p.kind === g.kind);
          const done = list.filter((x) => solved.includes(x.p.id)).length;
          return (
            <GoldCard key={g.kind}>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>{g.title}  ({done}/{list.length} solved)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {list.map((x, n) => {
                  const on = solved.includes(x.p.id);
                  return (
                    <Pressable key={x.p.id} onPress={() => setCurrent(x.i)} style={{
                      width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? GOLD : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: on ? GOLD : GOLD_DIM,
                    }}>
                      <Text style={{ color: on ? '#1a1408' : 'rgba(230,222,205,0.9)', fontWeight: '700', fontSize: 13 }}>
                        {on ? '✓' : n + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GoldCard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
