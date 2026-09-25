import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Chess, Square } from 'chess.js';
import Board from '../components/Board';
import Button from '../components/Button';
import PlayerBar, { fmt } from '../components/PlayerBar';
import Reactions from '../components/Reactions';
import VoiceMoveButton from '../voice/VoiceMoveButton';
import { radius, useTheme } from '../theme';
import { supabase } from '../online/supabase';
import { Game, MoveRow, Profile } from '../online/types';

const PROMO: { p: 'q' | 'r' | 'b' | 'n'; glyph: string; label: string }[] = [
  { p: 'q', glyph: '♛\uFE0E', label: 'Queen' }, { p: 'r', glyph: '♜\uFE0E', label: 'Rook' },
  { p: 'b', glyph: '♝\uFE0E', label: 'Bishop' }, { p: 'n', glyph: '♞\uFE0E', label: 'Knight' },
];

const REASONS: Record<string, string> = {
  checkmate: 'Checkmate', time: 'Time ran out', resignation: 'Resignation', agreement: 'Draw agreed',
  stalemate: 'Stalemate', 'insufficient material': 'Not enough pieces to checkmate',
  repetition: 'Position repeated three times', 'fifty-move rule': '50 moves without a capture or pawn move', 'game over': 'Game over',
};

export default function OnlineGameScreen({ gameId, me, onExit, onReview }: {
  gameId: string; me: string; onExit: () => void; onReview: (sans: string[]) => void;
}) {
  const t = useTheme();
  const [game, setGame] = useState<Game | null>(null);
  const [sans, setSans] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, Profile>>({});
  const [skew, setSkew] = useState(0); // server time minus phone time
  const [now, setNow] = useState(Date.now());
  const [sel, setSel] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [msg, setMsg] = useState('');
  const [hideResult, setHideResult] = useState(false);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const claimed = useRef(false);

  // Rebuild the position from the move list (keeps castling, repetition etc. correct)
  const chess = useMemo(() => { const c = new Chess(); sans.forEach((s) => c.move(s)); return c; }, [sans]);
  const hist = chess.history({ verbose: true });
  const last = hist.length ? { from: hist[hist.length - 1].from, to: hist[hist.length - 1].to } : null;

  const applyMoves = useCallback((rows: MoveRow[]) => {
    setSans(rows.sort((a, b) => a.ply - b.ply).map((r) => r.san));
  }, []);

  const refresh = useCallback(async () => {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
      supabase.from('moves').select('ply, san').eq('game_id', gameId).order('ply'),
    ]);
    if (g) setGame(g as Game);
    if (m) applyMoves(m as MoveRow[]);
  }, [gameId, applyMoves]);

  // First load, player names, server clock offset
  useEffect(() => {
    refresh();
    supabase.rpc('server_time').then(({ data }: any) => { if (data) setSkew(Date.parse(data) - Date.now()); });
  }, [refresh]);

  useEffect(() => {
    if (!game || Object.keys(names).length) return;
    const ids = [game.white, game.black].filter(Boolean) as string[];
    supabase.from('profiles').select('id, username, rating').in('id', ids).then(({ data }: any) => {
      const map: Record<string, Profile> = {}; (data ?? []).forEach((p: Profile) => (map[p.id] = p)); setNames(map);
    });
  }, [game?.white, game?.black]);

  // Live updates, plus a slow poll as a safety net
  useEffect(() => {
    const ch = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` }, refresh)
      .subscribe();
    const poll = setInterval(refresh, 3000);
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [gameId, refresh]);

  // Clock tick
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(id); }, []);

  // When the player to move has run out of time, ask the server to end the game
  useEffect(() => {
    if (!game || game.status !== 'active' || game.move_count < 1 || !game.last_move_at || claimed.current) return;
    const spent = Math.max(0, now + skew - Date.parse(game.last_move_at));
    if ((game.turn === 'w' ? game.white_ms : game.black_ms) - spent > 0) return;
    claimed.current = true;
    supabase.rpc('claim_timeout', { p_game: gameId }).then(() => { refresh(); setTimeout(() => { claimed.current = false; }, 2000); });
  }, [now, game, skew]);

  if (!game) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: t.text }}>Loading game...</Text></SafeAreaView>;
  }

  const myColor: 'w' | 'b' = game.white === me ? 'w' : 'b';
  const oppId = myColor === 'w' ? game.black : game.white;
  const opp = oppId ? names[oppId] : undefined;
  const mine = names[me];
  const active = game.status === 'active';

  // Clocks: the side to move loses time once White has moved
  const elapsed = active && game.move_count >= 1 && game.last_move_at ? Math.max(0, now + skew - Date.parse(game.last_move_at)) : 0;
  const wLeft = game.white_ms - (game.turn === 'w' ? elapsed : 0);
  const bLeft = game.black_ms - (game.turn === 'b' ? elapsed : 0);
  const commitMove = async (from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n') => {
    const c = new Chess(chess.fen());
    let m;
    try { m = c.move({ from, to, promotion }); } catch { return; }
    let result: string | null = null; let reason: string | null = null;
    if (c.isCheckmate()) { result = myColor; reason = 'checkmate'; }
    else if (c.isStalemate()) { result = 'd'; reason = 'stalemate'; }
    else if (c.isInsufficientMaterial()) { result = 'd'; reason = 'insufficient material'; }
    else if (c.isThreefoldRepetition()) { result = 'd'; reason = 'repetition'; }
    else if (c.isDraw()) { result = 'd'; reason = 'fifty-move rule'; }
    setSans([...sans, m.san]); setSel(null); setTargets([]); setMsg('');
    const { data, error } = await supabase.rpc('make_move', { p_game: gameId, p_san: m.san, p_fen: c.fen(), p_result: result, p_reason: reason });
    if (error) { setMsg(error.message); refresh(); } else setGame(data as Game);
  };

  const press = async (sq: Square) => {
    if (!active || game.turn !== myColor || sans.length !== game.move_count) return;
    if (sel && targets.includes(sq)) {
      const mv = chess.moves({ square: sel, verbose: true }).find((m) => m.to === sq);
      if (mv?.promotion) { setPromo({ from: sel, to: sq }); return; }
      await commitMove(sel, sq, 'q');
      return;
    }
    const p = chess.get(sq);
    if (p && p.color === myColor) { setSel(sq); setTargets(chess.moves({ square: sq, verbose: true }).map((x) => x.to)); }
    else { setSel(null); setTargets([]); }
  };

  const resign = () => Alert.alert('Resign this game?', 'This counts as a loss.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Resign', style: 'destructive', onPress: async () => { const { error } = await supabase.rpc('resign_game', { p_game: gameId }); if (error) setMsg(error.message); refresh(); } },
  ]);
  const offerDraw = async () => { const { error } = await supabase.rpc('offer_draw', { p_game: gameId }); setMsg(error ? error.message : 'Draw offer sent.'); };
  const answer = async (accept: boolean) => { await supabase.rpc('respond_draw', { p_game: gameId, p_accept: accept }); refresh(); };

  const offerFromOpp = game.draw_offer && game.draw_offer !== myColor;
  const over = game.status === 'finished';
  const title = !over ? '' : game.result === 'd' ? 'Draw' : game.result === myColor ? 'You won' : 'You lost';
  const status = over ? `${title}. ${REASONS[game.reason ?? ''] ?? game.reason}` : game.turn === myColor ? 'Your move' : 'Opponent is thinking...';
  const myLeft = myColor === 'w' ? wLeft : bLeft;
  const oppLeft = myColor === 'w' ? bLeft : wLeft;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center', flexGrow: 1 }}>
        <PlayerBar name={opp?.username ?? 'Opponent'} sub={`Rating ${opp?.rating ?? '...'}`} time={fmt(oppLeft)} active={active && game.move_count >= 1 && game.turn !== myColor} />
        <Board board={chess.board()} selected={sel} targets={targets} lastMove={last} flipped={myColor === 'b'} onSquarePress={press} />
        <PlayerBar name={mine?.username ?? 'You'} sub={`Rating ${mine?.rating ?? '...'} · ${myColor === 'w' ? 'White' : 'Black'}`} time={fmt(myLeft)} active={active && game.move_count >= 1 && game.turn === myColor} />

        <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 12, width: '100%', gap: 4 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{status}</Text>
          <Text style={{ color: t.textMuted, fontSize: 13 }} numberOfLines={1}>{msg || sans.slice(-6).join('  ') || 'No moves yet'}</Text>
        </View>

        {active && game.move_count >= 0 && <Reactions gameId={gameId} mySide={myColor} />}

        {active && offerFromOpp && (
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <Button flex primary label="Accept draw" onPress={() => answer(true)} />
            <Button flex label="Decline" onPress={() => answer(false)} />
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center' }}>
          <Button flex label="Draw" onPress={offerDraw} disabled={!active || game.move_count < 2 || game.draw_offer === myColor} />
          <Button flex label="Resign" onPress={resign} disabled={!active || game.move_count < 1} />
          <Button flex primary label={over ? 'Lobby' : 'Leave'} onPress={onExit} />
          {active && game.turn === myColor && (
            <VoiceMoveButton
              legalMoves={chess.moves({ verbose: true })}
              onMove={(from, to, promotion) => commitMove(from, to, promotion || 'q')}
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={!!promo} transparent animationType="fade" onRequestClose={() => setPromo(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 16, width: '86%', gap: 12 }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Promote pawn to</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PROMO.map((o) => (
                <Pressable key={o.p} onPress={() => { const pr = promo!; setPromo(null); commitMove(pr.from, pr.to, o.p); }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: t.surface2 }}>
                  <Text style={{ fontSize: 36, color: t.text }}>{o.glyph}</Text>
                  <Text style={{ fontSize: 12, color: t.textMuted }}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Cancel" onPress={() => setPromo(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={over && !hideResult} transparent animationType="fade" onRequestClose={() => setHideResult(true)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.card, padding: 20, width: '86%', gap: 12 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>{title}</Text>
            <Text style={{ color: t.textMuted, fontSize: 15 }}>{REASONS[game.reason ?? ''] ?? game.reason}</Text>
            <Button primary label="Back to lobby" onPress={onExit} />
            <Button label="Review game" onPress={() => onReview(sans)} disabled={sans.length < 2} />
            <Button label="View board" onPress={() => setHideResult(true)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
