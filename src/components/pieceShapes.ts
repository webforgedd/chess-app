// Piece outlines on a 100x100 grid. Every piece is a few simple shapes that share
// one glass gradient, so they read as a single solid object.
export type Part =
  | { k: 'p'; d: string }
  | { k: 'c'; cx: number; cy: number; r: number }
  | { k: 'r'; x: number; y: number; w: number; h: number; rx: number };

// Shared foot: two stacked plinth bars
const FOOT: Part[] = [
  { k: 'r', x: 24, y: 80, w: 52, h: 9, rx: 4 },
  { k: 'r', x: 29, y: 73, w: 42, h: 8, rx: 3 },
];

export const SHAPES: Record<string, Part[]> = {
  p: [
    { k: 'c', cx: 50, cy: 29, r: 12 },
    { k: 'r', x: 37, y: 41, w: 26, h: 7, rx: 3.5 },
    { k: 'p', d: 'M41 48 C41 58 36 64 32 74 L68 74 C64 64 59 58 59 48 Z' },
    ...FOOT,
  ],
  r: [
    { k: 'p', d: 'M27 16 H39 V26 H44 V16 H56 V26 H61 V16 H73 V34 L66 40 V64 L72 73 H28 L34 64 V40 L27 34 Z' },
    ...FOOT,
  ],
  n: [
    { k: 'p', d: 'M30 74 C29 60 33 51 41 45 C35 45 30 48 26 53 L22 48 C24 38 32 28 44 22 L45 11 L53 17 '
        + 'C56 15 59 15 62 17 C73 23 78 37 76 52 C75 60 74 67 75 74 Z '
        + 'M27 50 L34 47' },
    ...FOOT,
  ],
  b: [
    { k: 'c', cx: 50, cy: 14, r: 5.5 },
    { k: 'p', d: 'M50 20 C64 28 68 40 62 50 C60 53 59 55 59 58 L41 58 C41 55 40 53 38 50 C32 40 36 28 50 20 Z' },
    { k: 'r', x: 35, y: 57, w: 30, h: 7, rx: 3.5 },
    { k: 'p', d: 'M41 63 C41 68 38 70 34 74 L66 74 C62 70 59 68 59 63 Z' },
    ...FOOT,
  ],
  q: [
    { k: 'c', cx: 23, cy: 24, r: 5 },
    { k: 'c', cx: 37, cy: 17, r: 5 },
    { k: 'c', cx: 50, cy: 14, r: 5 },
    { k: 'c', cx: 63, cy: 17, r: 5 },
    { k: 'c', cx: 77, cy: 24, r: 5 },
    { k: 'p', d: 'M28 72 L21 30 L37 46 L37 24 L46 44 L50 20 L54 44 L63 24 L63 46 L79 30 L72 72 Z' },
    ...FOOT,
  ],
  k: [
    { k: 'r', x: 46.5, y: 6, w: 7, h: 22, rx: 2 },
    { k: 'r', x: 39, y: 12, w: 22, h: 7, rx: 2 },
    { k: 'p', d: 'M50 28 C68 28 76 40 70 52 C68 56 66 58 66 62 L66 72 L34 72 L34 62 C34 58 32 56 30 52 C24 40 32 28 50 28 Z' },
    ...FOOT,
  ],
};
