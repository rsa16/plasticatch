import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CATCH_RISE, useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { Text } from '@/components/text';
import { ScrollPane } from '@/components/scroll-pane';
import { Spacing } from '@/constants/theme';

// Placeholder catches from the Figma mock until photos are saved from the camera.
const CATCH_DATES = [
  '7/1/2026',
  '7/2/2026',
  '7/2/2026',
  '7/5/2026',
  '7/10/2026',
  '7/10/2026',
  '7/11/2026',
  '7/15/2026',
];

function pairs<T>(items: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / 2) }, (_, i) =>
    items.slice(i * 2, i * 2 + 2),
  );
}

export default function GalleryScreen() {
  const barHeight = useBottomBarHeight();

  return (
    <MenuScreen title="GALLERY">
      {/* The photos scroll underneath the raised Catch tab, so the list stops at the bar. */}
      <View style={[styles.gallery, { marginBottom: barHeight }]}>
        <ScrollPane thumbHeight={49} contentContainerStyle={styles.grid}>
          {pairs(CATCH_DATES).map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((date, c) => (
                <CatchCard key={c} date={date} />
              ))}
            </View>
          ))}
        </ScrollPane>
      </View>
    </MenuScreen>
  );
}

/** A day's catch: two stacked photos with the date underneath. */
function CatchCard({ date }: { date: string }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`Catch from ${date}`}>
      <View style={styles.photoStack}>
        <Image
          source={require('@/assets/images/gallery-photo-back.png')}
          style={[styles.photo, styles.photoBack]}
          contentFit="cover"
        />
        <Image
          source={require('@/assets/images/gallery-photo-front.png')}
          style={[styles.photo, styles.photoFront]}
          contentFit="cover"
        />
      </View>
      <Text variant="fieldText" style={styles.date}>
        {date}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: {
    flex: 1,
    marginTop: 30,
    paddingLeft: 31,
    paddingRight: 9,
  },
  grid: {
    gap: 21,
    paddingBottom: CATCH_RISE + Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: 21,
  },
  card: {
    width: 155,
    alignItems: 'center',
    gap: 21,
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
