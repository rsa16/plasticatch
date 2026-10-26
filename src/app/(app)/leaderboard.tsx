import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useBottomMenuHeight } from '@/components/bottom-menu';
import { LeaderboardList } from '@/components/leaderboard';
import { PlayerChip } from '@/components/player-chip';
import { Text } from '@/components/text';
import { IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import {
  COHORTS,
  EMPTY_STANDINGS,
  board as buildBoard,
  useLeaderboard,
  type Cohort,
} from '@/features/leaderboard';
import { useTheme } from '@/theme';

/** Space between the leaderboard and the raised Catch action. */
const LIST_BOTTOM_GAP = 16;

export default function LeaderboardScreen() {
  const theme = useTheme();
  const menuHeight = useBottomMenuHeight();
  const [cohort, setCohort] = useState<Cohort>('state');
  // Ranks come from the RPC; the client only labels the cohort and splits the viewer's row.
  const { data } = useLeaderboard(cohort);
  const leaderboard = buildBoard(cohort, data ?? EMPTY_STANDINGS);

  const step = (delta: number) =>
    setCohort((current) => {
      const index = COHORTS.indexOf(current);
      return COHORTS[(index + delta + COHORTS.length) % COHORTS.length] ?? current;
    });

  return (
    <Screen title="Ranking" actions={<PlayerChip />}>
      <View style={[styles.board, { marginBottom: menuHeight + LIST_BOTTOM_GAP }]}>
        <View style={styles.switcher}>
          <IconButton label="Previous leaderboard" onPress={() => step(-1)} surface>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={20}
              tintColor={theme.color.ink}
            />
          </IconButton>

          <View style={styles.heading}>
            <Text variant="heading" accessibilityRole="header" numberOfLines={1}>
              {leaderboard.title}
            </Text>
            <Text variant="caption" tone="muted">
              {leaderboard.metricLabel}
            </Text>
          </View>

          <IconButton label="Next leaderboard" onPress={() => step(1)} surface>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={20}
              tintColor={theme.color.ink}
            />
          </IconButton>
        </View>

        <LeaderboardList
          key={leaderboard.cohort}
          entries={leaderboard.entries}
          ownRank={leaderboard.ownRank}
          ownXp={leaderboard.ownXp}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
});
