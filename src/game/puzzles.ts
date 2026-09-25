// Puzzles generated and checked by computer (every position is legal, and the mates are verified).
// mate1: any move that gives checkmate is accepted.
// mate2: `moves` lists the first moves that force mate in 2; the opponent then replies and you deliver mate.
export type Puzzle = { id: string; kind: 'mate1' | 'mate2'; fen: string; moves: string[] };

export const PUZZLES: Puzzle[] = [
  { id: 'm1-1', kind: 'mate1', fen: '3Q4/4K3/Q7/2k5/8/7p/8/1r5n w - - 0 1', moves: ['Qdd6#'] },
  { id: 'm1-2', kind: 'mate1', fen: '8/8/3pQ3/p1p5/K7/8/B1R5/3k4 w - - 0 1', moves: ['Qe2#'] },
  { id: 'm1-3', kind: 'mate1', fen: '8/8/8/5p2/Kp6/1rR5/R7/7k w - - 0 1', moves: ['Rc1#'] },
  { id: 'm1-4', kind: 'mate1', fen: '8/1Q1p4/7R/4p3/k5BK/8/7p/8 w - - 0 1', moves: ['Ra6#'] },
  { id: 'm1-5', kind: 'mate1', fen: '2R5/3p2r1/4p3/8/3R4/8/5K2/7k w - - 0 1', moves: ['Rh4#'] },
  { id: 'm1-6', kind: 'mate1', fen: '1k2K3/1B1Q4/3p4/R7/8/6p1/2p5/8 w - - 0 1', moves: ['Qc8#', 'Ra8#'] },
  { id: 'm1-7', kind: 'mate1', fen: '8/6K1/3Q3p/k7/1R6/q6p/8/8 w - - 0 1', moves: ['Qb6#'] },
  { id: 'm1-8', kind: 'mate1', fen: '8/6pR/8/5p2/8/2r5/4R3/3K1k2 w - - 0 1', moves: ['Rh1#'] },
  { id: 'm1-9', kind: 'mate1', fen: '2R5/2p3p1/2Q5/7k/5K1p/8/7B/8 w - - 0 1', moves: ['Rh8#'] },
  { id: 'm1-10', kind: 'mate1', fen: 'R7/8/8/2p4k/3p3q/8/6Q1/1K6 w - - 0 1', moves: ['Rh8#'] },
  { id: 'm2-1', kind: 'mate2', fen: '4N2k/K7/Q7/8/8/6p1/5p1r/8 w - - 0 1', moves: ['Qf6+', 'Qa1+'] },
  { id: 'm2-2', kind: 'mate2', fen: 'r7/2p5/1p5K/8/4N3/2Q5/6k1/8 w - - 0 1', moves: ['Qg3+'] },
  { id: 'm2-3', kind: 'mate2', fen: '8/5K2/3pQ3/8/8/3B1p2/3R1p2/7k w - - 0 1', moves: ['Rxf2'] },
  { id: 'm2-4', kind: 'mate2', fen: '4K3/6Bp/3p4/6k1/8/2p4R/Q7/8 w - - 0 1', moves: ['Qe6'] },
  { id: 'm2-5', kind: 'mate2', fen: '8/1k6/8/QKR5/5p2/8/7p/q7 w - - 0 1', moves: ['Qb6+'] },
  { id: 'm2-6', kind: 'mate2', fen: '8/8/8/K2R4/4p3/3r1Q2/7k/8 w - - 0 1', moves: ['Rh5+'] },
  { id: 'm2-7', kind: 'mate2', fen: '8/2pp4/8/8/B7/Q4pR1/3k4/K7 w - - 0 1', moves: ['Rxf3'] },
  { id: 'm2-8', kind: 'mate2', fen: '8/k7/4p1q1/8/1K4p1/8/3R2Q1/8 w - - 0 1', moves: ['Rd7+'] },
  { id: 'm2-9', kind: 'mate2', fen: '8/6p1/6p1/7Q/p1B5/4k3/6RK/8 w - - 0 1', moves: ['Qg4', 'Qe5+'] },
];
