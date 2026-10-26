import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_LABELS, type BottomMenuItem, type TabMenuItem } from '@/components/bottom-menu-routes';
import { Text } from '@/components/text';
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

export type { BottomMenuItem } from '@/components/bottom-menu-routes';

type MenuButton = {
  key: TabMenuItem;
  icon: ImageSource;
  /** Icon size; the icons don't all share the same frame in Figma. */
  size: number;
  /** Space between the icon and its label. */
  labelGap: number;
  /** Extra space above the icon; the Leaderboard item sits slightly lower than the others. */
  offset?: number;
};

const LEFT_BUTTONS: readonly MenuButton[] = [
  {
    key: 'my-catches',
    icon: require('@/assets/images/menuIcons/gallery.png'),
    size: 44,
    labelGap: 12,
  },
  {
    key: 'map',
    icon: require('@/assets/images/menuIcons/map.png'),
    size: 42,
    labelGap: 16,
  },
];

const RIGHT_BUTTONS: readonly MenuButton[] = [
  {
    key: 'leaderboard',
    icon: require('@/assets/images/menuIcons/rank.png'),
    size: 44,
    labelGap: 9,
    offset: 1.8,
  },
];

type BottomMenuProps = {
  /** The item to highlight, or `undefined` when the current route has no menu item. */
  active?: BottomMenuItem;
  /** Called with the tapped item. */
  onSelect?: (item: BottomMenuItem) => void;
};

/** The main app menu: My Catches, Map, a raised Catch button, and Leaderboard. */
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
        <Text variant="buttonLabel" style={styles.catchLabel}>
          CATCH
        </Text>
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
  const label = TAB_LABELS[button.key];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <Text variant="caption" color={active ? 'accent' : undefined} numberOfLines={1}>
        {label}
      </Text>
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
  },
});
