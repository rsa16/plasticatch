import {
  createInMemoryCatchSource,
  orderCatchesNewestFirst,
  toCatchRecord,
  type CatchRecord,
} from '@/features/my-catches';

function record(id: string, caughtAt: Date): CatchRecord {
  return {
    id,
    findPhoto: `${id}-find.jpg`,
    disposePhoto: `${id}-dispose.jpg`,
    caughtAt,
    dateLabel: '7/1/2026',
  };
}

describe('my catches record module', () => {
  it('creates a record with the injected identity and clock', async () => {
    const caughtAt = new Date(2026, 6, 1, 9, 30);
    const source = createInMemoryCatchSource({
      idFactory: () => 'server-id-1',
      clock: () => caughtAt,
    });

    const added = await source.add({ findPhoto: 'find.jpg', disposePhoto: 'dispose.jpg' });

    expect(added).toStrictEqual({
      id: 'server-id-1',
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      caughtAt,
      dateLabel: '7/1/2026',
    });
  });

  it('projects a stored row to the shared date label', () => {
    const row = {
      id: 'server-id-1',
      findPhoto: 'find.jpg',
      disposePhoto: 'dispose.jpg',
      caughtAt: new Date(2026, 6, 1),
    };

    expect(toCatchRecord(row)).toStrictEqual({
      ...row,
      dateLabel: '7/1/2026',
    });
  });
});

describe('catch ordering', () => {
  it('orders catches newest first', () => {
    const older = record('older', new Date(2026, 6, 1, 9, 0));
    const newer = record('newer', new Date(2026, 6, 1, 10, 0));

    expect(orderCatchesNewestFirst([older, newer]).map((item) => item.id)).toStrictEqual([
      'newer',
      'older',
    ]);
  });

  it('keeps the most recently added catch first when timestamps tie', () => {
    const caughtAt = new Date(2026, 6, 1, 10, 0);
    const first = record('first', caughtAt);
    const second = record('second', caughtAt);

    expect(orderCatchesNewestFirst([first, second]).map((item) => item.id)).toStrictEqual([
      'second',
      'first',
    ]);
  });
});

describe('in-memory catch source', () => {
  it('gives two completions distinct identities and lists them newest first', async () => {
    let nextId = 0;
    const times = [new Date(2026, 6, 1, 10, 0), new Date(2026, 6, 1, 10, 1)];
    let nextTime = 0;
    const source = createInMemoryCatchSource({
      idFactory: () => `server-id-${++nextId}`,
      clock: () => times[nextTime++],
    });

    await source.add({ findPhoto: 'find-1.jpg', disposePhoto: 'dispose-1.jpg' });
    await source.add({ findPhoto: 'find-2.jpg', disposePhoto: 'dispose-2.jpg' });

    const catches = await source.list();

    expect(catches.map((item) => item.id)).toStrictEqual(['server-id-2', 'server-id-1']);
    expect(catches.map((item) => item.dateLabel)).toStrictEqual(['7/1/2026', '7/1/2026']);
  });

  it('starts empty', async () => {
    const source = createInMemoryCatchSource();

    await expect(source.list()).resolves.toStrictEqual([]);
  });
});
