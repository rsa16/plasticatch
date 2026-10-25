import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATCH_RISE, useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { Text } from '@/components/text';
import { ScrollPane } from '@/components/scroll-pane';
import { Spacing } from '@/constants/theme';
import { useMyCatches, type CatchRecord } from '@/features/my-catches';

export default function MyCatchesScreen() {
  const barHeight = useBottomBarHeight();
  const { data: catches = [] } = useMyCatches();

  return (
    <MenuScreen title="MY CATCHES">
      {/* The photos scroll underneath the raised Catch tab, so the list stops at the bar. */}
      <View style={[styles.list, { marginBottom: barHeight }]}>
        {catches.length === 0 ? (
          <View style={[styles.empty, { paddingBottom: CATCH_RISE }]}>
            <Text variant="fieldText" style={styles.emptyText}>
              No catches yet. Tap CATCH to photograph your first piece of litter.
            </Text>
          </View>
        ) : (
          <ScrollPane thumbHeight={49} contentContainerStyle={styles.grid}>
            {catches.map((item) => (
              <CatchCard key={item.id} item={item} />
            ))}
          </ScrollPane>
        )}
      </View>
    </MenuScreen>
  );
}

/** One catch: its two photos stacked with the shared date label underneath. Tap to swap. */
function CatchCard({ item }: { item: CatchRecord }) {
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
        <Image source={{ uri: back }} style={[styles.photo, styles.photoBack]} contentFit="cover" />
        <Image
          source={{ uri: front }}
          style={[styles.photo, styles.photoFront]}
          contentFit="cover"
        />
      </View>
      <Text variant="fieldText" style={styles.date}>
        {item.dateLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    marginTop: 30,
    paddingLeft: 31,
    paddingRight: 9,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Centre the message under the title rather than under the scroll thumb's column.
    marginRight: 22,
  },
  emptyText: {
    maxWidth: 300,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 21,
    paddingBottom: CATCH_RISE + Spacing.three,
  },
  card: {
    width: 155,
    alignItems: 'center',
    gap: 21,
  },
  pressed: {
    opacity: 0.85,
  },
  photoStack: {
    width: 155,
    height: 199,
  },
  photo: {
    position: 'absolute',
    width: 132,
    height: 176,
  },
  photoBack: {
    top: 0,
    left: 23,
  },
  photoFront: {
    top: 23,
    left: 0,
  },
  date: {
    textAlign: 'center',
  },
});
