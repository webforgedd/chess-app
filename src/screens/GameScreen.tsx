import React, { useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Board from '../components/Board';
import Button from '../components/Button';
import { radius, useTheme } from '../theme';
import { Mode, PromoPiece, TimeControl, useChessGame } from '../game/useChessGame';
import { useStockfish, SF_LEVELS } from '../engine/stockfish/useStockfish';
import StockfishWebView from '../engine/stockfish/StockfishWebView';
import VoiceMoveButton from '../voice/VoiceMoveButton';

function fmt(ms: number) {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  if (total < 20000) return `0:${String(s).padStart(2, '0')}.${Math.floor((total % 1000) / 100)}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function PlayerBar({ name, sub, time, active }: { name: string; sub: string; time: string; active: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <View>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>{sub}</Text>
      </View>
      {/* Active clock is filled, so you can tell whose turn it is without colour */}
      <View
        style={{
          backgroundColor: active ? t.primary : t.surface, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 6, minWidth: 84, alignItems: 'center',
        }}
      >
        <Text style={{ color: active ? t.onPrimary : t.text, fontSize: 20, fontWeight: '700' }}>{time}</Text>
      </View>
    </View>
  );
}

const PROMO: { p: PromoPiece; glyph: string; label: string }[] = [
  { p: 'q', glyph: '♛\uFE0E', label: 'Queen' },
  { p: 'r', glyph: '♜\uFE0E', label: 'Rook' },
  { p: 'b', glyph: '♝\uFE0E', label: 'Bishop' },
  { p: 'n', glyph: '♞\uFE0E', label: 'Knight' },
];

export default function GameScreen({
  mode, level, tc, onExit, onReview,
}: { mode: Mode; level: number; tc: TimeControl; onExit: () => void; onReview: (sans: string[]) => void }) {
  const t = useTheme();
  const sf = useStockfish(level);
  const g = useChessGame(mode, 'w', level, tc, mode === 'computer' ? sf : undefined);
  const live = !g.gameOver;
  const clockOn = g.moves.length > 0 && live; // clocks run after White's first move
  const label = (s: string) => (g.timed ? s : '∞');
  const [hideResult, setHideResult] = useState(false); // "View board" hides the result card
  const [showMoves, setShowMoves] = useState(false);
  const busy = g.gameOver || g.thinking;

  const onResign = () => {
    const side = mode === 'computer' ? 'w' : g.turn;
    const name = mode === 'computer' ? 'this game' : side === 'w' ? 'White' : 'Black';
    Alert.alert(mode === 'computer' ? 'Resign this game?' : `Resign as ${name}?`, 'This ends the game and counts as a loss.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resign', style: 'destructive', onPress: () => { setHideResult(false); g.resign(side); } },
    ]);
  };

  const onDraw = () => {
    const r = g.offerDraw();
    if (r === null) {
      const offerer = g.turn === 'w' ? 'White' : 'Black';
      const other = g.turn === 'w' ? 'Black' : 'White';
      Alert.alert(`${offerer} offers a draw`, `${other}, do you accept?`, [
        { text: 'Decline', style: 'cancel' },
        { text: 'Accept', onPress: () => { setHideResult(false); g.acceptDraw(); } },
      ]);
    } else if (r) setHideResult(false);
  };

  const rematch = () => { setHideResult(false); g.reset(); };

  // Move pairs for the list: "1. e4 e5"
  const pairs: { n: number; w: string; b?: string }[] = [];
  for (let i = 0; i < g.moves.length; i += 2) pairs.push({ n: i / 2 + 1, w: g.moves[i], b: g.moves[i + 1] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {mode === 'computer' && <StockfishWebView ref={sf.handle} onLine={sf.onLine} />}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center', flexGrow: 1 }}>
        <PlayerBar
          name={mode === 'computer' ? 'Computer' : 'Black'}
          sub={mode === 'computer' ? `Level ${level}${sf.ready ? '' : sf.failed ? ' (basic)' : ' (loading)'}` : 'Player 2'}
          time={label(fmt(g.clocks.b))}
          active={clockOn && g.turn === 'b'}
        />

        <Board
          board={g.board}
          selected={g.selected}
          targets={g.targets}
          lastMove={g.lastMove}
          onSquarePress={g.onSquarePress}
        />

        <PlayerBar
          name={mode === 'computer' ? 'You' : 'White'}
          sub={mode === 'computer' ? 'Playing white' : 'Player 1'}
          time={label(fmt(g.clocks.w))}
          active={clockOn && g.turn === 'w'}
        />

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 12, width: '100%' }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{g.status}</Text>
          <Text style={{ color: t.textMuted, fontSize: 13 }} numberOfLines={1}>
            {g.notice || g.moves.slice(-6).join('  ') || 'No moves yet'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center' }}>
          <Button flex label="Undo" onPress={g.undo} disabled={g.moves.length === 0 || busy || g.timed} />
          <Button flex label="Draw" onPress={onDraw} disabled={g.moves.length === 0 || busy} />
          <Button flex label="Resign" onPress={onResign} disabled={g.moves.length === 0 || busy} />
          <VoiceMoveButton legalMoves={g.legalMoves} onMove={g.playMove} disabled={busy} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Button flex label="Moves" onPress={() => setShowMoves(true)} />
          <Button flex label="New game" onPress={rematch} />
          <Button flex primary label="Exit" onPress={onExit} />
        </View>
      </ScrollView>

      {/* Promotion picker */}
      <Modal visible={!!g.promo} transparent animationType="fade" onRequestClose={g.cancelPromotion}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, width: '86%', gap: 12 }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Promote pawn to</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PROMO.map((o) => (
                <Pressable
                  key={o.p}
                  onPress={() => g.choosePromotion(o.p)}
                  accessibilityLabel={o.label}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: t.surface2 }}
                >
                  <Text style={{ fontSize: 36, color: t.text }}>{o.glyph}</Text>
                  <Text style={{ fontSize: 12, color: t.textMuted }}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Cancel" onPress={g.cancelPromotion} />
          </View>
        </View>
      </Modal>
      {/* Result card */}
      <Modal visible={!!g.outcome && !hideResult} transparent animationType="fade" onRequestClose={() => setHideResult(true)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 20, width: '86%', gap: 12 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>{g.outcome?.title}</Text>
            <Text style={{ color: t.textMuted, fontSize: 15 }}>{g.outcome?.reason}</Text>
            <Button primary label="Rematch" onPress={rematch} />
            <Button label="Review game" onPress={() => onReview(g.moves)} disabled={g.moves.length < 2} />
            <Button label="View board" onPress={() => setHideResult(true)} />
            <Button label="Home" onPress={onExit} />
          </View>
        </View>
      </Modal>

      {/* Move list */}
      <Modal visible={showMoves} transparent animationType="slide" onRequestClose={() => setShowMoves(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '60%', gap: 12 }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Moves</Text>
            <ScrollView>
              {pairs.length === 0 && <Text style={{ color: t.textMuted, fontSize: 15 }}>No moves yet.</Text>}
              {pairs.map((r) => (
                <View key={r.n} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                  <Text style={{ width: 40, color: t.textMuted, fontSize: 15 }}>{r.n}.</Text>
                  <Text style={{ width: 90, color: t.text, fontSize: 15, fontWeight: '600' }}>{r.w}</Text>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{r.b ?? ''}</Text>
                </View>
              ))}
            </ScrollView>
            {g.gameOver && g.moves.length >= 2 && (
              <Button primary label="Review game" onPress={() => { setShowMoves(false); onReview(g.moves); }} />
            )}
            <Button label="Close" onPress={() => setShowMoves(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
