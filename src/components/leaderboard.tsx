import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { ThumbScrollView } from '@/components/thumb-scroll-view';
import type { LeaderboardEntry } from '@/constants/leaderboards';
import { Brand } from '@/constants/theme';

type LeaderboardListProps = {
  entries: readonly LeaderboardEntry[];
};

/** Scrollable leaderboard rows with the design's green scroll thumb to the right. */
export function LeaderboardList({ entries }: LeaderboardListProps) {
  return (
    <ThumbScrollView thumbHeight={35} contentContainerStyle={styles.rows}>
      {entries.map((entry) => (
        <LeaderboardRow key={`${entry.rank}-${entry.username}`} entry={entry} />
      ))}
    </ThumbScrollView>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  // The signed-in player's row uses the darker ink.
  const color = entry.isCurrentUser ? 'rowTextStrong' : undefined;

  return (
    <View
      style={[styles.row, entry.isCurrentUser && styles.rowCurrent]}
      accessible
      accessibilityLabel={`Rank ${entry.rank}, ${entry.username}, ${entry.xp} XP`}
    >
      <Text variant="body" color={color} style={styles.rank}>
        {entry.rank}
      </Text>
      <View style={styles.person}>
        <Image
          source={require('@/assets/images/leaderboard-avatar.png')}
          style={styles.avatar}
          contentFit="cover"
        />
        <Text variant="body" color={color} style={styles.username} numberOfLines={1}>
          {entry.username}
        </Text>
      </View>
      <Text variant="body" color={color}>
        {entry.xp} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: 8,
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
