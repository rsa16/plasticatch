import type { BoardSource } from './types';

/**
 * The production adapter returns no standings until the backlog leaderboard RPC exists. It never
 * imports fixture data, so a production bundle cannot show mock players or XP.
 */
export const productionSource: BoardSource = () => ({ entries: [], ownRank: null });
