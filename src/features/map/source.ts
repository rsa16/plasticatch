import { MAP_PIN_MAX_PAGES, MAP_PIN_MAX_PINS, MAP_PIN_PAGE_LIMIT } from '@/constants/map';
import { getSupabase } from '@/lib/supabase';

import { mapPinRow, type LitterPinRow, type MapPin, type PinPage } from './pin';
import { pinsRequestArgs, type PinsCursor, type Viewport } from './viewport';

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
 * Fetch the active pins in a viewport.
 *
 * Pages are 500 rows ordered newest-first by the RPC. Two pages (the documented viewport cap of
 * 1,000 pins) keep a zoomed-out map responsive; when both pages are full `truncated` tells the
 * screen it is showing the newest slice rather than everything in view.
 */
export async function fetchViewportPins(
  client: PinsClient,
  { viewport, stateCode }: PinQuery,
): Promise<PinPage> {
  const pins: MapPin[] = [];
  const seen = new Set<number>();
  let cursor: PinsCursor | undefined;
  let truncated = false;

  for (let page = 0; page < MAP_PIN_MAX_PAGES; page += 1) {
    const { data, error } = await client.rpc(
      'get_litter_pins_in_viewport_v2',
      pinsRequestArgs(viewport, stateCode, MAP_PIN_PAGE_LIMIT, cursor),
    );

    if (error) {
      throw new Error(`map_pins_failed: ${error.message ?? 'unknown error'}`);
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

/** The live pin source used by the Map screen. */
export function pinsSource(query: PinQuery): Promise<PinPage> {
  return fetchViewportPins(getSupabase(), query);
}
