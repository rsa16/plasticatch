-- Audit trail and rate limit for the verify-photo Edge Function.
--
-- Every call that spends an Anthropic request writes one row here, keyed by the player.
-- The function counts the last 24 hours before calling the model, so a runaway client or a
-- stolen session cannot run up an unbounded bill.
--
-- Only the service role reads or writes this table: RLS is on and no policy is granted, so
-- a signed-in player can neither read other players' rows nor forge their own quota.

create table if not exists public.photo_check_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  step text not null check (step in ('find', 'dispose')),
  outcome text not null check (outcome in ('pass', 'fail', 'error')),
  created_at timestamptz not null default now()
);

comment on table public.photo_check_calls is
  'Per-call audit and 24h rate limit for the verify-photo Edge Function; service role only.';

create index if not exists photo_check_calls_user_time_idx
  on public.photo_check_calls (user_id, created_at desc);

alter table public.photo_check_calls enable row level security;

revoke all on public.photo_check_calls from anon, authenticated;

grant all on public.photo_check_calls to service_role;
