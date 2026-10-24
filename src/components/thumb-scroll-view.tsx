import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

const THUMB_WIDTH = 13;
/** Space between the scrolling content and the thumb. */
const THUMB_GAP = 9;

type ThumbScrollViewProps = {
  children: ReactNode;
  /** Height of the green thumb; the designs size it per screen. */
  thumbHeight: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

/**
 * A vertical ScrollView with the app's green scroll thumb to its right instead of the platform
 * indicator. The thumb stays at the top when the content fits.
 */
export function ThumbScrollView({
  children,
  thumbHeight,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps,
}: ThumbScrollViewProps) {
  const scrollY = useSharedValue(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  const thumbTravel = Math.max(0, viewportHeight - thumbHeight);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          maxScroll > 0 ? interpolate(scrollY.value, [0, maxScroll], [0, thumbTravel], 'clamp') : 0,
      },
    ],
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={false}
        bounces={maxScroll > 0}
        scrollEventThrottle={16}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onScroll={onScroll}
      >
        {children}
      </Animated.ScrollView>

      <View style={styles.track} pointerEvents="none">
        <Animated.View style={[styles.thumb, { height: thumbHeight }, thumbStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    // Leave room for the thumb, which sits over the right edge of the container.
    marginRight: THUMB_WIDTH + THUMB_GAP,
  },
  track: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: THUMB_WIDTH,
  },
  thumb: {
    width: THUMB_WIDTH,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
});
