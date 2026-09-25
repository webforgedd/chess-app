export type Profile = { id: string; username: string; rating: number };
export type Game = {
  id: string; white: string | null; black: string | null; minutes: number; increment: number;
  status: 'waiting' | 'active' | 'finished'; fen: string; turn: 'w' | 'b';
  white_ms: number; black_ms: number; move_count: number; last_move_at: string | null;
  draw_offer: 'w' | 'b' | null; result: 'w' | 'b' | 'd' | null; reason: string | null;
};
export type MoveRow = { ply: number; san: string };
export type Challenge = {
  id: string; from_user: string; to_user: string; minutes: number; increment: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'; game_id: string | null; created_at: string;
};
