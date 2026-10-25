import {
  defaultClock,
  defaultIdFactory,
  orderCatchesNewestFirst,
  toCatchRecord,
  type CatchRecord,
  type CatchRecordInput,
  type CatchRecordRow,
  type Clock,
  type IdFactory,
} from './record';

/**
 * Where catch records come from. The in-memory adapter backs this prototype; a Supabase adapter
 * can implement the same two methods later without changing the screen or its query.
 */
export type CatchRecordSource = {
  list: () => Promise<CatchRecord[]>;
  add: (input: CatchRecordInput) => Promise<CatchRecord>;
};

export type InMemoryCatchSourceOptions = {
  idFactory?: IdFactory;
  clock?: Clock;
};

/**
 * An in-memory catch source. It owns identity and `caughtAt`, stores insertion order, and returns
 * projected records newest first. Tests inject the identity factory and clock.
 */
export function createInMemoryCatchSource({
  idFactory = defaultIdFactory,
  clock = defaultClock,
}: InMemoryCatchSourceOptions = {}): CatchRecordSource {
  const rows: CatchRecordRow[] = [];

  return {
    async list() {
      return orderCatchesNewestFirst(rows.map(toCatchRecord));
    },

    async add(input) {
      const row: CatchRecordRow = {
        id: idFactory(),
        caughtAt: clock(),
        findPhoto: input.findPhoto,
        disposePhoto: input.disposePhoto,
      };
      rows.push(row);
      return toCatchRecord(row);
    },
  };
}

/** The app's single record source, shared by the My Catches query and the completion mutation. */
export const myCatchesSource = createInMemoryCatchSource();
