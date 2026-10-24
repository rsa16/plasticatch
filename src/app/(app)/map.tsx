import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { useMenuTitleTop } from '@/components/screen-frame';

/** The map starts this far below the top of the title pill. */
const MAP_OFFSET = 20;

export default function MapScreen() {
  const titleTop = useMenuTitleTop();
  const barHeight = useBottomBarHeight();

  return (
    <MenuScreen
      title="MAP"
      background={
        <>
          {/* Static screenshot until a real map with catch clusters is wired up. */}
          <Image
            source={require('@/assets/images/map-placeholder.png')}
            style={[styles.map, { top: titleTop + MAP_OFFSET, bottom: barHeight }]}
            contentFit="cover"
            accessibilityLabel="Map of catches near you"
          />
          <View style={styles.topFade} pointerEvents="none" />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  // The map frame overhangs the screen: 25pt on the left, 34pt on the right.
  map: {
    position: 'absolute',
    left: -25,
    right: -34,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 178,
    experimental_backgroundImage:
      'linear-gradient(to bottom, #82b39e 0%, #f7f8f7 50%, rgba(247, 248, 247, 0) 100%)',
  },
});
