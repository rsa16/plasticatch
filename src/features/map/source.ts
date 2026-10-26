import { MAP_PIN_MAX_PAGES, MAP_PIN_MAX_PINS, MAP_PIN_PAGE_LIMIT } from '@/constants/map';
import { getSupabase } from '@/lib/supabase';

import { mapPinRow, type LitterPinRow, type MapPin, type PinPage } from './pin';
import { mapRiskAreaRow, type RiskAreaRow, type RiskCell } from './risk';
import { pinsRequestArgs, riskRequestArgs, type PinsCursor, type Viewport } from './viewport';

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

/** The slice of the Supabase client this module needs, so tests can supply a fake. */
export type PinsClient = {
  rpc(name: string, params: Record<string, unknown>): PromiseLike<RpcResult>;
};

export type PinQuery = {
  viewport: Viewport;
  stateCode: string | null;
};

function cursorFor(row: LitterPinRow | undefined): PinsCursor | null {
  if (!row?.observed_at) return null;
  const id = Number(row.pin_id);
  return Number.isFinite(id) ? { observedAt: row.observed_at, id } : null;
}

/**
 * The shared viewport page loop for the two ground-truth pin layers.
 *
 * Pages are 500 rows ordered newest-first by the RPC. Two pages (the documented viewport cap of
 * 1,000 pins) keep a zoomed-out map responsive; when both pages are full `truncated` tells the
 * screen it is showing the newest slice rather than everything in view.
 *
 * The RPC name is the only difference between Debris Tracker and OpenLitterMap: both tables have
 * the same pin shape but OLM stays isolated for ODbL share-alike.
 */
async function fetchPinPages(
  client: PinsClient,
  rpcName: string,
  errorCode: string,
  { viewport, stateCode }: PinQuery,
): Promise<PinPage> {
  const pins: MapPin[] = [];
  const seen = new Set<number>();
  let cursor: PinsCursor | undefined;
  let truncated = false;

  for (let page = 0; page < MAP_PIN_MAX_PAGES; page += 1) {
    const { data, error } = await client.rpc(
      rpcName,
      pinsRequestArgs(viewport, stateCode, MAP_PIN_PAGE_LIMIT, cursor),
    );

    if (error) {
      throw new Error(`${errorCode}: ${error.message ?? 'unknown error'}`);
    }

    const rows = Array.isArray(data) ? (data as LitterPinRow[]) : [];

    for (const row of rows) {
      const pin = mapPinRow(row);
      if (pin && !seen.has(pin.id)) {
        seen.add(pin.id);
        pins.push(pin);
      }
    }

    // A short page is the end of the result set.
    if (rows.length < MAP_PIN_PAGE_LIMIT) break;

    cursor = cursorFor(rows[rows.length - 1]) ?? undefined;
    if (!cursor) break;

    // The last allowed page was full: there is more, but it is beyond the viewport cap.
    if (page === MAP_PIN_MAX_PAGES - 1) truncated = true;
  }

  return { pins: pins.slice(0, MAP_PIN_MAX_PINS), truncated };
}

/** Fetch active Debris Tracker pins in a viewport. */
export function fetchViewportPins(client: PinsClient, query: PinQuery): Promise<PinPage> {
  return fetchPinPages(client, 'get_litter_pins_in_viewport_v2', 'map_pins_failed', query);
}

/** Fetch active OpenLitterMap pins from their isolated ODbL table. */
export function fetchOlmViewportPins(client: PinsClient, query: PinQuery): Promise<PinPage> {
  return fetchPinPages(client, 'get_olm_pins_in_viewport', 'map_olm_pins_failed', query);
}

/** The live pin source used by the Map screen. */
export function pinsSource(query: PinQuery): Promise<PinPage> {
  return fetchViewportPins(getSupabase(), query);
}

/** The live OLM pin source used by the Map screen's optional layer. */
export function olmPinsSource(query: PinQuery): Promise<PinPage> {
  return fetchOlmViewportPins(getSupabase(), query);
}

/**
 * Fetch the seeded EPA modeled cells intersecting the viewport.
 *
 * The layer is small and non-paginated: one RPC call returns every intersecting cell. It obeys the
 * same My State argument as both pin layers.
 */
export async function fetchRiskAreas(
  client: PinsClient,
  { viewport, stateCode }: PinQuery,
): Promise<RiskCell[]> {
  const { data, error } = await client.rpc(
    'get_risk_areas_in_viewport',
    riskRequestArgs(viewport, stateCode),
  );

  if (error) {
    throw new Error(`map_risk_areas_failed: ${error.message ?? 'unknown error'}`);
  }

  const rows = Array.isArray(data) ? (data as RiskAreaRow[]) : [];
  const cells: RiskCell[] = [];
  const seen = new Set<number>();

  for (const row of rows) {
    const cell = mapRiskAreaRow(row);
    if (cell && !seen.has(cell.id)) {
      seen.add(cell.id);
      cells.push(cell);
    }
  }

  return cells;
}

/** The live risk-cell source used by the Map screen's optional layer. */
export function riskAreasSource(query: PinQuery): Promise<RiskCell[]> {
  return fetchRiskAreas(getSupabase(), query);
}
