// A small, hand-picked list of well-known openings, matched by the longest prefix of
// actual moves played. Not a full ECO database (that covers thousands of lines with
// exact classification codes) -- this covers the openings a club player is likely to
// actually reach, matched against the real move sequence rather than just move 1.
type Line = { name: string; moves: string[] };

const LINES: Line[] = [
  // 1.e4 e5
  { name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  { name: "King's Gambit", moves: ['e4', 'e5', 'f4'] },
  { name: 'Petrov Defense', moves: ['e4', 'e5', 'Nf3', 'Nf6'] },
  { name: 'Vienna Game', moves: ['e4', 'e5', 'Nc3'] },
  { name: "King's Pawn Game", moves: ['e4', 'e5'] },
  // 1.e4 other replies
  { name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { name: 'French Defense', moves: ['e4', 'e6'] },
  { name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { name: 'Pirc Defense', moves: ['e4', 'd6'] },
  { name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  { name: 'Alekhine Defense', moves: ['e4', 'Nf6'] },
  // 1.d4 d5
  { name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
  { name: "Queen's Gambit Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'] },
  { name: 'Slav Defense', moves: ['d4', 'd5', 'c4', 'c6'] },
  { name: 'London System', moves: ['d4', 'd5', 'Bf4'] },
  { name: "Queen's Pawn Game", moves: ['d4', 'd5'] },
  // 1.d4 other replies
  { name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { name: 'Queen\'s Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
  { name: 'Grünfeld Defense', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },
  { name: 'Benoni Defense', moves: ['d4', 'Nf6', 'c4', 'c5'] },
  { name: 'Dutch Defense', moves: ['d4', 'f5'] },
  { name: "Queen's Pawn Opening", moves: ['d4'] },
  // Flank openings
  { name: 'English Opening', moves: ['c4'] },
  { name: 'Réti Opening', moves: ['Nf3'] },
  { name: "Bird's Opening", moves: ['f4'] },
];

// Sort longest-first so a more specific (longer) line wins when it matches.
const SORTED = [...LINES].sort((a, b) => b.moves.length - a.moves.length);

function matches(sans: string[], line: string[]): boolean {
  if (sans.length < line.length) return false;
  for (let i = 0; i < line.length; i++) if (sans[i] !== line[i]) return false;
  return true;
}

// sans: the actual moves played in the game, in order (e.g. ['e4','c5','Nf3',...]).
export function classifyOpening(sans: string[]): string | null {
  for (const line of SORTED) if (matches(sans, line.moves)) return line.name;
  return null;
}

export function openingName(sans: string[] | undefined): string {
  if (!sans || sans.length === 0) return 'Not enough games yet';
  return classifyOpening(sans) ?? `${sans[0]} (unclassified)`;
}
