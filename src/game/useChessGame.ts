import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, Move, Square } from 'chess.js';
import { chooseMove, computerAcceptsDraw } from './engine';

export type Mode = 'computer' | 'local';
export type Side = 'w' | 'b';
export type TimeControl = { minutes: number; increment: number } | null; // null = untimed
export type PromoPiece = 'q' | 'r' | 'b' | 'n';

export type StockfishAccess = { ready: boolean; requestMove: (fen: string, level: number) => Promise<string | null> };

export function useChessGame(mode: Mode, playerSide: Side = 'w', level = 3, tc: TimeControl = null, stockfish?: StockfishAccess) {
  const game = useRef(new Chess()).current;
  const [fen, setFen] = useState(game.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [thinking, setThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [result, setResult] = useState<{ kind: 'resign' | 'draw'; winner?: Side } | null>(null);
  const [notice, setNotice] = useState('');

  // Clocks: kept in a ref (exact) and mirrored to state (for display)
  const initial = () => ({ w: (tc?.minutes ?? 0) * 60000, b: (tc?.minutes ?? 0) * 60000 });
  const remaining = useRef(initial());
  const lastTs = useRef(Date.now());
  const [clocks, setClocks] = useState(remaining.current);
  const [flagged, setFlagged] = useState<Side | null>(null);

  const refresh = (m?: Move) => {
    setFen(game.fen());
    if (m) setLastMove({ from: m.from, to: m.to });
    setSelected(null);
    setTargets([]);
  };

  const makeMove = (m: Move) => {
    setNotice('');
    // increment goes to the side that just moved (not for the very first move)
    if (tc && game.history().length > 1) {
      remaining.current[m.color] += tc.increment * 1000;
      setClocks({ ...remaining.current });
    }
    refresh(m);
  };

  const canMove = useCallback(
    () => !game.isGameOver() && !flagged && !result && !promo && (mode === 'local' || game.turn() === playerSide),
    [mode, playerSide, game, flagged, promo, result]
  );

  const onSquarePress = (sq: Square) => {
    if (!canMove()) return;
    if (selected && targets.includes(sq)) {
      const mv = game.moves({ square: selected, verbose: true }).find((m) => m.to === sq);
      if (mv?.promotion) { setPromo({ from: selected, to: sq }); return; } // ask which piece
      makeMove(game.move({ from: selected, to: sq }));
      return;
    }
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) {
      setSelected(sq);
      setTargets(game.moves({ square: sq, verbose: true }).map((m) => m.to));
    } else {
      setSelected(null);
      setTargets([]);
    }
  };

  // Used by voice input: play an already-fully-specified move in one call, instead of
  // the two taps (select, then target) the board UI normally needs.
  const playMove = (from: Square, to: Square, promotion?: PromoPiece) => {
    if (!canMove()) return false;
    const mv = game.moves({ square: from, verbose: true }).find((m) => m.to === to);
    if (!mv) return false;
    if (mv.promotion && !promotion) { setPromo({ from, to }); return true; }
    makeMove(game.move({ from, to, promotion: promotion || 'q' }));
    return true;
  };

  const choosePromotion = (p: PromoPiece) => {
    if (!promo) return;
    const { from, to } = promo;
    setPromo(null);
    makeMove(game.move({ from, to, promotion: p }));
  };
  const cancelPromotion = () => setPromo(null);

  // Clock: ticks for the side to move once White has made the first move
  useEffect(() => {
    if (!tc || game.history().length < 1 || game.isGameOver() || flagged || result) return;
    lastTs.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const side = game.turn();
      remaining.current[side] -= now - lastTs.current;
      lastTs.current = now;
      if (remaining.current[side] <= 0) {
        remaining.current[side] = 0;
        setFlagged(side);
      }
      setClocks({ ...remaining.current });
    }, 100);
    return () => clearInterval(id);
  }, [fen, flagged, result]);

  // Computer opponent: Stockfish when it is loaded and ready, otherwise the built-in
  // engine (offline, weaker). Whichever answers is used; the player never sees which one moved.
  useEffect(() => {
    if (mode !== 'computer' || game.isGameOver() || flagged || result || game.turn() === playerSide) return;
    setThinking(true);
    let cancelled = false;
    const positionFen = game.fen();
    (async () => {
      let uci: string | null = null;
      if (stockfish?.ready) {
        try { uci = await stockfish.requestMove(positionFen, level); } catch { uci = null; }
      }
      if (cancelled || game.fen() !== positionFen) return; // position changed (e.g. undo) while waiting
      let applied: Move | null = null;
      if (uci && uci.length >= 4) {
        try {
          applied = game.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: (uci[4] as any) || 'q' });
        } catch { applied = null; }
      }
      if (!applied) {
        const choice = chooseMove(game, level);
        if (choice) applied = game.move(choice.san);
      }
      setThinking(false);
      if (applied) makeMove(applied);
    })();
    return () => { cancelled = true; setThinking(false); };
  }, [fen, flagged, result]);

  const undo = () => {
    if (thinking || tc) return; // undo only in untimed games
    if (mode === 'computer') game.undo(); // undo computer's move
    game.undo();                          // undo yours
    const h = game.history({ verbose: true });
    setLastMove(h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null);
    refresh();
  };

  const resign = (side: Side) => setResult({ kind: 'resign', winner: side === 'w' ? 'b' : 'w' });

  // Returns true/false when the computer answers, or null when a human must answer (pass and play)
  const offerDraw = (): boolean | null => {
    if (mode !== 'computer') return null;
    const ok = computerAcceptsDraw(game, playerSide === 'w' ? 'b' : 'w');
    if (ok) setResult({ kind: 'draw' });
    else setNotice('Computer declined the draw offer');
    return ok;
  };
  const acceptDraw = () => setResult({ kind: 'draw' });

  const reset = () => {
    setResult(null);
    setNotice('');
    game.reset();
    remaining.current = initial();
    setClocks(remaining.current);
    setFlagged(null);
    setPromo(null);
    setLastMove(null);
    refresh();
  };

  const over = game.isGameOver() || !!flagged || !!result;
  let outcome: { title: string; reason: string } | null = null;
  if (over) {
    let winner: Side | 'draw';
    let reason: string;
    if (result?.kind === 'resign') { winner = result.winner!; reason = 'Resignation'; }
    else if (result?.kind === 'draw') { winner = 'draw'; reason = 'Draw agreed'; }
    else if (flagged) { winner = flagged === 'w' ? 'b' : 'w'; reason = 'Time ran out'; }
    else if (game.isCheckmate()) { winner = game.turn() === 'w' ? 'b' : 'w'; reason = 'Checkmate'; }
    else {
      winner = 'draw';
      reason = game.isStalemate() ? 'Stalemate'
        : game.isInsufficientMaterial() ? 'Not enough pieces to checkmate'
        : game.isThreefoldRepetition() ? 'Position repeated three times'
        : '50 moves without a capture or pawn move';
    }
    const title = winner === 'draw' ? 'Draw'
      : mode === 'computer' ? (winner === playerSide ? 'You won' : 'You lost')
      : `${winner === 'w' ? 'White' : 'Black'} wins`;
    outcome = { title, reason };
  }

  let status = game.turn() === 'w' ? 'White to move' : 'Black to move';
  if (thinking) status = 'Computer is thinking...';
  if (outcome) status = `${outcome.title}. ${outcome.reason}`;
  else if (game.inCheck()) status = `Check. ${status}`;

  return {
    board: game.board(), selected, targets, lastMove, status, thinking,
    legalMoves: canMove() ? game.moves({ verbose: true }) : [],
    inCheck: game.inCheck(), turn: game.turn(),
    gameOver: over, outcome, notice, moves: game.history(),
    timed: !!tc, clocks, flagged,
    promo, choosePromotion, cancelPromotion,
    onSquarePress, playMove, undo, reset, resign, offerDraw, acceptDraw,
  };
}
