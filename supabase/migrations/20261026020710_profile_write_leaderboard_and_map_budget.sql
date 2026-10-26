-- 20261026020710_profile_write_leaderboard_and_map_budget.sql
--
-- Forward-only corrective migration for the existing-UI integration run.
-- No historical baseline is recreated here (see supabase/migrations/README.md).
--
-- Contents:
--   1. profiles: consent version columns + a narrow, caller-scoped write RPC.
--   2. get_leaderboard: state board ties break on when the final period score
--      was first reached, not the last event timestamp.
--   3. Performance/security: xp_events.catch_id index; no anon username check.
--   4. Map budget: 90-day decay, then a global 9,900 active-pin cap with a
--      per-state floor. This deactivates rows (is_active = false); nothing is
--      deleted.
--
-- Gallery cursor contract stays (verdict_at, id): there is no caught_at column
-- and adding one would duplicate verdict_at. Recorded in supabase/README.md.

-- ---------------------------------------------------------------------------
-- 1. Consent versions
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists privacy_version text;

alter table public.profiles
  drop constraint if exists profiles_terms_version_len,
  add constraint profiles_terms_version_len
    check (terms_version is null or char_length(terms_version) between 1 and 32),
  drop constraint if exists profiles_privacy_version_len,
  add constraint profiles_privacy_version_len
    check (privacy_version is null or char_length(privacy_version) between 1 and 32);

-- ---------------------------------------------------------------------------
-- 2. Caller-scoped profile write path
-- ---------------------------------------------------------------------------
-- There is deliberately no UPDATE policy on public.profiles. Clients write only
-- these fields, only for themselves, only through this function. Trust score,
-- level, streaks, total_xp and username are not reachable from here.
--
-- The avatar contract matches the live default assigned by
-- ensure_profile_avatar_default(): a preset base plus hair/skin/shirt items.

create or replace function public.update_my_profile(
  p_home_state text default null,
  p_avatar jsonb default null,
  p_age_verified boolean default null,
  p_terms_version text default null,
  p_privacy_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_state text;
  v_avatar_keys text[];
  v_avatar_key text;
  v_avatar_value text;
begin
  if v_user_id is null then
    raise exception 'sign_in_required'
      using errcode = '28000';
  end if;

  if p_home_state is not null then
    v_state := upper(btrim(p_home_state));

    if char_length(v_state) <> 2 or not exists (
      select 1
      from public.us_states as s
      where s.state_code::text = v_state
    ) then
      return jsonb_build_object('success', false, 'code', 'invalid_home_state');
    end if;
  end if;

  if p_avatar is not null then
    if jsonb_typeof(p_avatar) <> 'object'
       or octet_length(p_avatar::text) > 512
       or p_avatar = '{}'::jsonb then
      return jsonb_build_object('success', false, 'code', 'invalid_avatar');
    end if;

    select array_agg(k order by k)
    into v_avatar_keys
    from jsonb_object_keys(p_avatar) as k;

    -- Only the preset base plus the item slots the avatar renderer knows about.
    if v_avatar_keys is null
       or not (v_avatar_keys <@ array['hair', 'skin', 'shirt']::text[]) then
      return jsonb_build_object('success', false, 'code', 'invalid_avatar');
    end if;

    for v_avatar_key, v_avatar_value in
      select e.key, e.value
      from jsonb_each_text(p_avatar) as e(key, value)
    loop
      if v_avatar_value is null
         or char_length(v_avatar_value) < 1
         or char_length(v_avatar_value) > 32
         or v_avatar_value !~ '^[a-z0-9_]+$' then
        return jsonb_build_object('success', false, 'code', 'invalid_avatar');
      end if;
    end loop;
  end if;

  if p_terms_version is not null
     and char_length(btrim(p_terms_version)) not between 1 and 32 then
    return jsonb_build_object('success', false, 'code', 'invalid_terms_version');
  end if;

  if p_privacy_version is not null
     and char_length(btrim(p_privacy_version)) not between 1 and 32 then
    return jsonb_build_object('success', false, 'code', 'invalid_privacy_version');
  end if;

  update public.profiles as p
  set
    home_state = coalesce(v_state, p.home_state),
    avatar = coalesce(p_avatar, p.avatar),
    age_verified_at = case
      when p_age_verified is true then coalesce(p.age_verified_at, now())
      else p.age_verified_at
    end,
    terms_accepted_at = case
      when p_terms_version is not null then now()
      else p.terms_accepted_at
    end,
    terms_version = coalesce(btrim(p_terms_version), p.terms_version),
    privacy_accepted_at = case
      when p_privacy_version is not null then now()
      else p.privacy_accepted_at
    end,
    privacy_version = coalesce(btrim(p_privacy_version), p.privacy_version),
    updated_at = now()
  where p.id = v_user_id;

  if not found then
    return jsonb_build_object('success', false, 'code', 'profile_not_found');
  end if;

  return jsonb_build_object(
    'success', true,
    'home_state', (select p.home_state::text from public.profiles p where p.id = v_user_id),
    'avatar', (select p.avatar from public.profiles p where p.id = v_user_id),
    'age_verified_at', (select p.age_verified_at from public.profiles p where p.id = v_user_id),
    'terms_version', (select p.terms_version from public.profiles p where p.id = v_user_id),
    'privacy_version', (select p.privacy_version from public.profiles p where p.id = v_user_id)
  );
end;
$$;

revoke all on function public.update_my_profile(text, jsonb, boolean, text, text) from public;
revoke all on function public.update_my_profile(text, jsonb, boolean, text, text) from anon;
grant execute on function public.update_my_profile(text, jsonb, boolean, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Security / performance SQL
-- ---------------------------------------------------------------------------

-- Username availability is part of the authenticated sign-up flow. Anonymous
-- callers should not be able to enumerate usernames.
revoke execute on function public.check_username_available(text) from public;
revoke execute on function public.check_username_available(text) from anon;
grant execute on function public.check_username_available(text) to authenticated;

-- xp_events.catch_id is joined on every leaderboard query and was unindexed.
create index if not exists xp_events_catch_id_idx
  on public.xp_events (catch_id);

-- ---------------------------------------------------------------------------
-- 4. Leaderboard: state ties break on when the final period score was reached
-- ---------------------------------------------------------------------------
-- get_leaderboard previously used MAX(occurred_at) as the tie-break, which is
-- the last event of the period, not the moment the player reached their final
-- score. Running totals give the earliest timestamp at which the cumulative
-- period XP first equalled the final period XP.
--
-- Declared order (unchanged):
--   period_xp DESC, score reached first, total_xp DESC, username ASC, user_id ASC.
-- Top 100 plus the viewer's own row, 0-XP players excluded, ISO week in UTC.

create or replace function public.get_leaderboard(
  p_scope text default 'state',
  p_state_code character default null
)
returns table(
  rank bigint,
  user_id uuid,
  username text,
  avatar jsonb,
  home_state character,
  score integer,
  total_xp integer,
  is_viewer boolean
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'extensions'
as $$
declare
  v_viewer uuid := auth.uid();
  v_state char(2);
begin
  if v_viewer is null then
    raise exception 'sign_in_required'
      using errcode = '28000';
  end if;

  if p_scope is null or p_scope not in ('state', 'global') then
    raise exception 'invalid_scope'
      using errcode = '22023';
  end if;

  select coalesce(upper(p_state_code), p.home_state)
  into v_state
  from public.profiles as p
  where p.id = v_viewer;

  if not found then
    raise exception 'profile_not_found'
      using errcode = 'P0002';
  end if;

  if p_scope = 'state' then
    return query
    with viewer as (
      select v_viewer as id, v_state as state_code
    ),
    period_events as (
      select
        e.user_id,
        e.delta,
        e.occurred_at,
        sum(e.delta) over (
          partition by e.user_id
          order by e.occurred_at, e.id
          rows between unbounded preceding and current row
        ) as running_xp,
        sum(e.delta) over (partition by e.user_id) as final_xp
      from public.xp_events as e
      join public.catches as c on c.id = e.catch_id
      cross join viewer as v
      where c.verdict = 'verified'
        and v.state_code is not null
        and e.state_code = v.state_code
        and e.occurred_at >= (
          date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        )
        and e.occurred_at < (
          (date_trunc('week', now() at time zone 'UTC') + interval '1 week')
          at time zone 'UTC'
        )
    ),
    period_scores as (
      select
        pe.user_id,
        max(pe.final_xp)::integer as period_xp,
        min(pe.occurred_at) filter (where pe.running_xp = pe.final_xp)
          as score_reached_at
      from period_events as pe
      group by pe.user_id
      having max(pe.final_xp) > 0
    ),
    eligible as (
      select
        p.id as uid,
        coalesce(p.username::text, 'Player') as uname,
        p.avatar as avatar_json,
        p.home_state as home_st,
        s.period_xp as board_score,
        coalesce(p.total_xp, 0)::integer as lifetime_xp,
        s.score_reached_at
      from period_scores as s
      join public.profiles as p on p.id = s.user_id
    ),
    ranked as (
      select
        row_number() over (
          order by
            board_score desc,
            score_reached_at asc nulls last,
            lifetime_xp desc,
            uname asc,
            uid asc
        ) as rnk,
        eligible.*
      from eligible
    )
    select
      r.rnk,
      r.uid,
      r.uname,
      r.avatar_json,
      r.home_st,
      r.board_score,
      r.lifetime_xp,
      (r.uid = v_viewer)
    from ranked as r
    where r.rnk <= 100 or r.uid = v_viewer
    order by r.rnk;

  else
    return query
    with eligible as (
      select
        p.id as uid,
        coalesce(p.username::text, 'Player') as uname,
        p.avatar as avatar_json,
        p.home_state as home_st,
        coalesce(p.total_xp, 0)::integer as lifetime_xp,
        min(c.verdict_at) as first_verified_at
      from public.profiles as p
      left join public.catches as c
        on c.user_id = p.id
       and c.verdict = 'verified'
      where coalesce(p.total_xp, 0) > 0
      group by
        p.id,
        p.username,
        p.avatar,
        p.home_state,
        p.total_xp
    ),
    ranked as (
      select
        row_number() over (
          order by
            lifetime_xp desc,
            first_verified_at asc nulls last,
            uname asc,
            uid asc
        ) as rnk,
        eligible.*
      from eligible
    )
    select
      r.rnk,
      r.uid,
      r.uname,
      r.avatar_json,
      r.home_st,
      r.lifetime_xp,
      r.lifetime_xp,
      (r.uid = v_viewer)
    from ranked as r
    where r.rnk <= 100 or r.uid = v_viewer
    order by r.rnk;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Map data budget: 90-day decay, then a capped, state-fair active set
-- ---------------------------------------------------------------------------
-- Rule (deterministic, reproducible):
--   a. A pin with an observation older than 90 days is stale and deactivated.
--   b. The floor of 25 newest pins per state is reserved first, inside the
--      budget (not on top of it).
--   c. The remaining budget (9,900 minus the floor) is filled from the newest
--      pins globally.
--   d. Anything still active but outside (b) and (c) is deactivated.
--
-- Rows are never deleted; is_active is the query filter. Ordering is
-- (observed_at desc nulls last, id desc) so reruns select the same set.

update public.litter_pins as p
set is_active = false
where p.is_active
  and p.observed_at is not null
  and p.observed_at < now() - interval '90 days';

with active_ranked as (
  select
    p.id,
    p.state_code,
    p.observed_at,
    row_number() over (
      partition by p.state_code
      order by p.observed_at desc nulls last, p.id desc
    ) as state_rank
  from public.litter_pins as p
  where p.is_active
),
floor_rows as (
  select ar.id
  from active_ranked as ar
  where ar.state_rank <= 25
),
floor_count as (
  select count(*) as n from floor_rows
),
fill as (
  select x.id
  from (
    select
      ar.id,
      row_number() over (
        order by ar.observed_at desc nulls last, ar.id desc
      ) as rn
    from active_ranked as ar
    where ar.state_rank > 25
  ) as x
  cross join floor_count as fc
  where x.rn <= 9900 - fc.n
),
keep as (
  select id from floor_rows
  union
  select id from fill
)
update public.litter_pins as p
set is_active = false
where p.is_active
  and p.id not in (select k.id from keep as k);
