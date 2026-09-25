import { Chess, Move } from 'chess.js';

// Simple chess engine: material + centre/advance bonuses, alpha-beta search,
// iterative deepening with a time limit. Runs on the JS thread, no native code.

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

export type LevelConfig = { depth: number; timeMs: number; noise: number; randomChance: number };

// Level 1 = beginner ... 8 = strongest this engine can do
export const LEVELS: Record<number, LevelConfig> = {
  1: { depth: 1, timeMs: 300, noise: 150, randomChance: 0.5 },
  2: { depth: 1, timeMs: 300, noise: 80, randomChance: 0.25 },
  3: { depth: 2, timeMs: 800, noise: 50, randomChance: 0.1 },
  4: { depth: 2, timeMs: 800, noise: 20, randomChance: 0 },
  5: { depth: 3, timeMs: 1500, noise: 15, randomChance: 0 },
  6: { depth: 3, timeMs: 1500, noise: 0, randomChance: 0 },
  7: { depth: 4, timeMs: 2500, noise: 0, randomChance: 0 },
  8: { depth: 5, timeMs: 3500, noise: 0, randomChance: 0 },
};

function centre(row: number, col: number) {
  return Math.max(0, 12 - 3 * (Math.abs(row - 3.5) + Math.abs(col - 3.5)) * 0.5 * 2 / 2);
}

// Score from the side-to-move's point of view
function evaluate(game: Chess): number {
  const board = game.board();
  let score = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const p = board[i][j];
      if (!p) continue;
      let v = VALUE[p.type];
      if (p.type === 'n' || p.type === 'b') v += centre(i, j);
      else if (p.type === 'p') {
        const advance = p.color === 'w' ? 6 - i : i - 1;
        v += advance * 6 + centre(i, j) / 2;
      }
      score += p.color === 'w' ? v : -v;
    }
  }
  return game.turn() === 'w' ? score : -score;
}

function orderMoves(moves: Move[]) {
  const score = (m: Move) =>
    (m.captured ? 10 * VALUE[m.captured] - VALUE[m.piece] : 0) + (m.promotion ? 800 : 0);
  return moves.sort((a, b) => score(b) - score(a));
}

type Ctx = { deadline: number; nodes: number; timeUp: boolean; quiet?: boolean };

function quiesce(game: Chess, alpha: number, beta: number, ctx: Ctx, left: number): number {
  const stand = evaluate(game);
  if (left === 0 || stand >= beta) return stand >= beta ? beta : stand;
  if (stand > alpha) alpha = stand;
  const caps = orderMoves(game.moves({ verbose: true }).filter((m) => m.captured));
  for (const m of caps) {
    game.move(m.san);
    const s = -quiesce(game, -beta, -alpha, ctx, left - 1);
    game.undo();
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

function search(game: Chess, depth: number, alpha: number, beta: number, ply: number, ctx: Ctx): number {
  if (++ctx.nodes % 128 === 0 && Date.now() > ctx.deadline) ctx.timeUp = true;
  if (ctx.timeUp) return 0;

  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return game.inCheck() ? -MATE + ply : 0;
  if (depth === 0) return ctx.quiet ? quiesce(game, alpha, beta, ctx, 3) : evaluate(game);

  for (const m of orderMoves(moves)) {
    game.move(m.san);
    const s = -search(game, depth - 1, -beta, -alpha, ply + 1, ctx);
    game.undo();
    if (ctx.timeUp) return 0;
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

export function chooseMove(game: Chess, level: number): Move | null {
  const cfg = LEVELS[level] ?? LEVELS[1];
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  if (Math.random() < cfg.randomChance) return moves[Math.floor(Math.random() * moves.length)];

  const ctx: Ctx = { deadline: Date.now() + cfg.timeMs, nodes: 0, timeUp: false };
  const ordered = orderMoves(moves);
  let best: Move = ordered[0];

  for (let d = 1; d <= cfg.depth; d++) {
    let bestScore = -Infinity;
    let bestThisDepth: Move | null = null;
    for (const m of ordered) {
      game.move(m.san);
      const s = -search(game, d - 1, -Infinity, Infinity, 1, ctx) + Math.random() * cfg.noise;
      game.undo();
      if (ctx.timeUp) break;
      if (s > bestScore) { bestScore = s; bestThisDepth = m; }
    }
    if (ctx.timeUp) break;       // keep the last fully searched depth
    if (bestThisDepth) {
      best = bestThisDepth;
      ordered.splice(ordered.indexOf(best), 1);
      ordered.unshift(best);     // search best move first next depth
    }
    if (Math.abs(bestScore) > MATE / 2) break; // forced mate found
  }
  return best;
}

// Computer accepts a draw when it is not clearly better (score in centipawns, its own point of view)
export function computerAcceptsDraw(game: Chess, computerSide: 'w' | 'b'): boolean {
  const e = evaluate(game); // from the side to move
  const score = game.turn() === computerSide ? e : -e;
  return score <= 30;
}

// ---------- Game review ----------
export type Label = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
export type MoveReview = { san: string; color: 'w' | 'b'; loss: number; best: string; label: Label };

const clamp = (n: number) => Math.max(-1000, Math.min(1000, n));

// Score the played move exactly, then look for anything better with a narrow window (much faster).
function scoreMoves(game: Chess, played: string, depth: number) {
  const ctx: Ctx = { deadline: Date.now() + 800, nodes: 0, timeUp: false, quiet: true };
  const moves = orderMoves(game.moves({ verbose: true }));
  const i = moves.findIndex((m) => m.san === played);
  if (i > 0) moves.unshift(...moves.splice(i, 1));

  game.move(moves[0].san);
  let playedScore = clamp(-search(game, depth - 1, -Infinity, Infinity, 1, ctx));
  game.undo();
  let best = { san: moves[0].san, score: playedScore };

  for (const m of moves.slice(1)) {
    if (ctx.timeUp) break;
    game.move(m.san);
    const sc = clamp(-search(game, depth - 1, -Infinity, -best.score, 1, ctx));
    game.undo();
    if (!ctx.timeUp && sc > best.score) best = { san: m.san, score: sc };
  }
  if (ctx.timeUp && i !== 0) playedScore = best.score; // ran out of time: do not blame the player
  return { best, playedScore };
}

export async function analyseGame(
  sans: string[],
  onProgress?: (done: number, total: number) => void,
  depth = 2
): Promise<MoveReview[]> {
  const g = new Chess();
  const reviews: MoveReview[] = [];
  for (let i = 0; i < sans.length; i++) {
    const color = g.turn();
    const played = sans[i];
    if (i < 4) { // opening moves are not judged
      reviews.push({ san: played, color, loss: 0, best: played, label: 'good' });
      g.move(played);
      onProgress?.(i + 1, sans.length);
      continue;
    }
    const { best, playedScore } = scoreMoves(g, played, depth);
    const loss = Math.max(0, best.score - playedScore);
    const only = g.moves().length === 1;
    const label: Label = only || loss <= 5 ? 'best' : loss < 150 ? 'good' : loss < 250 ? 'inaccuracy' : loss < 400 ? 'mistake' : 'blunder';
    reviews.push({ san: played, color, loss, best: best.san, label });
    g.move(played);
    onProgress?.(i + 1, sans.length);
    await new Promise<void>((r) => setTimeout(() => r(), 0)); // let the screen update between moves
  }
  return reviews;
}
