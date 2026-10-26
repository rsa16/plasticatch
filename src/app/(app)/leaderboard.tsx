import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarButton } from '@/components/avatar-button';
import { useBottomMenuHeight } from '@/components/bottom-menu';
import { LeaderboardList } from '@/components/leaderboard';
import { MenuScreen } from '@/components/menu-screen';
import { useMenuTitleTop } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Spacing } from '@/constants/theme';
import {
  COHORTS,
  EMPTY_STANDINGS,
  board as buildBoard,
  useLeaderboard,
  type Cohort,
} from '@/features/leaderboard';

/** Space between the leaderboard and the raised Catch tab. */
const LIST_BOTTOM_GAP = 18;
/** Centre the 44 pt avatar button on the 52 pt title pill. */
const AVATAR_OFFSET = 4;

export default function LeaderboardScreen() {
  const menuHeight = useBottomMenuHeight();
  const titleTop = useMenuTitleTop();
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
    <View style={styles.screen}>
      <MenuScreen title="RANKING">
        <View style={[styles.board, { marginBottom: menuHeight + LIST_BOTTOM_GAP }]}>
          <View style={styles.boardHeader}>
            <Image
              source={require('@/assets/images/ranking-arrows.svg')}
              style={styles.arrows}
              contentFit="fill"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous leaderboard"
              hitSlop={Spacing.two}
              onPress={() => step(-1)}
              style={[styles.arrowHit, styles.arrowHitLeft]}
            />
            <Text variant="sectionTitle" style={styles.boardTitle}>
              {leaderboard.title}
            </Text>
            <Image
              source={require('@/assets/images/ranking-divider.svg')}
              style={styles.divider}
              contentFit="fill"
            />
            <Text variant="caption" color="accent" style={styles.metricLabel}>
              {leaderboard.metricLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next leaderboard"
              hitSlop={Spacing.two}
              onPress={() => step(1)}
              style={[styles.arrowHit, styles.arrowHitRight]}
            />
          </View>

          <LeaderboardList
            key={leaderboard.cohort}
            entries={leaderboard.entries}
            ownRank={leaderboard.ownRank}
            ownXp={leaderboard.ownXp}
          />
        </View>
      </MenuScreen>
      <AvatarButton top={titleTop + AVATAR_OFFSET} side="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  board: {
    flex: 1,
    marginTop: 29,
    paddingLeft: 18,
    paddingRight: 10,
    gap: 29,
  },
  boardHeader: {
    alignSelf: 'center',
    width: 304,
    alignItems: 'center',
  },
  // One SVG holds both chevrons; it overhangs the 304pt header by 2.5pt on each side.
  arrows: {
    position: 'absolute',
    top: 1.09,
    left: -2.5,
    width: 309,
    height: 36.82,
  },
  arrowHit: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 38,
  },
  arrowHitLeft: {
    left: -2.5,
  },
  arrowHitRight: {
    right: -2.5,
  },
  boardTitle: {
    width: 244,
    textAlign: 'center',
  },
  divider: {
    width: 210,
    height: 5,
    marginTop: 4,
  },
  metricLabel: {
    marginTop: 2,
  },
});
