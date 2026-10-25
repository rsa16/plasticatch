import { useRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { colorAt } from '@/components/backdrop';
import { Brand } from '@/constants/theme';

const THUMB_WIDTH = 13;
/** Space between the scrolling content and the thumb. */
const THUMB_GAP = 9;
/** Height of the edge fades drawn over fading panes. */
export const FADE_HEIGHT = 48;

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

type Box = { top: number; height: number };

type ScrollPaneProps = {
  children: ReactNode;
  /** Height of the green thumb; the designs size it per screen. */
  thumbHeight: number;
  /**
   * Blend the pane's top and bottom edges into the backdrop behind it. A fading pane only shows
   * the thumb and fades while its content overflows; the lists keep the thumb at the top when
   * their content fits, so fading is opt-in.
   */
  fade?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

/**
 * A vertical ScrollView with the app's green scroll thumb to its right instead of the platform
 * indicator, and optional fades that match the backdrop behind the pane.
 */
export function ScrollPane({
  children,
  thumbHeight,
  fade = false,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps,
}: ScrollPaneProps) {
  const { height: windowHeight } = useWindowDimensions();
  const boxRef = useRef<ViewInstance>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const scrollY = useSharedValue(0);

  const scrollable = contentHeight > viewportHeight;

  // Window position, not layout position, is what matches the fades to the full-screen backdrop.
  const measure = () => {
    if (!fade) return;
    boxRef.current?.measureInWindow((_x, top, _w, height) => setBox({ top, height }));
  };

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
      ref={boxRef}
      style={[styles.container, style]}
      onLayout={(event) => {
        setViewportHeight(event.nativeEvent.layout.height);
        measure();
      }}
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

      {fade && scrollable && box !== null && (
        <>
          <View
            style={[
              styles.fade,
              styles.fadeTop,
              { experimental_backgroundImage: fadeGradient(box.top / windowHeight, false) },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.fade,
              styles.fadeBottom,
              {
                experimental_backgroundImage: fadeGradient(
                  (box.top + box.height) / windowHeight,
                  true,
                ),
              },
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

/** A solid-to-clear edge fade in the backdrop colour at `fraction` of the way down the window. */
export function fadeGradient(fraction: number, toBottom: boolean) {
  const { r, g, b } = colorAt(fraction);
  const solid = `rgba(${r}, ${g}, ${b}, 1)`;
  const clear = `rgba(${r}, ${g}, ${b}, 0)`;
  return `linear-gradient(to bottom, ${toBottom ? clear : solid}, ${toBottom ? solid : clear})`;
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
  // The fades cover the scrolling content only, not the thumb's column.
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
});
