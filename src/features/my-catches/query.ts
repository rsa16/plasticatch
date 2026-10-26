import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth';

import { galleryCatchSource } from './gallery-source';
import { insertCatchNewest, type CatchRecord, type CatchRecordInput } from './record';
import { myCatchesSource, type CatchRecordSource } from './source';

/**
 * The one cache-key prefix for the private catch list. The screen and the completion mutation
 * must read and invalidate this same prefix so a completed catch appears without a reload.
 */
export const MY_CATCHES_QUERY_KEY = ['my-catches'] as const;

/** Which adapter filled the cache: the live owner feed, or the prototype's in-memory list. */
export type MyCatchesMode = 'live' | 'prototype' | 'custom';

export const myCatchesQueryKey = (mode: MyCatchesMode) => [...MY_CATCHES_QUERY_KEY, mode] as const;

/** Read the current records from a source. Used as the query function and by contract tests. */
export function fetchMyCatches(source: CatchRecordSource): Promise<CatchRecord[]> {
  return source.list();
}

/**
 * Write one catch through the prototype source and make it visible immediately, then invalidate
 * the query so the list refreshes from the source.
 *
 * This is the prototype completion path only. Writing a real catch needs the native capture and
 * verification pipeline (ticket 25); a live session never reads these records.
 */
export async function recordMyCatch(
  queryClient: QueryClient,
  source: CatchRecordSource,
  input: CatchRecordInput,
): Promise<CatchRecord> {
  const record = await source.add(input);

  queryClient.setQueryData<CatchRecord[]>(myCatchesQueryKey('prototype'), (current) =>
    insertCatchNewest(current ?? [], record),
  );

  await queryClient.invalidateQueries({ queryKey: MY_CATCHES_QUERY_KEY });

  return record;
}

/** The adapter to read from for this session: live when signed in, prototype otherwise. */
export function sourceForSession(
  signedIn: boolean,
  source?: CatchRecordSource,
): { source: CatchRecordSource; mode: MyCatchesMode } {
  if (source) return { source, mode: 'custom' };
  return signedIn
    ? { source: galleryCatchSource, mode: 'live' }
    : { source: myCatchesSource, mode: 'prototype' };
}

/**
 * The My Catches list. Screens render these records; they do not group or format them.
 *
 * A signed-out client never calls `gallery-feed` and shows the existing empty state. Once signed
 * in, only the live owner feed is read, so no in-memory prototype record can leak into the list.
 */
export function useMyCatches(source?: CatchRecordSource) {
  const status = useSessionStore((state) => state.status);
  const signedIn = status === 'signed-in';
  const { source: resolved, mode } = sourceForSession(signedIn, source);

  return useQuery({
    queryKey: myCatchesQueryKey(mode),
    queryFn: () => fetchMyCatches(resolved),
    enabled: source !== undefined || signedIn,
    placeholderData: [],
  });
}

/** The only write path into My Catches, handed the completed catch by the Catch flow. */
export function useRecordCatch(source: CatchRecordSource = myCatchesSource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatchRecordInput) => recordMyCatch(queryClient, source, input),
  });
}
