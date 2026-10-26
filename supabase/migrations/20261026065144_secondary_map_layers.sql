-- 20261026065144_secondary_map_layers.sql
--
-- Ticket 33. Additive, forward-only map-layer reads for the two optional layers:
--   1. get_olm_pins_in_viewport  — OpenLitterMap ground truth, read from its own ODbL table.
--   2. get_risk_areas_in_viewport — EPA modeled cells with geometry, density and snapshot.
--   3. import_olm_features       — one-off, service-role seed path (no anon/auth execute).
--
-- All three reads share the Debris Tracker contract: a west/south/east/north envelope plus an
-- optional p_state_code (NULL means global). OLM is never merged into litter_pins, so ODbL
-- share-alike stays confined to olm_pins.
--
-- No historical baseline is recreated here (see supabase/migrations/README.md).

-- ---------------------------------------------------------------------------
-- 1. OpenLitterMap viewport read
-- ---------------------------------------------------------------------------

create or replace function public.get_olm_pins_in_viewport(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 500,
  p_active_only boolean default true,
  p_state_code text default null,
  p_before_observed_at timestamptz default null,
  p_before_id bigint default null
)
returns table(
  pin_id bigint,
  source text,
  source_id text,
  longitude double precision,
  latitude double precision,
  observed_at timestamptz,
  item text,
  material text,
  quantity integer,
  confidence numeric,
  verified integer,
  state_code text,
  license text,
  attribution text,
  is_active boolean
)
language plpgsql
stable
set search_path to 'pg_catalog', 'public', 'extensions', 'pg_temp'
as $$
declare
  v_bounds geometry;
  v_limit integer;
begin
  if p_west is null or p_south is null
     or p_east is null or p_north is null
     or p_west < -180 or p_east > 180
     or p_south < -90 or p_north > 90
     or p_west >= p_east or p_south >= p_north then
    raise exception 'Invalid map bounds';
  end if;

  if (p_before_observed_at is null)
     <> (p_before_id is null) then
    raise exception 'Both pagination cursor values must be provided together';
  end if;

  if nullif(btrim(p_state_code), '') is not null
     and not exists (
       select 1
       from public.us_states us
       where us.state_code = upper(btrim(p_state_code))::char(2)
     ) then
    raise exception 'Invalid state code';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_bounds := st_makeenvelope(p_west, p_south, p_east, p_north, 4326);

  return query
  select
    op.id,
    op.source,
    op.source_id,
    st_x(op.geom::geometry),
    st_y(op.geom::geometry),
    op.observed_at,
    op.item,
    op.material,
    op.quantity,
    op.confidence,
    op.verified,
    op.state_code::text,
    op.license,
    op.attribution,
    op.is_active
  from public.olm_pins op
  where op.geom is not null
    and op.observed_at is not null
    and st_intersects(op.geom, v_bounds::geography)
    and st_x(op.geom::geometry) between p_west and p_east
    and st_y(op.geom::geometry) between p_south and p_north
    and (
      not coalesce(p_active_only, true)
      or op.is_active = true
    )
    and (
      nullif(btrim(p_state_code), '') is null
      or op.state_code = upper(btrim(p_state_code))::char(2)
    )
    and (
      p_before_observed_at is null
      or (op.observed_at, op.id) < (p_before_observed_at, p_before_id)
    )
  order by op.observed_at desc, op.id desc
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. EPA modeled risk viewport read
-- ---------------------------------------------------------------------------
-- The layer is small (138 cells in the demo seed) and has no cursor. Geometry is returned as
-- GeoJSON so the client can render one non-interactive fill layer. There is no press contract.

create or replace function public.get_risk_areas_in_viewport(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_state_code text default null,
  p_limit integer default 1000
)
returns table(
  risk_id bigint,
  layer text,
  density numeric,
  ci_low numeric,
  ci_high numeric,
  state_code text,
  snapshot_at date,
  attribution text,
  geom jsonb
)
language plpgsql
stable
set search_path to 'pg_catalog', 'public', 'extensions', 'pg_temp'
as $$
declare
  v_bounds geometry;
  v_limit integer;
begin
  if p_west is null or p_south is null
     or p_east is null or p_north is null
     or p_west < -180 or p_east > 180
     or p_south < -90 or p_north > 90
     or p_west >= p_east or p_south >= p_north then
    raise exception 'Invalid map bounds';
  end if;

  if nullif(btrim(p_state_code), '') is not null
     and not exists (
       select 1
       from public.us_states us
       where us.state_code = upper(btrim(p_state_code))::char(2)
     ) then
    raise exception 'Invalid state code';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 1000), 1), 2000);
  v_bounds := st_makeenvelope(p_west, p_south, p_east, p_north, 4326);

  return query
  select
    ra.id,
    ra.layer,
    ra.density,
    ra.ci_low,
    ra.ci_high,
    ra.state_code::text,
    ra.snapshot_at,
    coalesce(
      ra.props ->> 'attribution',
      'U.S. Environmental Protection Agency, Escaped Trash Risk Map, September 2024 snapshot'
    ),
    st_asgeojson(ra.geom)::jsonb
  from public.risk_areas ra
  where ra.geom is not null
    and st_intersects(ra.geom, v_bounds)
    and (
      nullif(btrim(p_state_code), '') is null
      or ra.state_code = upper(btrim(p_state_code))::char(2)
    )
  order by ra.id
  limit v_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. OpenLitterMap seed import (service role only)
-- ---------------------------------------------------------------------------
-- Idempotent on (source, source_id). Flattened fields are supplied by the seed script from
-- summary.tags; state_code is resolved by point-in-polygon against us_states. Rows older than
-- the 90-day decay window are stored but inactive, matching the Debris Tracker import contract.
-- OLM's own `verified` count is preserved.

create or replace function public.import_olm_features(p_features jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'extensions'
as $$
declare
  v_count integer := 0;
  v_input integer := 0;
begin
  if jsonb_typeof(p_features) <> 'array' then
    raise exception 'p_features must be a JSON array';
  end if;

  v_input := jsonb_array_length(p_features);

  if v_input > 10000 then
    raise exception 'Maximum 10000 features per import call';
  end if;

  with input_rows as (
    select *
    from jsonb_to_recordset(p_features) as x(
      source_id text,
      longitude double precision,
      latitude double precision,
      observed_at timestamptz,
      item text,
      material text,
      quantity integer,
      confidence numeric,
      verified integer,
      raw jsonb
    )
  ),
  valid_rows as (
    select *
    from input_rows
    where nullif(btrim(source_id), '') is not null
      and longitude between -180 and 180
      and latitude between -90 and 90
      and longitude is not null
      and latitude is not null
  )
  insert into public.olm_pins (
    source, source_id, geom, observed_at,
    item, material, quantity, confidence, verified, state_code,
    license, attribution, raw, is_active, ingested_at
  )
  select
    'openlittermap',
    v.source_id,
    st_setsrid(st_makepoint(v.longitude, v.latitude), 4326)::geography,
    v.observed_at,
    nullif(v.item, ''),
    nullif(v.material, ''),
    case when v.quantity >= 0 then v.quantity else null end,
    v.confidence,
    v.verified,
    public.resolve_state_code(v.longitude, v.latitude),
    'ODbL-1.0',
    'OpenLitterMap contributors (openlittermap.com), ODbL 1.0',
    coalesce(v.raw, '{}'::jsonb),
    coalesce(v.observed_at >= now() - interval '90 days', true),
    now()
  from valid_rows v
  on conflict (source, source_id) do update set
    geom = excluded.geom,
    observed_at = excluded.observed_at,
    item = excluded.item,
    material = excluded.material,
    quantity = excluded.quantity,
    confidence = excluded.confidence,
    verified = excluded.verified,
    state_code = excluded.state_code,
    license = excluded.license,
    attribution = excluded.attribution,
    raw = excluded.raw,
    is_active = excluded.is_active,
    ingested_at = now();

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'success', true,
    'source', 'openlittermap',
    'received', v_input,
    'inserted_or_updated', v_count
  );
end;
$$;

revoke all on function public.import_olm_features(jsonb) from public;
revoke all on function public.import_olm_features(jsonb) from anon;
revoke all on function public.import_olm_features(jsonb) from authenticated;
grant execute on function public.import_olm_features(jsonb) to service_role;

-- Read RPCs are public like the Debris Tracker viewport read.
grant execute on function public.get_olm_pins_in_viewport(
  double precision, double precision, double precision, double precision,
  integer, boolean, text, timestamptz, bigint
) to anon, authenticated;

grant execute on function public.get_risk_areas_in_viewport(
  double precision, double precision, double precision, double precision,
  text, integer
) to anon, authenticated;
