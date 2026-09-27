-- Chess app: online play schema for Supabase.
-- Run this whole file once in Supabase -> SQL Editor -> New query -> Run.

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  rating int not null default 1200,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white uuid references public.profiles(id),
  black uuid references public.profiles(id),
  minutes int not null,
  increment int not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn text not null default 'w' check (turn in ('w', 'b')),
  white_ms int not null,
  black_ms int not null,
  move_count int not null default 0,
  last_move_at timestamptz,
  draw_offer text check (draw_offer in ('w', 'b')),
  result text check (result in ('w', 'b', 'd')),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists games_waiting_idx on public.games (status, minutes, increment, created_at);

create table if not exists public.moves (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply int not null,
  san text not null,
  fen text not null,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

-- ---------- Row level security (players can only read their own games; all writes go through the functions below) ----------
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.moves enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);

drop policy if exists "players read own games" on public.games;
create policy "players read own games" on public.games for select to authenticated
  using (auth.uid() in (white, black));

drop policy if exists "players read own moves" on public.moves;
create policy "players read own moves" on public.moves for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and auth.uid() in (g.white, g.black)));

-- ---------- Internal helpers ----------
create or replace function public._finish(p_game uuid, p_result text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; ra int; rb int; score numeric; delta int;
begin
  update public.games set status = 'finished', result = p_result, reason = p_reason, draw_offer = null
   where id = p_game and status = 'active' returning * into g;
  if not found then return; end if;
  select rating into ra from public.profiles where id = g.white;
  select rating into rb from public.profiles where id = g.black;
  score := case p_result when 'w' then 1 when 'b' then 0 else 0.5 end;
  delta := round(32 * (score - 1 / (1 + power(10, (rb - ra) / 400.0))));
  update public.profiles set rating = greatest(100, rating + delta) where id = g.white;
  update public.profiles set rating = greatest(100, rating - delta) where id = g.black;
end $$;
revoke execute on function public._finish(uuid, text, text) from public, anon, authenticated;

-- ---------- Functions the app calls ----------
create or replace function public.server_time() returns timestamptz language sql stable as $$ select now() $$;

-- drop the other overload first each time, so re-running this file never leaves
-- two ambiguous versions of create_profile around at once
drop function if exists public.create_profile(text, text);
create or replace function public.create_profile(p_username text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.profiles (id, username) values (auth.uid(), p_username) returning * into p;
  return p;
exception when unique_violation then
  raise exception 'username already taken';
end $$;

create or replace function public.find_game(p_minutes int, p_increment int)
returns public.games language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_minutes < 1 or p_minutes > 60 or p_increment < 0 or p_increment > 60 then raise exception 'bad time control'; end if;

  select * into g from public.games where status = 'waiting' and white = uid limit 1;
  if found then
    if g.minutes = p_minutes and g.increment = p_increment then return g; end if;
    delete from public.games where id = g.id;
  end if;

  select * into g from public.games
   where status = 'waiting' and minutes = p_minutes and increment = p_increment and white <> uid
   order by created_at limit 1 for update skip locked;
  if found then
    if random() < 0.5 then
      update public.games set black = uid, status = 'active', last_move_at = now() where id = g.id returning * into g;
    else
      update public.games set black = white, white = uid, status = 'active', last_move_at = now() where id = g.id returning * into g;
    end if;
    return g;
  end if;

  insert into public.games (white, minutes, increment, white_ms, black_ms)
  values (uid, p_minutes, p_increment, p_minutes * 60000, p_minutes * 60000) returning * into g;
  return g;
end $$;

create or replace function public.cancel_search(p_game uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.games where id = p_game and white = auth.uid() and status = 'waiting';
$$;

create or replace function public.make_move(p_game uuid, p_san text, p_fen text, p_result text default null, p_reason text default null)
returns public.games language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games; me text; elapsed int; left_ms int; inc int;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' then raise exception 'game is not active'; end if;
  me := case when uid = g.white then 'w' when uid = g.black then 'b' else null end;
  if me is null then raise exception 'not your game'; end if;
  if me <> g.turn then raise exception 'not your turn'; end if;
  if p_result is not null and p_result not in ('w', 'b', 'd') then raise exception 'bad result'; end if;

  elapsed := case when g.move_count >= 1 then greatest(0, (extract(epoch from (now() - g.last_move_at)) * 1000)::int) else 0 end;
  left_ms := (case when me = 'w' then g.white_ms else g.black_ms end) - elapsed;

  if left_ms <= 0 then  -- too late: the move is not accepted
    update public.games set white_ms = case when me = 'w' then 0 else white_ms end,
                            black_ms = case when me = 'b' then 0 else black_ms end where id = g.id;
    perform public._finish(g.id, case when me = 'w' then 'b' else 'w' end, 'time');
    select * into g from public.games where id = p_game;
    return g;
  end if;

  inc := case when g.move_count >= 1 then g.increment * 1000 else 0 end;
  insert into public.moves (game_id, ply, san, fen) values (g.id, g.move_count + 1, p_san, p_fen);
  update public.games set
    fen = p_fen, turn = case when me = 'w' then 'b' else 'w' end, move_count = move_count + 1,
    last_move_at = now(), draw_offer = null,
    white_ms = case when me = 'w' then left_ms + inc else white_ms end,
    black_ms = case when me = 'b' then left_ms + inc else black_ms end
   where id = g.id;
  if p_result is not null then perform public._finish(g.id, p_result, coalesce(p_reason, 'game over')); end if;
  select * into g from public.games where id = p_game;
  return g;
end $$;

create or replace function public.resign_game(p_game uuid)
returns public.games language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' or uid not in (g.white, g.black) then raise exception 'cannot resign'; end if;
  perform public._finish(g.id, case when uid = g.white then 'b' else 'w' end, 'resignation');
  select * into g from public.games where id = p_game;
  return g;
end $$;

create or replace function public.offer_draw(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' or uid not in (g.white, g.black) then raise exception 'cannot offer draw'; end if;
  update public.games set draw_offer = case when uid = g.white then 'w' else 'b' end where id = g.id;
end $$;

create or replace function public.respond_draw(p_game uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games; me text;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' or uid not in (g.white, g.black) then raise exception 'no such game'; end if;
  me := case when uid = g.white then 'w' else 'b' end;
  if g.draw_offer is null or g.draw_offer = me then raise exception 'no draw offer to answer'; end if;
  if p_accept then perform public._finish(g.id, 'd', 'agreement');
  else update public.games set draw_offer = null where id = g.id; end if;
end $$;

-- Either player can call this when the player to move has run out of time.
create or replace function public.claim_timeout(p_game uuid)
returns public.games language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games; elapsed int; left_ms int;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' or uid not in (g.white, g.black) then raise exception 'cannot claim'; end if;
  if g.move_count >= 1 then
    elapsed := greatest(0, (extract(epoch from (now() - g.last_move_at)) * 1000)::int);
    left_ms := (case when g.turn = 'w' then g.white_ms else g.black_ms end) - elapsed;
    if left_ms <= 0 then
      perform public._finish(g.id, case when g.turn = 'w' then 'b' else 'w' end, 'time');
    end if;
  end if;
  select * into g from public.games where id = p_game;
  return g;
end $$;

-- Only signed-in users may call the functions
revoke execute on function public.create_profile, public.find_game, public.cancel_search,
  public.resign_game, public.offer_draw, public.respond_draw, public.claim_timeout, public.server_time from public, anon;
grant execute on function public.create_profile, public.find_game, public.cancel_search,
  public.resign_game, public.offer_draw, public.respond_draw, public.claim_timeout, public.server_time to authenticated;

-- Live updates for the two tables
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='games') then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='moves') then
    alter publication supabase_realtime add table public.moves;
  end if;
end $$;

-- ---------- Friends and challenges ----------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id),
  to_user uuid not null references public.profiles(id),
  minutes int not null,
  increment int not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  game_id uuid references public.games(id),
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
drop policy if exists "see own challenges" on public.challenges;
create policy "see own challenges" on public.challenges for select to authenticated
  using (auth.uid() in (from_user, to_user));

create or replace function public.send_challenge(p_to_username text, p_minutes int, p_increment int)
returns public.challenges language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); target uuid; c public.challenges;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select id into target from public.profiles where username = p_to_username;
  if target is null then raise exception 'no player with that username'; end if;
  if target = uid then raise exception 'you cannot challenge yourself'; end if;
  if p_minutes < 1 or p_minutes > 60 or p_increment < 0 or p_increment > 60 then raise exception 'bad time control'; end if;
  insert into public.challenges (from_user, to_user, minutes, increment) values (uid, target, p_minutes, p_increment) returning * into c;
  return c;
end $$;

create or replace function public.accept_challenge(p_challenge uuid)
returns public.challenges language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.challenges; g public.games; a uuid; b uuid;
begin
  select * into c from public.challenges where id = p_challenge for update;
  if not found or c.to_user <> uid or c.status <> 'pending' then raise exception 'cannot accept this challenge'; end if;
  if random() < 0.5 then a := c.from_user; b := c.to_user; else a := c.to_user; b := c.from_user; end if;
  insert into public.games (white, black, minutes, increment, status, white_ms, black_ms, last_move_at)
  values (a, b, c.minutes, c.increment, 'active', c.minutes * 60000, c.minutes * 60000, now()) returning * into g;
  update public.challenges set status = 'accepted', game_id = g.id where id = p_challenge returning * into c;
  return c;
end $$;

create or replace function public.decline_challenge(p_challenge uuid)
returns void language sql security definer set search_path = public as $$
  update public.challenges set status = 'declined' where id = p_challenge and to_user = auth.uid() and status = 'pending';
$$;

create or replace function public.cancel_challenge(p_challenge uuid)
returns void language sql security definer set search_path = public as $$
  update public.challenges set status = 'cancelled' where id = p_challenge and from_user = auth.uid() and status = 'pending';
$$;

revoke execute on function public.send_challenge, public.accept_challenge, public.decline_challenge, public.cancel_challenge from public, anon;
grant execute on function public.send_challenge, public.accept_challenge, public.decline_challenge, public.cancel_challenge to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='challenges') then
    alter publication supabase_realtime add table public.challenges;
  end if;
end $$;

-- ---------- Online rematch ----------
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='games' and column_name='rematch_offer') then
    alter table public.games add column rematch_offer text check (rematch_offer in ('w', 'b'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='games' and column_name='rematch_game_id') then
    alter table public.games add column rematch_game_id uuid references public.games(id);
  end if;
end $$;

-- Call this for "Rematch". If the opponent already asked, this instantly starts a new
-- game (both wanted it) and points the old game's rematch_game_id at it, which both
-- players' existing realtime subscription on the old game already picks up.
create or replace function public.offer_rematch(p_game uuid)
returns public.games language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games; me text; a uuid; b uuid; ng public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'finished' or uid not in (g.white, g.black) then raise exception 'cannot offer rematch here'; end if;
  me := case when uid = g.white then 'w' else 'b' end;

  if g.rematch_offer is null then
    update public.games set rematch_offer = me where id = p_game returning * into g;
    return g;
  end if;

  if g.rematch_offer = me then
    return g; -- already asked, waiting on the opponent
  end if;

  if random() < 0.5 then a := g.white; b := g.black; else a := g.black; b := g.white; end if;
  insert into public.games (white, black, minutes, increment, status, white_ms, black_ms, last_move_at)
  values (a, b, g.minutes, g.increment, 'active', g.minutes * 60000, g.minutes * 60000, now()) returning * into ng;
  update public.games set rematch_game_id = ng.id where id = p_game returning * into g;
  return g;
end $$;

revoke execute on function public.offer_rematch from public, anon;
grant execute on function public.offer_rematch to authenticated;

-- ---------- Server-side move legality (hardening) ----------
-- The phone app can no longer call make_move directly. Instead the Edge Function
-- "make-move" checks the move is actually legal (with chess.js) before calling this,
-- using the service role key -- something a modified/fake app can never have. The
-- player's identity is passed in as p_player (verified by the Edge Function from their
-- login token) since auth.uid() is not available on a service-role call.
drop function if exists public.make_move(uuid, text, text, text, text);

create or replace function public.make_move(p_game uuid, p_player uuid, p_san text, p_fen text, p_result text default null, p_reason text default null)
returns public.games language plpgsql security definer set search_path = public as $$
declare g public.games; me text; elapsed int; left_ms int; inc int;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.status <> 'active' then raise exception 'game is not active'; end if;
  me := case when p_player = g.white then 'w' when p_player = g.black then 'b' else null end;
  if me is null then raise exception 'not your game'; end if;
  if me <> g.turn then raise exception 'not your turn'; end if;
  if p_result is not null and p_result not in ('w', 'b', 'd') then raise exception 'bad result'; end if;

  elapsed := case when g.move_count >= 1 then greatest(0, (extract(epoch from (now() - g.last_move_at)) * 1000)::int) else 0 end;
  left_ms := (case when me = 'w' then g.white_ms else g.black_ms end) - elapsed;

  if left_ms <= 0 then
    update public.games set white_ms = case when me = 'w' then 0 else white_ms end,
                            black_ms = case when me = 'b' then 0 else black_ms end where id = g.id;
    perform public._finish(g.id, case when me = 'w' then 'b' else 'w' end, 'time');
    select * into g from public.games where id = p_game;
    return g;
  end if;

  inc := case when g.move_count >= 1 then g.increment * 1000 else 0 end;
  insert into public.moves (game_id, ply, san, fen) values (g.id, g.move_count + 1, p_san, p_fen);
  update public.games set
    fen = p_fen, turn = case when me = 'w' then 'b' else 'w' end, move_count = move_count + 1,
    last_move_at = now(), draw_offer = null,
    white_ms = case when me = 'w' then left_ms + inc else white_ms end,
    black_ms = case when me = 'b' then left_ms + inc else black_ms end
   where id = g.id;
  if p_result is not null then perform public._finish(g.id, p_result, coalesce(p_reason, 'game over')); end if;
  select * into g from public.games where id = p_game;
  return g;
end $$;

-- Only the Edge Function (using the service role key) may call this now -- not the app,
-- not even a logged-in player calling the API directly.
revoke execute on function public.make_move(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.make_move(uuid, uuid, text, text, text, text) to service_role;

-- ---------- Online chat ----------
create table if not exists public.chat_messages (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  sender uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_game_idx on public.chat_messages (game_id, created_at);

alter table public.chat_messages enable row level security;
drop policy if exists "players read own game chat" on public.chat_messages;
create policy "players read own game chat" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and auth.uid() in (g.white, g.black)));

create or replace function public.send_chat(p_game uuid, p_body text)
returns public.chat_messages language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.games; body text; m public.chat_messages;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into g from public.games where id = p_game;
  if not found or uid not in (g.white, g.black) then raise exception 'not your game'; end if;
  body := trim(p_body);
  if body = '' then raise exception 'message is empty'; end if;
  if char_length(body) > 300 then body := left(body, 300); end if;
  insert into public.chat_messages (game_id, sender, body) values (p_game, uid, body) returning * into m;
  return m;
end $$;

revoke execute on function public.send_chat from public, anon;
grant execute on function public.send_chat to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- ---------- Profile screen: multi-format ratings, history, country ----------
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='rating_bullet') then
    alter table public.profiles add column rating_bullet int not null default 1200;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='rating_blitz') then
    alter table public.profiles add column rating_blitz int not null default 1200;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='rating_rapid') then
    alter table public.profiles add column rating_rapid int not null default 1200;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='country') then
    alter table public.profiles add column country text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='games' and column_name='white_rating_change') then
    alter table public.games add column white_rating_change int;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='games' and column_name='black_rating_change') then
    alter table public.games add column black_rating_change int;
  end if;
end $$;

create table if not exists public.rating_history (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id),
  format text not null check (format in ('bullet', 'blitz', 'rapid')),
  rating int not null,
  created_at timestamptz not null default now()
);
create index if not exists rating_history_idx on public.rating_history (profile_id, format, created_at);
alter table public.rating_history enable row level security;
drop policy if exists "rating history readable" on public.rating_history;
create policy "rating history readable" on public.rating_history for select to authenticated using (true);

-- Replaces the single-rating _finish with a per-format version: bullet (<3 min),
-- blitz (3-9 min), rapid (10+ min). Keeps the old `rating` column mirroring blitz,
-- so existing screens that show profile.rating keep working unchanged.
create or replace function public._finish(p_game uuid, p_result text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; ra int; rb int; score numeric; delta int; fmt text; col text;
declare new_a int; new_b int;
begin
  update public.games set status = 'finished', result = p_result, reason = p_reason, draw_offer = null
   where id = p_game and status = 'active' returning * into g;
  if not found then return; end if;

  fmt := case when g.minutes < 3 then 'bullet' when g.minutes < 10 then 'blitz' else 'rapid' end;
  col := 'rating_' || fmt;

  execute format('select %I from public.profiles where id = $1', col) into ra using g.white;
  execute format('select %I from public.profiles where id = $1', col) into rb using g.black;

  score := case p_result when 'w' then 1 when 'b' then 0 else 0.5 end;
  delta := round(32 * (score - 1 / (1 + power(10, (rb - ra) / 400.0))));

  execute format('update public.profiles set %I = greatest(100, %I + $1) where id = $2 returning %I', col, col, col)
    into new_a using delta, g.white;
  execute format('update public.profiles set %I = greatest(100, %I - $1) where id = $2 returning %I', col, col, col)
    into new_b using delta, g.black;

  if fmt = 'blitz' then
    update public.profiles set rating = new_a where id = g.white;
    update public.profiles set rating = new_b where id = g.black;
  end if;

  update public.games set white_rating_change = new_a - ra, black_rating_change = new_b - rb where id = p_game;

  insert into public.rating_history (profile_id, format, rating) values (g.white, fmt, new_a);
  insert into public.rating_history (profile_id, format, rating) values (g.black, fmt, new_b);
end $$;

-- create_profile now takes an optional country (drop the old one-argument version so
-- only a single, unambiguous signature exists)
drop function if exists public.create_profile(text);
create or replace function public.create_profile(p_username text, p_country text default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.profiles (id, username, country) values (auth.uid(), p_username, p_country) returning * into p;
  return p;
exception when unique_violation then
  raise exception 'username already taken';
end $$;

-- The new signature needs its own grant (dropping+recreating the old one-arg version
-- does not carry the earlier grant over to this different signature).
revoke execute on function public.create_profile(text, text) from public, anon;
grant execute on function public.create_profile(text, text) to authenticated;

-- ---------- Friends ----------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id),
  to_user uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
alter table public.friend_requests enable row level security;
drop policy if exists "see own friend requests" on public.friend_requests;
create policy "see own friend requests" on public.friend_requests for select to authenticated
  using (auth.uid() in (from_user, to_user));

create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id),
  user_b uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
alter table public.friendships enable row level security;
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships for select to authenticated
  using (auth.uid() in (user_a, user_b));

create or replace function public.send_friend_request(p_to_username text)
returns public.friend_requests language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); target uuid; r public.friend_requests; a uuid; b uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select id into target from public.profiles where username = p_to_username;
  if target is null then raise exception 'no player with that username'; end if;
  if target = uid then raise exception 'you cannot friend yourself'; end if;
  a := least(uid, target); b := greatest(uid, target);
  if exists (select 1 from public.friendships where user_a = a and user_b = b) then
    raise exception 'already friends';
  end if;
  insert into public.friend_requests (from_user, to_user) values (uid, target)
    on conflict (from_user, to_user) do update set status = 'pending', created_at = now()
    returning * into r;
  return r;
end $$;

create or replace function public.respond_friend_request(p_request uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.friend_requests; a uuid; b uuid;
begin
  select * into r from public.friend_requests where id = p_request for update;
  if not found or r.to_user <> uid or r.status <> 'pending' then raise exception 'no such request'; end if;
  if p_accept then
    a := least(r.from_user, r.to_user); b := greatest(r.from_user, r.to_user);
    update public.friend_requests set status = 'accepted' where id = p_request;
    insert into public.friendships (user_a, user_b) values (a, b) on conflict do nothing;
  else
    update public.friend_requests set status = 'declined' where id = p_request;
  end if;
end $$;

create or replace function public.friends_count(p_user uuid default null)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.friendships where coalesce(p_user, auth.uid()) in (user_a, user_b);
$$;

revoke execute on function public.send_friend_request, public.respond_friend_request, public.friends_count from public, anon;
grant execute on function public.send_friend_request, public.respond_friend_request, public.friends_count to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='friend_requests') then
    alter publication supabase_realtime add table public.friend_requests;
  end if;
end $$;

-- ---------- Profile picture (Supabase Storage) ----------
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar images are publicly accessible" on storage.objects;
create policy "avatar images are publicly accessible" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update their own avatar" on storage.objects;
create policy "users update their own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- profiles has no general UPDATE policy (all writes so far go through functions);
-- this lets a signed-in user set only their own avatar_url, nothing else on the row.
create or replace function public.set_avatar_url(p_url text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.profiles set avatar_url = p_url where id = auth.uid() returning * into p;
  return p;
end $$;

revoke execute on function public.set_avatar_url from public, anon;
grant execute on function public.set_avatar_url to authenticated;

-- ---------- Username editing ----------
create or replace function public.update_username(p_new text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_new !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'usernames are 3-20 letters, numbers or underscores'; end if;
  update public.profiles set username = p_new where id = auth.uid() returning * into p;
  return p;
exception when unique_violation then
  raise exception 'username already taken';
end $$;

revoke execute on function public.update_username from public, anon;
grant execute on function public.update_username to authenticated;

-- ---------- Puzzle progress (server-saved) ----------
create table if not exists public.puzzle_solves (
  profile_id uuid not null references public.profiles(id),
  puzzle_id text not null,
  solved_at timestamptz not null default now(),
  primary key (profile_id, puzzle_id)
);
alter table public.puzzle_solves enable row level security;
drop policy if exists "see own puzzle solves" on public.puzzle_solves;
create policy "see own puzzle solves" on public.puzzle_solves for select to authenticated
  using (auth.uid() = profile_id);

create or replace function public.record_puzzle_solve(p_puzzle_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.puzzle_solves (profile_id, puzzle_id) values (auth.uid(), p_puzzle_id)
    on conflict (profile_id, puzzle_id) do nothing;
end $$;

revoke execute on function public.record_puzzle_solve from public, anon;
grant execute on function public.record_puzzle_solve to authenticated;
