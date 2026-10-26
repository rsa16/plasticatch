import type { Board, BoardStandings, Cohort } from './types';

/** Cohorts in the order the arrow controls cycle them; State is the initial board. */
export const COHORTS: readonly Cohort[] = ['state', 'global'];

const COHORT_LABELS: Record<Cohort, Pick<Board, 'title' | 'metricLabel'>> = {
  state: { title: 'State', metricLabel: 'Current-period XP' },
  global: { title: 'Global', metricLabel: 'All-time XP' },
};

/**
 * Builds a cohort's board from already-fetched standings.
 *
 * Pure and synchronous: the ranking RPC has already assigned every rank and ordered every row,
 * so this only labels the cohort and separates the viewer's row from the visible list.
 */
export function board(cohort: Cohort, standings: BoardStandings): Board {
  const { entries, ownRank } = standings;
  // `entries` never contains the viewer: the list renders `ownRank` itself, so keep a source
  // that leaks the viewer's row from showing the same rank twice.
  const visibleEntries =
    ownRank === null ? entries : entries.filter((entry) => entry.rank !== ownRank);

  return { cohort, ...COHORT_LABELS[cohort], entries: visibleEntries, ownRank };
}
