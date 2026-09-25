import { useCallback, useRef, useState } from 'react';
import { StockfishHandle } from './StockfishWebView';

// Level 1-8 -> (Stockfish "Skill Level" 0-20, thinking time). Low skill makes Stockfish
// play purposeful inaccuracies instead of just searching less, so Beginner is genuinely beatable.
export const SF_LEVELS: Record<number, { skill: number; moveTimeMs: number }> = {
  1: { skill: 0, moveTimeMs: 200 },
  2: { skill: 2, moveTimeMs: 300 },
  3: { skill: 4, moveTimeMs: 450 },
  4: { skill: 7, moveTimeMs: 600 },
  5: { skill: 10, moveTimeMs: 800 },
  6: { skill: 13, moveTimeMs: 1100 },
  7: { skill: 16, moveTimeMs: 1600 },
  8: { skill: 20, moveTimeMs: 2200 },
};

type Pending = { resolve: (uci: string | null) => void; timer: ReturnType<typeof setTimeout> };

export function useStockfish(level: number) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const handle = useRef<StockfishHandle | null>(null);
  const pending = useRef<Pending | null>(null);
  const uciReady = useRef(false);
  const skillSet = useRef<number | null>(null);

  const onLine = useCallback((line: string) => {
    if (line === '__ready__') { handle.current?.send('uci'); return; }
    if (line.startsWith('__error__')) { setFailed(true); return; }
    if (line === 'uciok') { uciReady.current = true; handle.current?.send('isready'); return; }
    if (line === 'readyok') { setReady(true); return; }
    if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1];
      const p = pending.current;
      if (p) { clearTimeout(p.timer); pending.current = null; p.resolve(move && move !== '(none)' ? move : null); }
    }
  }, []);

  // Ask for the best move in a position. Resolves null (caller should use the fallback
  // engine) if Stockfish never loaded, or does not answer within the time budget.
  const requestMove = useCallback((fen: string, lvl: number): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!ready || failed || !handle.current) { resolve(null); return; }
      const cfg = SF_LEVELS[lvl] ?? SF_LEVELS[3];
      if (skillSet.current !== cfg.skill) {
        handle.current.send(`setoption name Skill Level value ${cfg.skill}`);
        skillSet.current = cfg.skill;
      }
      if (pending.current) { clearTimeout(pending.current.timer); pending.current.resolve(null); }
      const timer = setTimeout(() => { pending.current = null; resolve(null); }, cfg.moveTimeMs + 4000);
      pending.current = { resolve, timer };
      handle.current.send(`position fen ${fen}`);
      handle.current.send(`go movetime ${cfg.moveTimeMs}`);
    });
  }, [ready, failed]);

  return { handle, onLine, ready: ready && !failed, failed, requestMove };
}
