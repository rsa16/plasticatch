/**
 * The catch record module: the one owner of catch identity, time, ordering, and the date label
 * every screen shows.
 *
 * A caught catch is stored as a row whose identity and timestamp are assigned by the source, never
 * by a screen. Screens receive the projected record, which carries the shared label so they never
 * format dates themselves.
 */

/** What a completed catch hands to the record module: the two photos and nothing else. */
export type CatchRecordInput = {
  findPhoto: string;
  disposePhoto: string;
};

/** The stored shape, before the shared date label is projected onto it. */
export type CatchRecordRow = CatchRecordInput & {
  id: string;
  caughtAt: Date;
};

/** A catch as screens render it: identity, both photos, time, and the shared label. */
export type CatchRecord = CatchRecordRow & {
  dateLabel: string;
};

/** Assigns a catch its identity. Injectable so tests do not depend on a random source. */
export type IdFactory = () => string;

/** The current time. Injectable so tests pin `caughtAt`. */
export type Clock = () => Date;

// Identities only need to be unique within one app session; the in-memory source is a prototype
// until the Supabase source replaces it. A counter keeps the module free of `Math.random`.
let nextDefaultId = 0;

/** The production identity source until records move to the server. */
export const defaultIdFactory: IdFactory = () => `catch-${++nextDefaultId}`;

/** The production clock. */
export const defaultClock: Clock = () => new Date();

/**
 * The single date label for a catch. My Catches cards and any other catch surface ask for this
 * instead of calling `toLocaleDateString` themselves.
 */
export function catchDateLabel(caughtAt: Date): string {
  return caughtAt.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Project a stored row into what a screen renders. */
export function toCatchRecord(row: CatchRecordRow): CatchRecord {
  return { ...row, dateLabel: catchDateLabel(row.caughtAt) };
}

/**
 * Insert a just-created catch at the front of a list that is already newest first. This is how the
 * mutation updates the cache before the invalidated query refetches.
 */
export function insertCatchNewest(
  records: readonly CatchRecord[],
  record: CatchRecord,
): CatchRecord[] {
  return [record, ...records];
}

/**
 * Newest first. Records arrive in insertion order, so a timestamp tie keeps the later-inserted
 * catch first; that makes two catches completed in the same millisecond deterministic too.
 */
export function orderCatchesNewestFirst(records: readonly CatchRecord[]): CatchRecord[] {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => b.record.caughtAt.getTime() - a.record.caughtAt.getTime() || b.index - a.index)
    .map(({ record }) => record);
}
