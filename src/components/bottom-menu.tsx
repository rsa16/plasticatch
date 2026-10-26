import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_LABELS, type BottomMenuItem, type TabMenuItem } from '@/components/bottom-menu-routes';
import { ReadOnlyBanner } from '@/components/read-only-banner';
import { Text } from '@/components/text';
import { MenuIcon } from '@/components/ui/menu-icon';
import {
  deriveReadOnly,
  readOnlyReason,
  recoveryForReadOnly,
} from '@/features/permissions/read-only';
import { useReadOnlyStore } from '@/stores/read-only';
import { makeStyles, useTheme } from '@/theme';

/** Height of the menu bar above the bottom safe-area inset. */
const BAR_HEIGHT = 72;
/** The labels need some room below them on devices without a home indicator. */
const MIN_BOTTOM_INSET = 12;

/** How far the Catch action rises above the top of the bar. */
export const CATCH_RISE = 30;

const ICONS: Record<BottomMenuItem, SymbolViewProps['name']> = {
  'my-catches': { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  leaderboard: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
  catch: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  profile: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
};

/** Height of the menu bar itself, not counting the raised Catch action. */
export function useBottomBarHeight() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, MIN_BOTTOM_INSET);
}

/**
 * Total space the menu (including the raised Catch action) covers at the bottom of the screen, so
 * screens can keep their content clear of it.
 */
export function useBottomMenuHeight() {
  return useBottomBarHeight() + CATCH_RISE;
}

export type { BottomMenuItem } from '@/components/bottom-menu-routes';

type BottomMenuProps = {
  /** The item to highlight, or `undefined` when the current route has no menu item. */
  active?: BottomMenuItem;
  /** Called with the tapped item. */
  onSelect?: (item: BottomMenuItem) => void;
};

/**
 * The main app menu: Gallery, Map, the raised Catch action, Leaderboard and Profile. Two tabs
 * sit either side of the action, so the bar stays balanced.
 */
export function BottomMenu({ active, onSelect }: BottomMenuProps) {
  const theme = useTheme();
  const styles = useStyles();
  const barHeight = useBottomBarHeight();
  const camera = useReadOnlyStore((state) => state.camera);
  const location = useReadOnlyStore((state) => state.location);
  const refresh = useReadOnlyStore((state) => state.refresh);
  const request = useReadOnlyStore((state) => state.request);

  // Re-check whenever the shell mounts and whenever the app returns from the OS Settings app, so
  // a grant made outside the app clears read-only mode without a restart.
  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const readOnly = deriveReadOnly(camera, location);
  const reason = readOnlyReason(readOnly);
  const recovery = recoveryForReadOnly(camera, location, {
    settingsAvailable: Platform.OS !== 'web',
  });
  // Settings has no tab of its own; the banner would only link back to the screen showing it.
  const showBanner = readOnly.readOnly && active !== undefined;

  async function handleCatch() {
    if (!readOnly.readOnly) {
      onSelect?.('catch');
      return;
    }
    // The OS prompt is the first recovery path while it is still allowed. If it is not, the only
    // way back is the Settings app.
    if (recovery === 'settings') {
      void Linking.openSettings();
      return;
    }
    const next = await request();
    if (!deriveReadOnly(next.camera, next.location).readOnly) onSelect?.('catch');
  }

  const tab = (key: Exclude<TabMenuItem, 'catch'>) => (
    <MenuIcon
      key={key}
      label={TAB_LABELS[key]}
      active={key === active}
      onPress={() => onSelect?.(key)}
    >
      <SymbolView
        name={ICONS[key]}
        size={24}
        tintColor={key === active ? theme.color.accent : theme.color.inkMuted}
        weight="semibold"
      />
    </MenuIcon>
  );

  return (
    <View style={[styles.bar, { height: barHeight }]}>
      {showBanner && <ReadOnlyBanner reason={reason} />}

      {/* Five equal slots: four tabs and the raised action, evenly spaced from edge to edge. */}
      <View style={styles.slot}>{tab('my-catches')}</View>
      <View style={styles.slot}>{tab('map')}</View>
      <View style={styles.slot} pointerEvents="none" />

      {/* The raised action is centred on the screen, not on the unequal tab groups. */}
      <View style={styles.catchSlot} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={readOnly.readOnly ? `Catch unavailable. ${reason}` : 'Catch'}
          accessibilityHint={
            readOnly.readOnly
              ? recovery === 'settings'
                ? 'Opens Settings so you can allow camera and location access'
                : 'Asks for camera and location access again'
              : undefined
          }
          // The press remains actionable in read-only mode so the player can re-prompt or open
          // Settings; only the label and hint announce that Catch is unavailable.
          accessibilityState={{ selected: active === 'catch' }}
          onPress={() => {
            void handleCatch();
          }}
          style={({ pressed }) => [
            styles.catchTab,
            readOnly.readOnly && styles.catchTabDisabled,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.catchButton}>
            <SymbolView
              name={ICONS.catch}
              size={28}
              tintColor={theme.color.onAccent}
              weight="semibold"
            />
          </View>
          <Text variant="caption" style={styles.catchLabel}>
            Catch
          </Text>
        </Pressable>
      </View>

      <View style={styles.slot}>{tab('leaderboard')}</View>
      <View style={styles.slot}>{tab('profile')}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: t.space.md,
    paddingTop: t.space.sm,
    backgroundColor: t.color.surface,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
  },
  catchSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -CATCH_RISE,
    alignItems: 'center',
  },
  catchTab: {
    width: 96,
    alignItems: 'center',
    gap: 2,
  },
  catchButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    backgroundColor: t.color.accent,
    ...t.elevation.floating,
  },
  catchLabel: {
    marginTop: 2,
  },
  catchTabDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
}));
