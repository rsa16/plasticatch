import type { Viewport } from './viewport';

/** The two optional Map layers. Debris Tracker is always on and is not part of this state. */
export type SecondaryLayer = 'olm' | 'epa';

export type LayerState = Readonly<Record<SecondaryLayer, boolean>>;

/**
 * Both optional layers start off. The seeded Debris Tracker map is the baseline; OLM and EPA are
 * additive and a disabled layer must never delay or block that baseline.
 */
export const DEFAULT_LAYERS: LayerState = { olm: false, epa: false };

/** Flip one optional layer without mutating the previous state. */
export function toggleSecondaryLayer(state: LayerState, layer: SecondaryLayer): LayerState {
  return { ...state, [layer]: !state[layer] };
}

/**
 * A secondary-layer query runs only when that layer is on, the player is signed in and the map
 * has produced its first viewport. The same predicate gates both optional queries.
 */
export function layerQueryEnabled(
  state: LayerState,
  layer: SecondaryLayer,
  sessionStatus: string,
  viewport: Viewport | null,
): boolean {
  return state[layer] && sessionStatus === 'signed-in' && viewport !== null;
}
