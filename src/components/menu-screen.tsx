import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACKDROP_GRADIENT } from '@/components/onboarding';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';

type MenuScreenProps = {
  /** Shown in the green pill at the top of the screen. */
  title: string;
  children?: ReactNode;
  /** Drawn between the backdrop and the content, e.g. a full-bleed map. */
  background?: ReactNode;
};

/** Distance from the top of the screen to the title pill. */
export function useMenuTitleTop() {
  const insets = useSafeAreaInsets();
  // Figma tucks the title 4pt into the status-bar inset.
  return Math.max(insets.top - 4, Spacing.three);
}

/** Shared chrome for the bottom-menu screens: gradient backdrop and the green title pill. */
export function MenuScreen({ title, children, background }: MenuScreenProps) {
  const titleTop = useMenuTitleTop();

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.backdrop} pointerEvents="none" />
      {background}

      <View style={[styles.content, { paddingTop: titleTop }]}>
        <View style={styles.titlePill}>
          <ThemedText style={styles.titleText} accessibilityRole="header">
            {title}
          </ThemedText>
        </View>
        {children}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.surface,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: BACKDROP_GRADIENT,
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
  titleText: {
    color: Brand.surface,
    fontSize: 40,
    lineHeight: 47,
    fontWeight: 400,
  },
});
