# Backend source

Source for the Supabase backend of PlastiCatch. The **live project is the source of truth** for
schema: the historical migrations were applied out-of-band, so this directory starts from the
deployed state rather than from a replayed migration chain (see `migrations/README.md`).

- Project ref: `rivfogygicrhkpfkwmlu`
- API URL: `https://rivfogygicrhkpfkwmlu.supabase.co`
- Region: see the Supabase dashboard

## Edge Functions

Each of the three original functions (`verify-catch`, `gallery-feed`, `delete-account`) is committed
verbatim from the deployed source. Do not hand-edit a deployed function without a matching deploy.
`verify-photo` is the exception: it is authored in this repo and is **not deployed yet** (see below).

| Function | Entry point | Auth | Purpose |
| -------- | ----------- | ---- | ------- |
| `verify-catch` | `functions/verify-catch/index.ts` | caller JWT + service role | Deterministic verification of a find/dispose pair and XP award |
| `gallery-feed` | `functions/gallery-feed/index.ts` | caller JWT + service role | Owner-only paginated gallery with short-lived signed photo URLs |
| `delete-account` | `functions/delete-account/index.ts` | caller JWT + service role | Photo cleanup then Auth user deletion, with confirmation and re-auth |
| `verify-photo` | `functions/verify-photo/index.ts` | caller JWT + service role | Claude photo check for one Find/Dispose capture; holds the Anthropic key, rate-limited per player |

`seed-debris-tracker-once` and `debris-tracker-probe` are one-off data-import helpers and are not
part of the app runtime.

### `verify-photo`

The app never calls Anthropic. It invokes `verify-photo` with its Supabase session; the function
calls the model with the project secret and returns only `{ pass, item, reason }`. Calls are logged
to `photo_check_calls`, which also enforces 200 checks per player per rolling 24 hours.

- Secret: `ANTHROPIC_API_KEY`, set with
  `npx supabase secrets set ANTHROPIC_API_KEY=... --project-ref rivfogygicrhkpfkwmlu`.
  It is never read from `.env` and never reaches the app bundle.
- Secret: `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.
- **Prototype scope:** the function receives photos as captured, before ticket 25's privacy
  pipeline (pHash before blur, face blur, original discard). Do not ship a build that uses it
  with real players until that pipeline lands.


## Storage

`catch-photos` is a **private** bucket. Objects live at `{user_id}/{catch_id}/find.jpg` and
`{user_id}/{catch_id}/dispose.jpg`. Clients never receive public URLs; `gallery-feed` mints
short-lived signed URLs.

## Configuration

`config.toml` holds local tooling defaults and non-secret project topology. Secret values are
referenced through `env(...)` and are never committed.

## Commands that require credentials

These cannot run in CI and are human-executed:

```bash
# Link the CLI to the live project (prompts for the DB password / access token).
npx supabase link --project-ref rivfogygicrhkpfkwmlu

# Restore a full historical migration baseline (human-only; see migrations/README.md).
npx supabase db pull

# Deploy a function from this directory.
npx supabase functions deploy verify-catch
npx supabase functions deploy gallery-feed
npx supabase functions deploy delete-account

# Function secrets (service role key, etc.) are set per environment, never committed.
npx supabase secrets set --env-file .env.local
```

## Contracts

### Gallery pagination cursor

`gallery-feed` paginates on **`(verdict_at, id)`**, newest first. It does *not* use
`(caught_at, id)`: `catches` has no `caught_at` column, and adding one would duplicate
`verdict_at`. Clients treat `next_cursor` as opaque and must not construct cursors themselves.

### Leaderboard tie-break

`get_leaderboard('state')` orders by period XP, then by **when the final period score was first
reached**, then lifetime XP, username and user id. The reach time is computed from running totals,
not from the last event timestamp, so a zero-delta event after the final score cannot change ties.

### Profile writes

`profiles` has no client `UPDATE` policy. Writes go through `update_my_profile`, which only touches
the caller's row and only the player-owned fields (home state, avatar, age/consent stamps). Trust,
XP, level, streaks and username are unreachable from it.

## What is not in this repository

- No `service_role` key, DB password, access token, or project secret.
- No recreated historical migration chain (only forward fixes, once they exist).
