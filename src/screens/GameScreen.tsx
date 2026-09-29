import React, { useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Board from '../components/Board';
import PlayerBar, { fmt } from '../components/PlayerBar';
import { useGameSkin, SkinButton, SkinPanel } from '../components/GameChrome';
import { Mode, PromoPiece, TimeControl, useChessGame } from '../game/useChessGame';
import { useStockfish, SF_LEVELS } from '../engine/stockfish/useStockfish';
import StockfishWebView from '../engine/stockfish/StockfishWebView';
import VoiceMoveButton from '../voice/VoiceMoveButton';

const GOLD = '#e9c46a';
const GOLD_LIGHT = '#f7e7bd';

const PROMO: { p: PromoPiece; glyph: string; label: string }[] = [
  { p: 'q', glyph: '♛\uFE0E', label: 'Queen' },
  { p: 'r', glyph: '♜\uFE0E', label: 'Rook' },
  { p: 'b', glyph: '♝\uFE0E', label: 'Bishop' },
  { p: 'n', glyph: '♞\uFE0E', label: 'Knight' },
];

// Replaces the old ScreenHeader title for this screen: just a back arrow, with
// the title text shrunk down to near-invisible (gold, fontSize 6) instead of
// being removed outright, so the label still technically exists if ever needed.
function TinyTitleHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
      <Pressable onPress={onBack} style={{ padding: 4 }}>
        <Text style={{ color: GOLD_LIGHT, fontSize: 22 }}>‹</Text>
      </Pressable>
      <Text style={{ color: GOLD, fontSize: 15, marginLeft: 6 }}>{title}</Text>
    </View>
  );
}

export default function GameScreen({
  mode, level, tc, onExit, onReview,
}: { mode: Mode; level: number; tc: TimeControl; onExit: () => void; onReview: (sans: string[]) => void }) {
  const skin = useGameSkin();
  const sf = useStockfish(level);
  const g = useChessGame(mode, 'w', level, tc, mode === 'computer' ? sf : undefined);
  const live = !g.gameOver;
  const clockOn = g.moves.length > 0 && live;
  const label = (s: string) => (g.timed ? s : '∞');
  const [hideResult, setHideResult] = useState(false);
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

  const pairs: { n: number; w: string; b?: string }[] = [];
  for (let i = 0; i < g.moves.length; i += 2) pairs.push({ n: i / 2 + 1, w: g.moves[i], b: g.moves[i + 1] });

  const Body = (
    <>
      <TinyTitleHeader title={mode === 'computer' ? 'Play the Computer' : 'Pass and Play'} onBack={onExit} />
      {mode === 'computer' && <StockfishWebView ref={sf.handle} onLine={sf.onLine} />}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center', flexGrow: 1 }}>
        <PlayerBar
          skin={skin}
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
          skin={skin}
          name={mode === 'computer' ? 'You' : 'White'}
          sub={mode === 'computer' ? 'Playing white' : 'Player 1'}
          time={label(fmt(g.clocks.w))}
          active={clockOn && g.turn === 'w'}
        />

        <SkinPanel skin={skin} style={{ width: '100%' }}>
          <Text style={{ color: skin.text, fontSize: 15, fontWeight: '600' }}>{g.status}</Text>
          <Text style={{ color: skin.textMuted, fontSize: 13 }} numberOfLines={1}>
            {g.notice || g.moves.slice(-6).join('  ') || 'No moves yet'}
          </Text>
        </SkinPanel>

        <View style={{ flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center' }}>
          <SkinButton skin={skin} flex label="Undo" onPress={g.undo} disabled={g.moves.length === 0 || busy || g.timed} />
          <SkinButton skin={skin} flex label="Draw" onPress={onDraw} disabled={g.moves.length === 0 || busy} />
          <SkinButton skin={skin} flex label="Resign" onPress={onResign} disabled={g.moves.length === 0 || busy} />
          <VoiceMoveButton legalMoves={g.legalMoves} onMove={g.playMove} disabled={busy} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <SkinButton skin={skin} flex label="Moves" onPress={() => setShowMoves(true)} />
          <SkinButton skin={skin} flex label="New game" onPress={rematch} />
          <SkinButton skin={skin} flex primary label="Exit" onPress={onExit} />
        </View>
      </ScrollView>

      <Modal visible={!!g.promo} transparent animationType="fade" onRequestClose={g.cancelPromotion}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <SkinPanel skin={skin} style={{ width: '86%', gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: skin.text }}>Promote pawn to</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {PROMO.map((o) => (
                <Pressable
                  key={o.p}
                  onPress={() => g.choosePromotion(o.p)}
                  accessibilityLabel={o.label}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: skin.panelBg2 }}
                >
                  <Text style={{ fontSize: 36, color: skin.text }}>{o.glyph}</Text>
                  <Text style={{ fontSize: 12, color: skin.textMuted }}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ marginTop: 8 }}><SkinButton skin={skin} label="Cancel" onPress={g.cancelPromotion} /></View>
          </SkinPanel>
        </View>
      </Modal>
      <Modal visible={!!g.outcome && !hideResult} transparent animationType="fade" onRequestClose={() => setHideResult(true)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <SkinPanel skin={skin} style={{ width: '86%', gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: skin.text }}>{g.outcome?.title}</Text>
            <Text style={{ fontSize: 15, color: skin.textMuted }}>{g.outcome?.reason}</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              <SkinButton skin={skin} primary label="Rematch" onPress={rematch} />
              <SkinButton skin={skin} label="Review game" onPress={() => onReview(g.moves)} disabled={g.moves.length < 2} />
              <SkinButton skin={skin} label="View board" onPress={() => setHideResult(true)} />
              <SkinButton skin={skin} label="Home" onPress={onExit} />
            </View>
          </SkinPanel>
        </View>
      </Modal>

      <Modal visible={showMoves} transparent animationType="slide" onRequestClose={() => setShowMoves(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <SkinPanel skin={skin} style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '60%', gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: skin.text }}>Moves</Text>
            <ScrollView>
              {pairs.length === 0 && <Text style={{ color: skin.textMuted, fontSize: 15 }}>No moves yet.</Text>}
              {pairs.map((r) => (
                <View key={r.n} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                  <Text style={{ width: 40, color: skin.textMuted, fontSize: 15 }}>{r.n}.</Text>
                  <Text style={{ width: 90, color: skin.text, fontSize: 15, fontWeight: '600' }}>{r.w}</Text>
                  <Text style={{ color: skin.text, fontSize: 15, fontWeight: '600' }}>{r.b ?? ''}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ gap: 10 }}>
              {g.gameOver && g.moves.length >= 2 && (
                <SkinButton skin={skin} primary label="Review game" onPress={() => { setShowMoves(false); onReview(g.moves); }} />
              )}
              <SkinButton skin={skin} label="Close" onPress={() => setShowMoves(false)} />
            </View>
          </SkinPanel>
        </View>
      </Modal>
    </>
  );

  if (skin.Background) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: skin.bg }}>
        <skin.Background>{Body}</skin.Background>
      </SafeAreaView>
    );
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: skin.bg }}>{Body}</SafeAreaView>;
}