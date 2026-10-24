import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { ScrollPane } from '@/components/scroll-pane';
import { Brand } from '@/constants/theme';
import type { LeaderboardEntry } from '@/features/leaderboard';

type LeaderboardListProps = {
  entries: readonly LeaderboardEntry[];
  /** The viewer's rank, shown even when it is outside `entries`; `null` when there is none. */
  ownRank: number | null;
};

/** Scrollable leaderboard rows plus the viewer's own rank below them. */
export function LeaderboardList({ entries, ownRank }: LeaderboardListProps) {
  return (
    <View style={styles.container}>
      <ScrollPane thumbHeight={35} contentContainerStyle={styles.rows}>
        {entries.length === 0 ? (
          <Text variant="body" style={styles.empty}>
            No rankings yet.
          </Text>
        ) : (
          entries.map((entry) => (
            <LeaderboardRow key={`${entry.rank}-${entry.username}`} entry={entry} />
          ))
        )}
      </ScrollPane>

      {ownRank !== null && <OwnRankRow ownRank={ownRank} />}
    </View>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Rank ${entry.rank}, ${entry.username}, ${entry.xp} XP`}
    >
      <Text variant="body" style={styles.rank}>
        {entry.rank}
      </Text>
      <View style={styles.person}>
        <Image
          source={require('@/assets/images/leaderboard-avatar.png')}
          style={styles.avatar}
          contentFit="cover"
        />
        <Text variant="body" style={styles.username} numberOfLines={1}>
          {entry.username}
        </Text>
      </View>
      <Text variant="body">{entry.xp} XP</Text>
    </View>
  );
}

/** The viewer's own rank, pinned below the visible rows so it is always on screen. */
function OwnRankRow({ ownRank }: { ownRank: number }) {
  return (
    <View
      style={[styles.row, styles.rowCurrent]}
      accessible
      accessibilityLabel={`Your rank ${ownRank}`}
    >
      <Text variant="body" color="rowTextStrong" style={styles.rank}>
        {ownRank}
      </Text>
      <View style={styles.person}>
        <Text variant="body" color="rowTextStrong">
          Your rank
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  rows: {
    gap: 8,
  },
  empty: {
    paddingVertical: 8,
    textAlign: 'center',
  },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 16,
    borderRadius: 12,
    backgroundColor: Brand.field,
  },
  rowCurrent: {
    backgroundColor: Brand.accentMuted,
  },
  // Rank numbers sit centered in a column that ends where the avatar begins.
  rank: {
    width: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowRadius: 13,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 5,
  },
  avatar: {
    width: 32,
    height: 32,
  },
  username: {
    flexShrink: 1,
  },
});
