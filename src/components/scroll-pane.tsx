import { useState, type ReactNode } from 'react';
import { View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

const THUMB_WIDTH = 4;
const THUMB_GAP = 8;
export const FADE_HEIGHT = 32;

type ThumbOffsetInput = {
  /** How far the content has scrolled, which can sit outside 0…max scroll while bouncing. */
  scrollY: number;
  contentHeight: number;
  viewportHeight: number;
  thumbHeight: number;
};

/**
 * Where the thumb sits in its track, in points from the top: proportional to the scrolled
 * fraction, and clamped so it never leaves the track at either end.
 */
export function thumbOffset({
  scrollY,
  contentHeight,
  viewportHeight,
  thumbHeight,
}: ThumbOffsetInput) {
  'worklet';
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (maxScroll === 0) return 0;
  const travel = Math.max(0, viewportHeight - thumbHeight);
  const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
  return progress * travel;
}

/** A solid-to-clear edge fade in `hex`, for panes that blend into the screen background. */
export function fadeGradient(hex: string, toBottom: boolean) {
  const { r, g, b } = rgb(hex);
  const solid = `rgba(${r}, ${g}, ${b}, 1)`;
  const clear = `rgba(${r}, ${g}, ${b}, 0)`;
  return `linear-gradient(to bottom, ${toBottom ? clear : solid}, ${toBottom ? solid : clear})`;
}

function rgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

type ScrollPaneProps = {
  children: ReactNode;
  /** Height of the accent thumb; the designs size it per screen. */
  thumbHeight: number;
  /** Blend the pane's top and bottom edges into the screen background. */
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

/**
 * A vertical ScrollView with a slim themed thumb instead of the platform indicator, and optional
 * fades that match the background behind the pane.
 */
export function ScrollPane({
  children,
  thumbHeight,
  fade = false,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps,
}: ScrollPaneProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollY = useSharedValue(0);

  const scrollable = contentHeight > viewportHeight;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: thumbOffset({
          scrollY: scrollY.value,
          contentHeight,
          viewportHeight,
          thumbHeight,
        }),
      },
    ],
  }));

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
    >
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={false}
        bounces={scrollable}
        scrollEventThrottle={16}
        onContentSizeChange={(_width, height) => setContentHeight(height)}
        onScroll={onScroll}
      >
        {children}
      </Animated.ScrollView>

      {fade && scrollable && (
        <>
          <View
            style={[
              styles.fade,
              styles.fadeTop,
              { experimental_backgroundImage: fadeGradient(theme.color.bg, false) },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.fade,
              styles.fadeBottom,
              { experimental_backgroundImage: fadeGradient(theme.color.bg, true) },
            ]}
            pointerEvents="none"
          />
        </>
      )}

      {(scrollable || !fade) && (
        <View style={styles.track} pointerEvents="none">
          <Animated.View style={[styles.thumb, { height: thumbHeight }, thumbStyle]} />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
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
    borderRadius: t.radius.pill,
    backgroundColor: t.color.line,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: THUMB_WIDTH + THUMB_GAP,
    height: FADE_HEIGHT,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
}));
