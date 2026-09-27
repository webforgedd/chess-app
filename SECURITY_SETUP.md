# Setting up server-side move checking

This makes the server itself check that every online move is actually legal, instead of
trusting the phone. It needs one new tool (Supabase CLI) and one small deploy step.

## 1. Install the Supabase CLI

```powershell
npm install -g supabase
```

## 2. Log in

```powershell
supabase login
```
This opens a browser to sign in with the same account you used for your Supabase project.

## 3. Link this project to your Supabase project

```powershell
cd C:\dev\chess-app
supabase link --project-ref ozndlgfqspmgmeicmqml
```
(That ref is the part of your project's URL between `https://` and `.supabase.co` — yours is
already filled in above; use your own if it's different.) It will ask for your database
password (the one you set when creating the project).

## 4. Deploy the function

```powershell
supabase functions deploy make-move
```
This uploads `supabase/functions/make-move/index.ts` to Supabase. Takes under a minute.

## 5. Update the database

Run `supabase/schema.sql` again in the SQL Editor (SQL Editor > New query > paste the whole
file > Run), same as always. This is the part that stops the app from writing moves directly,
so both this AND the function deploy are needed together.

## 6. Update the app

Copy `App.tsx` and `src/` from this zip into your project (Replace when asked), then paste
your Supabase URL/key back into `src/online/config.ts` as usual.

## Test it

Play an online move as normal — it should feel exactly the same. If something's wrong (the
function isn't deployed yet, or a step above was skipped), moves will fail with an error
message instead of silently doing the wrong thing.

## What this actually protects against

Before this: a modified copy of the app could send any move at all — teleporting a piece
across the board, moving out of turn, claiming a made-up result. The server just wrote down
whatever it was told.

After this: every move is replayed against the real board position and checked with the same
chess rules engine the app uses, before it's allowed to happen — no matter what the app that
sent it claims. Draw offers, resigning, and rematches are unchanged (a player choosing to
resign or offer a draw isn't a fairness problem the way an illegal move is).
