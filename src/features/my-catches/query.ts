import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { insertCatchNewest, type CatchRecord, type CatchRecordInput } from './record';
import { myCatchesSource, type CatchRecordSource } from './source';

/**
 * The one cache key for the private catch list. The screen and the completion mutation must read
 * and invalidate this same key so a completed catch appears without a reload.
 */
export const MY_CATCHES_QUERY_KEY = ['my-catches'] as const;

/** Read the current records from a source. Used as the query function and by contract tests. */
export function fetchMyCatches(source: CatchRecordSource): Promise<CatchRecord[]> {
  return source.list();
}

/**
 * Write one catch through the source and make it visible immediately, then invalidate the query so
 * the list refreshes from the source. This is the only path that adds a record.
 */
export async function recordMyCatch(
  queryClient: QueryClient,
  source: CatchRecordSource,
  input: CatchRecordInput,
): Promise<CatchRecord> {
  const record = await source.add(input);

  queryClient.setQueryData<CatchRecord[]>(MY_CATCHES_QUERY_KEY, (current) =>
    insertCatchNewest(current ?? [], record),
  );

  await queryClient.invalidateQueries({ queryKey: MY_CATCHES_QUERY_KEY });

  return record;
}

/** The My Catches list. Screens render these records; they do not group or format them. */
export function useMyCatches(source: CatchRecordSource = myCatchesSource) {
  return useQuery({
    queryKey: MY_CATCHES_QUERY_KEY,
    queryFn: () => fetchMyCatches(source),
  });
}

/** The only write path into My Catches, handed the completed catch by the Catch flow. */
export function useRecordCatch(source: CatchRecordSource = myCatchesSource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatchRecordInput) => recordMyCatch(queryClient, source, input),
  });
}
