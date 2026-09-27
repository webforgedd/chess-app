// Server-side move legality check.
//
// The phone app can no longer write a move to the database on its own (see
// schema.sql -- make_move is grant-restricted to service_role only). Instead it calls
// this function, which:
//   1) verifies WHO is calling from their login token (not from anything the app claims)
//   2) loads the real current position from the database
//   3) checks the requested move is actually legal with chess.js
//   4) only then writes it, using the service role key the app itself never has
//
// A modified/fake app can still ask this function to make a move, but it can no longer
// make an illegal one, or make a move claiming to be a player it isn't.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Chess } from 'npm:chess.js@1.0.0-beta.8';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'missing auth token' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Who is really calling, according to their own login token (this cannot be faked
    // by the app -- Supabase itself verifies the token's signature here).
    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await asUser.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'not signed in' }, 401);
    const playerId = userData.user.id;

    const { gameId, from, to, promotion } = await req.json();
    if (!gameId || !from || !to) return json({ error: 'missing gameId/from/to' }, 400);

    // Privileged client: only this function has this key, never the app.
    const admin = createClient(url, serviceKey);

    const { data: game, error: gameErr } = await admin.from('games').select('*').eq('id', gameId).maybeSingle();
    if (gameErr || !game) return json({ error: 'game not found' }, 404);
    if (game.status !== 'active') return json({ error: 'game is not active' }, 409);
    if (playerId !== game.white && playerId !== game.black) return json({ error: 'not your game' }, 403);
    const me = playerId === game.white ? 'w' : 'b';
    if (me !== game.turn) return json({ error: 'not your turn' }, 409);

    // The actual legality check: replay the stored position and try the move.
    const chess = new Chess(game.fen);
    let move;
    try {
      move = chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      move = null;
    }
    if (!move) return json({ error: 'illegal move' }, 400);

    let result: string | null = null;
    let reason: string | null = null;
    if (chess.isCheckmate()) { result = me; reason = 'checkmate'; }
    else if (chess.isStalemate()) { result = 'd'; reason = 'stalemate'; }
    else if (chess.isInsufficientMaterial()) { result = 'd'; reason = 'insufficient material'; }
    else if (chess.isThreefoldRepetition()) { result = 'd'; reason = 'repetition'; }
    else if (chess.isDraw()) { result = 'd'; reason = 'fifty-move rule'; }

    const { data: updated, error: moveErr } = await admin.rpc('make_move', {
      p_game: gameId,
      p_player: playerId,
      p_san: move.san,
      p_fen: chess.fen(),
      p_result: result,
      p_reason: reason,
    });
    if (moveErr) return json({ error: moveErr.message }, 400);

    return json({ game: updated });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
