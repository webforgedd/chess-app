// Glass look parameters, shared by the piece component (and used for previews).
export type Stop = { o: number; c: string; a: number };
export type GlassStyle = {
  fill: Stop[];      // body gradient (top-left to bottom-right)
  edge: Stop[];      // rim gradient
  edgeWidth: number;
  shade: number;     // darkness of the lower "refraction" band
  gloss: number;     // strength of the top highlight
  streak: number;    // strength of the vertical light streak
};

export const GLASS: Record<'w' | 'b', GlassStyle> = {
  w: {
    fill: [
      { o: 0, c: '#ffffff', a: 0.97 },
      { o: 0.5, c: '#e4ebf1', a: 0.82 },
      { o: 1, c: '#a9b6c2', a: 0.92 },
    ],
    edge: [
      { o: 0, c: '#ffffff', a: 1 },
      { o: 0.5, c: '#8d9aa6', a: 0.8 },
      { o: 1, c: '#4c5863', a: 0.95 },
    ],
    edgeWidth: 2,
    shade: 0.16,
    gloss: 0.75,
    streak: 0.45,
  },
  b: {
    fill: [
      { o: 0, c: '#666a70', a: 0.9 },
      { o: 0.5, c: '#1d1f22', a: 0.93 },
      { o: 1, c: '#000000', a: 0.97 },
    ],
    edge: [
      { o: 0, c: '#ffffff', a: 0.95 },
      { o: 0.5, c: '#9aa3ad', a: 0.45 },
      { o: 1, c: '#ffffff', a: 0.3 },
    ],
    edgeWidth: 1.8,
    shade: 0,
    gloss: 0.42,
    streak: 0.25,
  },
};

// Small details drawn on top of the glass (eye of the knight)
export const DETAILS: Record<string, { cx: number; cy: number; r: number }[]> = {
  n: [{ cx: 57, cy: 33, r: 2.8 }],
};

// Royal (ornate gold / dark bronze) style, for a luxury carved-chess-set look.
export const ROYAL: Record<'w' | 'b', GlassStyle> = {
  w: {
    fill: [
      { o: 0, c: '#fff6d8', a: 1 },
      { o: 0.22, c: '#f0c85e', a: 1 },
      { o: 0.5, c: '#b8862f', a: 1 },
      { o: 0.75, c: '#e9c46a', a: 1 },
      { o: 1, c: '#6b4a17', a: 1 },
    ],
    edge: [
      { o: 0, c: '#fff8e1', a: 1 },
      { o: 0.5, c: '#3a2a0d', a: 1 },
      { o: 1, c: '#1c1404', a: 1 },
    ],
    edgeWidth: 1.4,
    shade: 0.32,
    gloss: 0.55,
    streak: 0.4,
  },
  b: {
    fill: [
      { o: 0, c: '#4a4038', a: 1 },
      { o: 0.25, c: '#1a1512', a: 1 },
      { o: 0.55, c: '#0a0806', a: 1 },
      { o: 0.8, c: '#2b2118', a: 1 },
      { o: 1, c: '#050403', a: 1 },
    ],
    edge: [
      { o: 0, c: '#f0c85e', a: 1 },
      { o: 0.5, c: '#8a6524', a: 1 },
      { o: 1, c: '#3a2a0d', a: 1 },
    ],
    edgeWidth: 1.4,
    shade: 0.28,
    gloss: 0.28,
    streak: 0.18,
  },
};

// Small gems/bands drawn on top for the royal style (base ring + a gem on tall pieces)
export const ORNAMENTS: Record<string, { cx: number; cy: number; r: number }[]> = {
  k: [{ cx: 50, cy: 17, r: 2.6 }],
  q: [{ cx: 50, cy: 20, r: 2.2 }],
  b: [{ cx: 50, cy: 14, r: 2 }],
  n: [{ cx: 57, cy: 33, r: 2.2 }],
  r: [{ cx: 50, cy: 20, r: 1.8 }],
  p: [{ cx: 50, cy: 29, r: 1.8 }],
};
// A thin gold band across the base, drawn for every piece in royal style
export const BAND = { y: 76.5, h: 2.6 };
