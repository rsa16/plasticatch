import { MAP_PIN_PAGE_LIMIT } from '@/constants/map';

import { fetchOlmViewportPins, fetchViewportPins, type PinsClient } from '../source';
import type { LitterPinRow, OlmPinRow } from '../pin';

const VIEWPORT = { west: -123, south: 45, east: -122, north: 46 };

function row(id: number): LitterPinRow {
  return {
    pin_id: id,
    source: 'debris_tracker',
    source_id: `dt-${id}`,
    longitude: -122.5,
    latitude: 45.5,
    observed_at: `2026-10-01T00:00:${String(id % 60).padStart(2, '0')}Z`,
    item: 'Bottle',
    material: 'PLASTIC',
    quantity: 1,
    confidence: 0.8,
    state_code: 'OR',
    is_active: true,
  };
}

function fakeClient(responses: { data: unknown; error: { message?: string } | null }[]) {
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  const client: PinsClient = {
    rpc(name, params) {
      calls.push({ name, params });
      const response = responses[calls.length - 1] ?? { data: [], error: null };
      return Promise.resolve(response);
    },
  };
  return { client, calls };
}

describe('fetchViewportPins', () => {
  it('requests active pins for the viewport and state scope', async () => {
    const { client, calls } = fakeClient([{ data: [row(1)], error: null }]);

    const page = await fetchViewportPins(client, { viewport: VIEWPORT, stateCode: 'OR' });

    expect(page.pins).toHaveLength(1);
    expect(page.truncated).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('get_litter_pins_in_viewport_v2');
    expect(calls[0].params).toMatchObject({
      p_active_only: true,
      p_state_code: 'OR',
      p_limit: MAP_PIN_PAGE_LIMIT,
      p_before_observed_at: null,
      p_before_id: null,
    });
  });

  it('follows the opaque cursor for a second page and merges unique pins', async () => {
    const firstPage = Array.from({ length: MAP_PIN_PAGE_LIMIT }, (_, index) => row(index + 1));
    const { client, calls } = fakeClient([
      { data: firstPage, error: null },
      { data: [row(MAP_PIN_PAGE_LIMIT + 1)], error: null },
    ]);

    const page = await fetchViewportPins(client, { viewport: VIEWPORT, stateCode: null });

    expect(calls).toHaveLength(2);
    expect(calls[1].params).toMatchObject({
      p_before_observed_at: firstPage[firstPage.length - 1].observed_at,
      p_before_id: MAP_PIN_PAGE_LIMIT,
    });
    expect(page.pins).toHaveLength(MAP_PIN_PAGE_LIMIT + 1);
    expect(page.truncated).toBe(false);
  });

  it('stops at the documented two-page viewport cap and flags truncation', async () => {
    const firstPage = Array.from({ length: MAP_PIN_PAGE_LIMIT }, (_, index) => row(index + 1));
    const secondPage = Array.from({ length: MAP_PIN_PAGE_LIMIT }, (_, index) =>
      row(MAP_PIN_PAGE_LIMIT + index + 1),
    );
    const { client, calls } = fakeClient([
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ]);

    const page = await fetchViewportPins(client, { viewport: VIEWPORT, stateCode: null });

    expect(calls).toHaveLength(2);
    expect(page.pins).toHaveLength(MAP_PIN_PAGE_LIMIT * 2);
    expect(page.truncated).toBe(true);
  });

  it('throws a readable error when the RPC fails', async () => {
    const { client } = fakeClient([{ data: null, error: { message: 'Invalid map bounds' } }]);

    await expect(
      fetchViewportPins(client, { viewport: VIEWPORT, stateCode: null }),
    ).rejects.toThrow('map_pins_failed: Invalid map bounds');
  });

  it('drops rows the map cannot place', async () => {
    const { client } = fakeClient([
      { data: [row(1), { ...row(2), longitude: null }], error: null },
    ]);

    const page = await fetchViewportPins(client, { viewport: VIEWPORT, stateCode: null });

    expect(page.pins.map((pin) => pin.id)).toEqual([1]);
  });
});

function olmRow(id: number): OlmPinRow {
  return {
    ...row(id),
    source: 'openlittermap',
    source_id: `olm-${id}`,
    license: 'ODbL-1.0',
    attribution: 'OpenLitterMap (openlittermap.com), ODbL 1.0',
  };
}

describe('fetchOlmViewportPins', () => {
  it('reads the isolated OLM table with the same bbox, active and state scope', async () => {
    const { client, calls } = fakeClient([{ data: [olmRow(11)], error: null }]);

    const page = await fetchOlmViewportPins(client, { viewport: VIEWPORT, stateCode: 'PA' });

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('get_olm_pins_in_viewport');
    expect(calls[0].params).toMatchObject({
      p_west: -123,
      p_south: 45,
      p_east: -122,
      p_north: 46,
      p_active_only: true,
      p_state_code: 'PA',
      p_limit: MAP_PIN_PAGE_LIMIT,
    });
    expect(page.pins[0]).toMatchObject({
      source: 'openlittermap',
      sourceLabel: 'OpenLitterMap',
      license: 'ODbL-1.0',
    });
  });

  it('follows the same two-page viewport cap as Debris Tracker', async () => {
    const firstPage = Array.from({ length: MAP_PIN_PAGE_LIMIT }, (_, index) => olmRow(index + 1));
    const secondPage = Array.from({ length: MAP_PIN_PAGE_LIMIT }, (_, index) =>
      olmRow(MAP_PIN_PAGE_LIMIT + index + 1),
    );
    const { client, calls } = fakeClient([
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ]);

    const page = await fetchOlmViewportPins(client, { viewport: VIEWPORT, stateCode: null });

    expect(calls).toHaveLength(2);
    expect(page.pins).toHaveLength(MAP_PIN_PAGE_LIMIT * 2);
    expect(page.truncated).toBe(true);
  });

  it('throws a readable error when the OLM RPC fails', async () => {
    const { client } = fakeClient([{ data: null, error: { message: 'Invalid state code' } }]);

    await expect(
      fetchOlmViewportPins(client, { viewport: VIEWPORT, stateCode: 'ZZ' }),
    ).rejects.toThrow('map_olm_pins_failed: Invalid state code');
  });
});
