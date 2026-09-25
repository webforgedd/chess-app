import { Move } from 'chess.js';

// Turns what the phone heard ("knight to f three", "queen takes d5", "castle kingside")
// into one of the game's actual legal moves. Speech recognisers often mishear single
// letters, so file letters are matched phonetically as well as literally.
export type ParseResult =
  | { kind: 'match'; move: Move }
  | { kind: 'ambiguous'; candidates: Move[] }
  | { kind: 'no-match' };

const PIECE_WORDS: Record<string, string> = {
  pawn: 'p', knight: 'n', night: 'n', bishop: 'b', rook: 'r', castle: 'r', queen: 'q', king: 'k',
};

// Common ways a speech recognizer transcribes a single spoken file letter.
const FILE_WORDS: Record<string, string> = {
  a: 'a', ay: 'a', eh: 'a',
  b: 'b', be: 'b', bee: 'b',
  c: 'c', see: 'c', sea: 'c',
  d: 'd', dee: 'd',
  e: 'e', ee: 'e',
  f: 'f', ef: 'f', eff: 'f',
  g: 'g', gee: 'g', jee: 'g',
  h: 'h', aitch: 'h', eich: 'h',
};

const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', to: '2', too: '2', three: '3', four: '4', for: '4',
  five: '5', six: '6', seven: '7', eight: '8', ate: '8',
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

// Pulls the first recognizable file+rank pair (e.g. "e", "4" -> "e4") out of a word list,
// starting at `from`. Returns the square and the index just past it, or null.
function readSquare(ws: string[], from: number): { square: string; next: number } | null {
  for (let i = from; i < ws.length; i++) {
    const combined = ws[i].match(/^([a-h])([1-8])$/); // e.g. recognizer returned "e4" as one token
    if (combined) return { square: combined[1] + combined[2], next: i + 1 };
    const file = FILE_WORDS[ws[i]] ?? (ws[i].length === 1 && 'abcdefgh'.includes(ws[i]) ? ws[i] : null);
    if (!file || i + 1 >= ws.length) continue;
    const rankWord = ws[i + 1];
    const rank = NUMBER_WORDS[rankWord] ?? (rankWord && /^[1-8]$/.test(rankWord) ? rankWord : null);
    if (rank) return { square: file + rank, next: i + 2 };
  }
  return null;
}

export function parseSpokenMove(rawText: string, legalMoves: Move[]): ParseResult {
  const ws = words(rawText);
  if (ws.length === 0) return { kind: 'no-match' };
  const text = ws.join(' ');

  // Castling
  if (text.includes('castle') && (text.includes('king') || text.includes('short'))) {
    const m = legalMoves.find((x) => x.san === 'O-O');
    return m ? { kind: 'match', move: m } : { kind: 'no-match' };
  }
  if (text.includes('castle') && (text.includes('queen') || text.includes('long'))) {
    const m = legalMoves.find((x) => x.san === 'O-O-O');
    return m ? { kind: 'match', move: m } : { kind: 'no-match' };
  }

  // Optional leading piece word ("knight", "queen", ...). No word = pawn move.
  let i = 0;
  let piece: string | null = null;
  if (PIECE_WORDS[ws[0]] && ws[0] !== 'castle') { piece = PIECE_WORDS[ws[0]]; i = 1; }

  const isCapture = ws.includes('takes') || ws.includes('captures') || ws.includes('x');

  // A move may name a source square ("e2 to e4") or just a destination ("e4", "knight f3").
  const first = readSquare(ws, i);
  if (!first) return { kind: 'no-match' };
  const second = readSquare(ws, first.next);
  const from = second ? first.square : null;
  const to = second ? second.square : first.square;

  let candidates = legalMoves.filter((m) => m.to === to);
  if (piece) candidates = candidates.filter((m) => m.piece === piece);
  if (from) candidates = candidates.filter((m) => m.from === from);
  if (isCapture) candidates = candidates.filter((m) => !!m.captured);

  if (candidates.length === 1) return { kind: 'match', move: candidates[0] };
  if (candidates.length > 1) return { kind: 'ambiguous', candidates };

  // Nothing matched with the capture/piece filters; try again without them before giving up.
  const loose = legalMoves.filter((m) => m.to === to && (!from || m.from === from));
  if (loose.length === 1) return { kind: 'match', move: loose[0] };
  if (loose.length > 1) return { kind: 'ambiguous', candidates: loose };
  return { kind: 'no-match' };
}
