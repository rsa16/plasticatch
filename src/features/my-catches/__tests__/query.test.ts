import { QueryClient } from '@tanstack/react-query';

import {
  createInMemoryCatchSource,
  fetchMyCatches,
  MY_CATCHES_QUERY_KEY,
  recordMyCatch,
  type CatchRecord,
} from '@/features/my-catches';

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function deterministicSource() {
  let nextId = 0;
  const times = [new Date(2026, 6, 1, 10, 0), new Date(2026, 6, 1, 10, 1)];
  let nextTime = 0;
  return createInMemoryCatchSource({
    idFactory: () => `server-id-${++nextId}`,
    clock: () => times[nextTime++],
  });
}

describe('My Catches query contract', () => {
  it('uses one stable query key', () => {
    expect(MY_CATCHES_QUERY_KEY).toStrictEqual(['my-catches']);
  });

  it('reads the source through the query key', async () => {
    const source = deterministicSource();
    await source.add({ findPhoto: 'find.jpg', disposePhoto: 'dispose.jpg' });

    const records = await fetchMyCatches(source);

    expect(records.map((item) => item.id)).toStrictEqual(['server-id-1']);
  });

  it('writes the catch and refreshes the visible list', async () => {
    const queryClient = newQueryClient();
    const source = deterministicSource();
    const cached = await queryClient.fetchQuery({
      queryKey: MY_CATCHES_QUERY_KEY,
      queryFn: () => fetchMyCatches(source),
    });
    expect(cached).toStrictEqual([]);

    const first = await recordMyCatch(queryClient, source, {
      findPhoto: 'find-1.jpg',
      disposePhoto: 'dispose-1.jpg',
    });
    const second = await recordMyCatch(queryClient, source, {
      findPhoto: 'find-2.jpg',
      disposePhoto: 'dispose-2.jpg',
    });

    expect(first.id).toBe('server-id-1');
    expect(second.id).toBe('server-id-2');

    // The cache updates as soon as the write succeeds, before a refetch completes.
    expect(
      (queryClient.getQueryData<CatchRecord[]>(MY_CATCHES_QUERY_KEY) ?? []).map((item) => item.id),
    ).toStrictEqual(['server-id-2', 'server-id-1']);

    // The invalidated query refetches the same list from the source.
    const refreshed = await queryClient.fetchQuery({
      queryKey: MY_CATCHES_QUERY_KEY,
      queryFn: () => fetchMyCatches(source),
    });
    expect(refreshed.map((item) => item.id)).toStrictEqual(['server-id-2', 'server-id-1']);

    queryClient.clear();
  });
});
