import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AvatarButton } from '@/components/avatar-button';
import { useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { useMenuTitleTop } from '@/components/screen-frame';

/** The map starts this far below the top of the title pill. */
const MAP_OFFSET = 20;
/** Centre the 44 pt avatar button on the 52 pt title pill. */
const AVATAR_OFFSET = 4;

export default function MapScreen() {
  const titleTop = useMenuTitleTop();
  const barHeight = useBottomBarHeight();

  return (
    <View style={styles.screen}>
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
      <AvatarButton top={titleTop + AVATAR_OFFSET} side="left" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
