import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth';

import { pinsSource } from './source';
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

/**
 * The map's pin query.
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
