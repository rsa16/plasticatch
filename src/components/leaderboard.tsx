import { StyleSheet, View } from 'react-native';

import { AvatarHead } from '@/components/avatar-head';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/chip';
import { Card, Divider } from '@/components/ui/card';
import { useSessionStore } from '@/features/auth';
import type { LeaderboardEntry } from '@/features/leaderboard';
import { useTheme } from '@/theme';

type LeaderboardListProps = {
  entries: readonly LeaderboardEntry[];
  /** The viewer's rank, shown even when it is outside `entries`; `null` when there is none. */
  ownRank: number | null;
  /** The viewer's score for the same cohort, shown on the pinned row. */
  ownXp?: number | null;
};

/** Scrollable leaderboard rows plus the viewer's own rank below them. */
export function LeaderboardList({ entries, ownRank, ownXp }: LeaderboardListProps) {
  return (
    <View style={styles.container}>
      <ScrollPane thumbHeight={32} contentContainerStyle={styles.rows}>
        {entries.length === 0 ? (
          ownRank === null ? (
            <Text variant="body" tone="muted" style={styles.empty}>
              No rankings yet.
            </Text>
          ) : null
        ) : (
          <Card padded={false}>
            {entries.map((entry, index) => (
              <View key={`${entry.rank}-${entry.username}`}>
                {index > 0 && <Divider />}
                <LeaderboardRow entry={entry} />
              </View>
            ))}
          </Card>
        )}
      </ScrollPane>

      {ownRank !== null && <OwnRankRow ownRank={ownRank} ownXp={ownXp} />}
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
      {entry.rank <= 3 ? (
        <Badge label={String(entry.rank)} tone="gold" style={styles.rankBadge} />
      ) : (
        <Text variant="label" tone="muted" style={styles.rank}>
          {entry.rank}
        </Text>
      )}
      <View style={styles.person}>
        <AvatarHead avatar={entry.avatar} size={32} />
        <Text variant="label" style={styles.username} numberOfLines={1}>
          {entry.username}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {entry.xp.toLocaleString()} XP
      </Text>
    </View>
  );
}

/** The viewer's own rank, pinned below the visible rows so it is always on screen. */
function OwnRankRow({ ownRank, ownXp }: { ownRank: number; ownXp?: number | null }) {
  const theme = useTheme();
  const avatar = useSessionStore((state) => state.profile?.avatar ?? null);

  return (
    <View
      style={[styles.row, { backgroundColor: theme.color.accentTint }]}
      accessible
      accessibilityLabel={`Your rank ${ownRank}`}
    >
      <Text variant="label" tone="accent" style={styles.rank}>
        {ownRank}
      </Text>
      <View style={styles.person}>
        <AvatarHead avatar={avatar} size={32} />
        <Text variant="label">You</Text>
      </View>
      {typeof ownXp === 'number' && (
        <Text variant="caption" tone="muted">
          {ownXp.toLocaleString()} XP
        </Text>
      )}
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
    paddingVertical: 16,
    textAlign: 'center',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rankBadge: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    width: 28,
    textAlign: 'center',
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  username: {
    flexShrink: 1,
  },
});
