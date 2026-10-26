import {
  DEFAULT_LAYERS,
  layerQueryEnabled,
  toggleSecondaryLayer,
  type LayerState,
} from '../layers';
import { riskRequestArgs, stateScope } from '../viewport';

const VIEWPORT = { west: -75.3, south: 39.9, east: -75.1, north: 40.0 };

describe('secondary layer toggles', () => {
  it('starts with both optional layers off so the core map is unchanged', () => {
    expect(DEFAULT_LAYERS).toEqual({ olm: false, epa: false });
  });

  it('flips only the requested layer and leaves the other alone', () => {
    const olmOn = toggleSecondaryLayer(DEFAULT_LAYERS, 'olm');

    expect(olmOn).toEqual({ olm: true, epa: false });
    expect(toggleSecondaryLayer(olmOn, 'epa')).toEqual({ olm: true, epa: true });
    expect(toggleSecondaryLayer(olmOn, 'olm')).toEqual({ olm: false, epa: false });
  });

  it('does not mutate the previous state', () => {
    const state: LayerState = { olm: false, epa: true };
    const next = toggleSecondaryLayer(state, 'olm');

    expect(next).not.toBe(state);
    expect(state).toEqual({ olm: false, epa: true });
  });
});

describe('layer query gating', () => {
  it('queries only an enabled layer for a signed-in player with a viewport', () => {
    const layers = { olm: true, epa: false };

    expect(layerQueryEnabled(layers, 'olm', 'signed-in', VIEWPORT)).toBe(true);
    expect(layerQueryEnabled(layers, 'epa', 'signed-in', VIEWPORT)).toBe(false);
  });

  it('stays idle before sign-in or before the first viewport', () => {
    const layers = { olm: true, epa: true };

    expect(layerQueryEnabled(layers, 'olm', 'signed-out', VIEWPORT)).toBe(false);
    expect(layerQueryEnabled(layers, 'epa', 'signed-in', null)).toBe(false);
  });

  it('applies the exact My State scope to the risk layer as the pin layers', () => {
    const scope = stateScope(true, 'pa');

    expect(scope).toBe('PA');
    expect(riskRequestArgs(VIEWPORT, scope)).toMatchObject({
      p_west: -75.3,
      p_south: 39.9,
      p_east: -75.1,
      p_north: 40.0,
      p_state_code: 'PA',
    });
    expect(riskRequestArgs(VIEWPORT, stateScope(false, 'PA')).p_state_code).toBeNull();
  });
});
