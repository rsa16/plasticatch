-- Ticket 42. The public OLM projection must not expose the full third-party feature payload.
--
-- `raw` holds the complete OpenLitterMap GeoJSON feature, which can contain a contributor
-- username and precise coordinates. The viewport RPC never returns it, but a table-level SELECT
-- grant would still let anon/authenticated request `raw` directly through PostgREST.
--
-- Keep the public read surface (map pins, source attribution, decay state) and make `raw`
-- service-role only.

revoke select on public.olm_pins from anon, authenticated;

grant select (
  id,
  source,
  source_id,
  geom,
  observed_at,
  item,
  material,
  quantity,
  confidence,
  verified,
  state_code,
  license,
  attribution,
  is_active,
  ingested_at
) on public.olm_pins to anon, authenticated;

comment on column public.olm_pins.raw is
  'Service-role only: the full third-party feature can contain contributor usernames and precise coordinates.';
