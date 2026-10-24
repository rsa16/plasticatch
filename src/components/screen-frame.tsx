import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACKDROP_STOPS, gradient, type BackdropStop } from '@/components/backdrop';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';

/** Distance from the top of the screen to the menu title pill. */
export function useMenuTitleTop() {
  const insets = useSafeAreaInsets();
  return menuTitleTop(insets.top);
}

function menuTitleTop(insetTop: number) {
  // Figma tucks the title 4pt into the status-bar inset.
  return Math.max(insetTop - 4, Spacing.three);
}

type ScreenFrameProps = {
  /** Shown in the green pill at the top; omit for screens without one. */
  title?: string;
  children?: ReactNode;
  /** Drawn against the backdrop, e.g. a full-bleed map. */
  background?: ReactNode;
  /** Drawn above the title, e.g. the onboarding progress bar. */
  header?: ReactNode;
  /** Pinned to the bottom of the screen. */
  footer?: ReactNode;
  /** The backdrop's gradient stops. */
  stops?: readonly BackdropStop[];
  /** Safe-area top treatment: menu screens tuck under the inset, steps sit below it. */
  top?: 'menu' | 'step';
  /** Lift the content above the keyboard. */
  keyboardAvoiding?: boolean;
  /**
   * Paint the backdrop over `background` instead of behind it. All Set uses this to tint its
   * map; the menu screens draw their map over the backdrop.
   */
  backdropOverBackground?: boolean;
  /** Extra styles for the padded column that holds the header, title, children and footer. */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * The chrome shared by every full-screen surface: the backdrop, the safe-area top, the title
 * pill, and optional background, header and footer slots.
 */
export function ScreenFrame({
  title,
  children,
  background,
  header,
  footer,
  stops = BACKDROP_STOPS,
  top = 'menu',
  keyboardAvoiding = false,
  backdropOverBackground = false,
  contentStyle,
}: ScreenFrameProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = top === 'step' ? insets.top + Spacing.two : menuTitleTop(insets.top);

  const backdrop = (
    <View
      style={[styles.backdrop, { experimental_backgroundImage: gradient(stops) }]}
      pointerEvents="none"
    />
  );

  const content = (
    <>
      {header}
      {title !== undefined && (
        <View style={styles.titlePill}>
          <Text variant="menuTitle" accessibilityRole="header">
            {title}
          </Text>
        </View>
      )}
      {children}
      {footer}
    </>
  );

  const frameStyle = [styles.content, { paddingTop }, contentStyle];

  return (
    <View style={styles.screen}>
      {!backdropOverBackground && backdrop}
      {background}
      {backdropOverBackground && backdrop}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          // KeyboardAvoidingView owns paddingBottom (it sets it to the keyboard height, 0
          // when hidden), so any footer gap lives on the footer itself.
          style={frameStyle}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={frameStyle}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.surface,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    flex: 1,
  },
  titlePill: {
    alignSelf: 'center',
    width: 305,
    maxWidth: '90%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
});
