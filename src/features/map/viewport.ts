/** A longitude/latitude pair in Mapbox's `[lng, lat]` order. */
export type LngLat = [number, number];

/** Mapbox types its positions as `number[]`, so accept that shape at the boundary. */
export type CoordinateLike = readonly number[];

/** The RPC's viewport contract: a west/south/east/north envelope in EPSG:4326. */
export type Viewport = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/**
 * Normalise Mapbox's visible bounds into the RPC's envelope.
 *
 * `MapView.getVisibleBounds()` returns `[[east, north], [west, south]]`, but the order is not
 * guaranteed after rotation, so this takes the min/max on each axis. The RPC rejects
 * `west >= east`, so an antimeridian-crossing viewport cannot be represented and is rejected
 * instead of silently querying the wrong hemisphere.
 */
export function viewportFromVisibleBounds(
  bounds: readonly [CoordinateLike, CoordinateLike] | null | undefined,
): Viewport | null {
  if (!bounds || bounds.length !== 2) return null;

  const [first, second] = bounds;
  if (!isCoordinate(first) || !isCoordinate(second)) return null;

  const west = Math.min(first[0], second[0]);
  const east = Math.max(first[0], second[0]);
  const south = Math.min(first[1], second[1]);
  const north = Math.max(first[1], second[1]);

  // A viewport wider than a hemisphere is either an antimeridian crossing or a zoom level whose
  // envelope the RPC cannot express; skip the query rather than fetching the wrong box.
  if (east - west > 180) return null;

  const viewport = { west, south, east, north };
  return isValidViewport(viewport) ? viewport : null;
}

function isCoordinate(value: CoordinateLike | undefined): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

/** The same guard the RPC applies, mirrored so the client never sends a doomed query. */
export function isValidViewport(viewport: Viewport): boolean {
  return (
    Number.isFinite(viewport.west) &&
    Number.isFinite(viewport.south) &&
    Number.isFinite(viewport.east) &&
    Number.isFinite(viewport.north) &&
    viewport.west >= -180 &&
    viewport.east <= 180 &&
    viewport.south >= -90 &&
    viewport.north <= 90 &&
    viewport.west < viewport.east &&
    viewport.south < viewport.north
  );
}

/**
 * The `p_state_code` argument. My State OFF, a missing home state, or a malformed code all
 * mean "no state restriction", which the RPC spells as NULL.
 */
export function stateScope(
  myStateEnabled: boolean,
  homeState: string | null | undefined,
): string | null {
  if (!myStateEnabled) return null;

  const code = homeState?.trim().toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * The EPA viewport call. It shares the pin envelope and My State contract but has no cursor: the
 * seeded layer is small (138 cells) and returns every intersecting cell up to the RPC cap.
 */
export function riskRequestArgs(
  viewport: Viewport,
  stateCode: string | null,
): Record<string, unknown> {
  return {
    p_west: viewport.west,
    p_south: viewport.south,
    p_east: viewport.east,
    p_north: viewport.north,
    p_state_code: stateCode,
  };
}

export type PinsCursor = {
  observedAt: string;
  id: number;
};

/** One page's arguments. `page` is zero-based; only page 0 has no cursor. */
export function pinsRequestArgs(
  viewport: Viewport,
  stateCode: string | null,
  limit: number,
  cursor?: PinsCursor,
): Record<string, unknown> {
  return {
    p_west: viewport.west,
    p_south: viewport.south,
    p_east: viewport.east,
    p_north: viewport.north,
    p_limit: limit,
    // The acceptance criteria make active-only non-negotiable on every pin query.
    p_active_only: true,
    p_state_code: stateCode,
    p_before_observed_at: cursor?.observedAt ?? null,
    p_before_id: cursor?.id ?? null,
  };
}
