import { Chess, Square } from 'chess.js';

// Rule-based coaching notes: plain-language reasons for a move, found by looking at
// the actual position (hanging pieces, missed or allowed checkmates) rather than
// just reporting a numeric score. Runs on-device, no network needed.

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function mateIn1(game: Chess): string | null {
  for (const m of game.moves({ verbose: true })) {
    game.move(m.san);
    const mate = game.isCheckmate();
    game.undo();
    if (mate) return m.san;
  }
  return null;
}

// The single reply that wins the most material for free (target square left undefended).
function biggestHangingCapture(game: Chess): { san: string; piece: string; square: Square } | null {
  let best: { san: string; piece: string; square: Square; value: number } | null = null;
  for (const m of game.moves({ verbose: true })) {
    if (!m.captured) continue;
    game.move(m.san);
    const canRecapture = game.moves({ verbose: true }).some((r) => r.to === m.to);
    game.undo();
    if (canRecapture) continue; // defended: not a free piece
    const value = VALUE[m.captured];
    if (value >= 3 && (!best || value > best.value)) best = { san: m.san, piece: m.captured, square: m.to, value };
  }
  return best;
}

export type CoachNote = { text: string };

// beforeFen: position before the move was played. playedSan/bestSan: what was played
// vs what the engine preferred there. Only meaningful to call for inaccuracy/mistake/blunder.
export function explainMove(beforeFen: string, playedSan: string, bestSan: string): CoachNote {
  const before = new Chess(beforeFen);

  // 1) Did this move hand the opponent an immediate checkmate that wasn't already unavoidable?
  const after = new Chess(beforeFen);
  after.move(playedSan);
  const oppMate = mateIn1(after);
  if (oppMate) {
    return { text: `This allows an immediate checkmate: ${oppMate} finishes the game next move.` };
  }

  // 2) Was there a forced checkmate available that got missed?
  const tryBest = new Chess(beforeFen);
  let bestIsMate = false;
  try { tryBest.move(bestSan); bestIsMate = tryBest.isCheckmate(); } catch { /* ignore */ }
  if (bestIsMate) {
    return { text: `There was a forced checkmate here: ${bestSan} would have won on the spot.` };
  }

  // 3) Did this move leave a piece hanging for the opponent to just take?
  const hang = biggestHangingCapture(after);
  if (hang) {
    return { text: `This leaves the ${PIECE_NAME[hang.piece]} on ${hang.square} undefended — ${hang.san} wins it for free.` };
  }

  // 4) Nothing pattern-specific found; a quieter positional slip.
  return { text: `${bestSan} kept more control of the position; this move gives some of that back without an immediate tactic.` };
}
