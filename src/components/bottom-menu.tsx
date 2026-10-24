import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';

/** Height of the menu bar above the bottom safe-area inset. */
const BAR_HEIGHT = 95;
/** The labels need some room below them on devices without a home indicator. */
const MIN_BOTTOM_INSET = 16;

/** How far the Catch tab rises above the top of the bar. */
export const CATCH_RISE = 52.74;

/** Height of the menu bar itself, not counting the raised Catch tab. */
export function useBottomBarHeight() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM_INSET);
}

/**
 * Total space the menu (including the raised Catch tab) covers at the bottom of the screen, so
 * screens can keep their content clear of it.
 */
export function useBottomMenuHeight() {
  return useBottomBarHeight() + CATCH_RISE;
}

export type BottomMenuItem = 'gallery' | 'map' | 'catch' | 'rank' | 'settings';

type MenuButton = {
  key: Exclude<BottomMenuItem, 'catch'>;
  label: string;
  icon: ImageSource;
  /** Icon size; the icons don't all share the same frame in Figma. */
  size: number;
  /** Space between the icon and its label. */
  labelGap: number;
  /** Extra space above the icon; Rank and Settings sit slightly lower than Gallery and Map. */
  offset?: number;
};

const LEFT_BUTTONS: readonly MenuButton[] = [
  {
    key: 'gallery',
    label: 'Gallery',
    icon: require('@/assets/images/menuIcons/gallery.png'),
    size: 44,
    labelGap: 12,
  },
  {
    key: 'map',
    label: 'Map',
    icon: require('@/assets/images/menuIcons/map.png'),
    size: 42,
    labelGap: 16,
  },
];

const RIGHT_BUTTONS: readonly MenuButton[] = [
  {
    key: 'rank',
    label: 'Rank',
    icon: require('@/assets/images/menuIcons/rank.png'),
    size: 44,
    labelGap: 9,
    offset: 1.8,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: require('@/assets/images/menuIcons/settings.png'),
    size: 44,
    labelGap: 9,
    offset: 1.8,
  },
];

type BottomMenuProps = {
  active: BottomMenuItem;
  /** Called with the tapped item. Items without a screen yet can be ignored. */
  onSelect?: (item: BottomMenuItem) => void;
};

/** The main app menu: Gallery, Map, a raised Catch button, Rank, and Settings. */
export function BottomMenu({ active, onSelect }: BottomMenuProps) {
  const barHeight = useBottomBarHeight();
  const renderButton = (button: MenuButton) => (
    <MenuButtonView
      key={button.key}
      button={button}
      active={button.key === active}
      onPress={() => onSelect?.(button.key)}
    />
  );

  return (
    <View style={[styles.bar, { height: barHeight }]}>
      <View style={styles.group}>{LEFT_BUTTONS.map(renderButton)}</View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Catch"
        accessibilityState={{ selected: active === 'catch' }}
        onPress={() => onSelect?.('catch')}
        style={({ pressed }) => [styles.catchTab, pressed && styles.pressed]}
      >
        <View style={styles.catchButton}>
          <Image
            source={require('@/assets/images/menuIcons/catch-circle.svg')}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
          />
          <Image
            source={require('@/assets/images/menuIcons/catch.png')}
            style={styles.catchIcon}
            tintColor={Brand.accent}
            contentFit="contain"
          />
        </View>
        <ThemedText style={styles.catchLabel}>CATCH</ThemedText>
      </Pressable>

      <View style={styles.group}>{RIGHT_BUTTONS.map(renderButton)}</View>
    </View>
  );
}

function MenuButtonView({
  button,
  active,
  onPress,
}: {
  button: MenuButton;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? Brand.accent : Brand.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={button.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { marginTop: button.offset },
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={button.icon}
        style={{ width: button.size, height: button.size, marginBottom: button.labelGap }}
        tintColor={color}
        contentFit="contain"
      />
      <ThemedText style={[styles.label, { color: active ? Brand.accent : Brand.onSurface }]}>
        {button.label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: Brand.surface,
    boxShadow: '0px -5px 4px 0px rgba(0, 0, 0, 0.25)',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    paddingTop: 24.6,
  },
  button: {
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: 400,
  },
  catchTab: {
    width: 125,
    // Rises above the bar and runs past the bottom edge of the screen.
    marginTop: -CATCH_RISE,
    marginBottom: -6,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 28,
    borderRadius: 15,
    backgroundColor: Brand.catchTab,
    boxShadow:
      '4px 0px 4px 0px rgba(0, 0, 0, 0.25), -4px 0px 4px 0px rgba(0, 0, 0, 0.25), 0px -4px 4px 0px rgba(0, 0, 0, 0.25)',
  },
  catchButton: {
    width: 87,
    height: 87,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchIcon: {
    width: 66.7,
    height: 66.7,
  },
  catchLabel: {
    marginTop: 3,
    color: Brand.surface,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: 400,
  },
});
