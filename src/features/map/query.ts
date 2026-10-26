import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth';

import { layerQueryEnabled, type LayerState, type SecondaryLayer } from './layers';
import { olmPinsSource, pinsSource, riskAreasSource } from './source';
import type { Viewport } from './viewport';

/** Round to ~11 m so panning by a few pixels does not create a new cache entry. */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** One cache entry per state scope and viewport. */
export function mapPinsQueryKey(viewport: Viewport | null, stateCode: string | null) {
  return [
    'map-pins',
    stateCode ?? 'global',
    viewport ? round(viewport.west) : null,
    viewport ? round(viewport.south) : null,
    viewport ? round(viewport.east) : null,
    viewport ? round(viewport.north) : null,
  ] as const;
}

/** A separate cache per optional layer so toggling one never invalidates the other. */
export function secondaryLayerQueryKey(
  layer: SecondaryLayer,
  viewport: Viewport | null,
  stateCode: string | null,
) {
  return [
    `map-${layer}-layer`,
    stateCode ?? 'global',
    viewport ? round(viewport.west) : null,
    viewport ? round(viewport.south) : null,
    viewport ? round(viewport.east) : null,
    viewport ? round(viewport.north) : null,
  ] as const;
}

/**
 * The map's Debris Tracker pin query.
 *
 * `keepPreviousData` is the cached-last-viewport rule: while a new viewport loads (or after it
 * fails) the previous pins stay on screen instead of the map going blank. The query only runs
 * for a signed-in player with a valid, non-antimeridian viewport.
 */
export function useMapPins(viewport: Viewport | null, stateCode: string | null) {
  const status = useSessionStore((state) => state.status);

  return useQuery({
    queryKey: mapPinsQueryKey(viewport, stateCode),
    queryFn: () => {
      if (!viewport) throw new Error('map_viewport_missing');
      return pinsSource({ viewport, stateCode });
    },
    enabled: status === 'signed-in' && viewport !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * The OpenLitterMap pin query. It is idle until its own toggle is on, and it reuses the exact
 * `stateCode` computed by the Map screen for Debris Tracker, so My State cannot diverge.
 */
export function useOlmPins(
  viewport: Viewport | null,
  stateCode: string | null,
  layers: LayerState,
) {
  const status = useSessionStore((state) => state.status);

  return useQuery({
    queryKey: secondaryLayerQueryKey('olm', viewport, stateCode),
    queryFn: () => {
      if (!viewport) throw new Error('map_viewport_missing');
      return olmPinsSource({ viewport, stateCode });
    },
    enabled: layerQueryEnabled(layers, 'olm', status, viewport),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  });
}

/** The EPA modeled cell query, gated by the risk toggle and scoped exactly like the pins. */
export function useRiskAreas(
  viewport: Viewport | null,
  stateCode: string | null,
  layers: LayerState,
) {
  const status = useSessionStore((state) => state.status);

  return useQuery({
    queryKey: secondaryLayerQueryKey('epa', viewport, stateCode),
    queryFn: () => {
      if (!viewport) throw new Error('map_viewport_missing');
      return riskAreasSource({ viewport, stateCode });
    },
    enabled: layerQueryEnabled(layers, 'epa', status, viewport),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: 1,
  });
}
