import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
  const textStyle = entry.isCurrentUser ? styles.textStrong : styles.text;

  return (
    <View
      style={[styles.row, entry.isCurrentUser && styles.rowCurrent]}
      accessible
      accessibilityLabel={`Rank ${entry.rank}, ${entry.username}, ${entry.xp} XP`}>
      <ThemedText style={[styles.rowText, textStyle, styles.rank]}>{entry.rank}</ThemedText>
      <View style={styles.person}>
        <Image
          source={require('@/assets/images/leaderboard-avatar.png')}
          style={styles.avatar}
          contentFit="cover"
        />
        <ThemedText style={[styles.rowText, textStyle, styles.username]} numberOfLines={1}>
          {entry.username}
        </ThemedText>
      </View>
      <ThemedText style={[styles.rowText, textStyle]}>{entry.xp} XP</ThemedText>
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
  rowText: {
    fontSize: 14.4,
    lineHeight: 21.6,
    fontWeight: 400,
  },
  text: {
    color: Brand.rowText,
  },
  textStrong: {
    color: Brand.rowTextStrong,
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
