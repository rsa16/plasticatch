import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { PlayerChip } from '@/components/player-chip';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useMyCatches, type CatchRecord } from '@/features/my-catches';
import { useTheme } from '@/theme';

export default function GalleryScreen() {
  const theme = useTheme();
  const barHeight = useBottomBarHeight();
  // `useMyCatches` seeds the cache with an empty array while the feed loads, so length alone
  // cannot tell "still fetching" from "genuinely empty". The fetch flag can.
  const { data: catches = [], isError, isFetching, refetch } = useMyCatches();
  const loading = isFetching && catches.length === 0;

  return (
    <Screen title="Gallery" actions={<PlayerChip />}>
      <View style={[styles.list, { marginBottom: barHeight }]}>
        {loading ? (
          <GallerySkeleton />
        ) : isError ? (
          <View style={styles.empty}>
            <Text variant="heading" style={styles.emptyTitle}>
              Couldn&apos;t load your catches
            </Text>
            <Text variant="body" tone="muted" style={styles.emptyText}>
              Your catches are safe. Check your connection and try again.
            </Text>
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => {
                void refetch();
              }}
            />
          </View>
        ) : catches.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="heading" style={styles.emptyTitle}>
              No catches yet
            </Text>
            <Text variant="body" tone="muted" style={styles.emptyText}>
              Tap Catch to photograph your first piece of litter. Verified catches appear here.
            </Text>
          </View>
        ) : (
          <ScrollPane
            thumbHeight={40}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
          >
            {catches.map((item) => (
              <CatchCard key={item.id} item={item} />
            ))}
            <View style={{ width: '100%', height: theme.space.huge }} />
          </ScrollPane>
        )}
      </View>
    </Screen>
  );
}

/**
 * Placeholder cards in the real grid shape, so the screen keeps its layout while the feed loads
 * instead of flashing the empty state.
 */
function GallerySkeleton() {
  const theme = useTheme();
  const block = { backgroundColor: theme.color.surfaceSunken, borderColor: theme.color.bg };

  return (
    <View
      style={styles.grid}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your catches"
      accessibilityLiveRegion="polite"
    >
      {[0, 1, 2, 3].map((slot) => (
        <View key={slot} style={styles.card}>
          <View style={styles.photoStack}>
            <View style={[styles.skeletonPhoto, styles.photoBack, block]} />
            <View style={[styles.skeletonPhoto, styles.photoFront, block]} />
          </View>
          <View style={[styles.skeletonDate, block]} />
        </View>
      ))}
    </View>
  );
}

/** One catch: its two photos stacked with the shared date label underneath. Tap to swap. */
function CatchCard({ item }: { item: CatchRecord }) {
  const theme = useTheme();
  // The litter photo starts in front; the trash-can photo sits behind it.
  const [disposeInFront, setDisposeInFront] = useState(false);
  const front = disposeInFront ? item.disposePhoto : item.findPhoto;
  const back = disposeInFront ? item.findPhoto : item.disposePhoto;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Catch from ${item.dateLabel}`}
      accessibilityHint="Swaps the two photos"
      onPress={() => setDisposeInFront((value) => !value)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.photoStack}>
        <Image
          source={{ uri: back }}
          style={[
            styles.photo,
            styles.photoBack,
            { borderColor: theme.color.surface, backgroundColor: theme.color.surfaceSunken },
          ]}
          contentFit="cover"
        />
        <Image
          source={{ uri: front }}
          style={[
            styles.photo,
            styles.photoFront,
            { borderColor: theme.color.surface, backgroundColor: theme.color.surfaceSunken },
          ]}
          contentFit="cover"
        />
      </View>
      <Text variant="caption" tone="muted" style={styles.date}>
        {item.dateLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 56,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    maxWidth: 300,
    marginBottom: 8,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
    paddingBottom: 24,
  },
  card: {
    width: '48%',
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  photoStack: {
    width: '100%',
    aspectRatio: 0.8,
  },
  photo: {
    position: 'absolute',
    width: '86%',
    height: '86%',
    borderRadius: 12,
  },
  photoBack: {
    top: 0,
    right: 0,
    transform: [{ rotate: '4deg' }],
  },
  photoFront: {
    bottom: 0,
    left: 0,
    transform: [{ rotate: '-3deg' }],
  },
  skeletonPhoto: {
    position: 'absolute',
    width: '86%',
    height: '86%',
    borderRadius: 12,
  },
  skeletonDate: {
    alignSelf: 'center',
    width: '60%',
    height: 12,
    borderRadius: 6,
  },
  date: {
    textAlign: 'center',
  },
});
