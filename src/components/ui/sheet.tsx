import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

type SheetProps = {
  children: ReactNode;
  onClose: () => void;
  /** Distance from the bottom of the screen, e.g. above the tab bar. */
  bottom?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** A bottom sheet over a scrim. Used by pin details and the map layer controls. */
export function Sheet({
  children,
  onClose,
  bottom = 0,
  style,
  accessibilityLabel = 'Close',
}: SheetProps) {
  const styles = useStyles();

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={[styles.sheet, { bottom }, style]}>
        <View style={styles.grabber} />
        {children}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: t.color.scrim,
  },
  sheet: {
    position: 'absolute',
    left: t.space.md,
    right: t.space.md,
    maxHeight: '76%',
    gap: t.space.md,
    padding: t.space.xl,
    borderRadius: t.radius.lg,
    borderColor: t.color.line,
    backgroundColor: t.color.surface,
    ...t.elevation.floating,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.line,
  },
}));
