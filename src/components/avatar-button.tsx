import { Image, type ImageSource } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { avatarHeadSource } from '@/components/avatar-source';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';

/** The 44 pt tap target, even though the head itself is the size of a leaderboard avatar. */
const BUTTON_SIZE = 44;
const HEAD_SIZE = 32;

/** The head shown when the profile has no avatar, or its parts have no artwork yet. */
const DEFAULT_AVATAR_SOURCE: ImageSource = require('@/assets/images/leaderboard-avatar.png');

/**
 * Artwork keyed by a stored avatar part preset. V1 does not ship avatar part art yet — ticket 36
 * adds the picker and its assets — so this map is empty and every stored avatar falls back to
 * the default head. Keeping the lookup here means the button never renders a missing asset.
 */
const AVATAR_ARTWORK: Readonly<Record<string, ImageSource>> = {};

type AvatarButtonProps = {
  /** Distance from the top of the screen, so the button lines up with the title pill. */
  top: number;
  /** Which top corner the button sits in. */
  side: 'left' | 'right';
};

/** The header avatar: shows the stored profile avatar and opens Settings. */
export function AvatarButton({ top, side }: AvatarButtonProps) {
  const avatar = useSessionStore((state) => state.profile?.avatar ?? null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      accessibilityHint="Opens your profile and account settings"
      hitSlop={Spacing.two}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [
        styles.button,
        { top },
        side === 'left' ? styles.left : styles.right,
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={avatarHeadSource(avatar, AVATAR_ARTWORK, DEFAULT_AVATAR_SOURCE)}
        style={styles.head}
        contentFit="cover"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    left: Spacing.one,
  },
  right: {
    right: Spacing.one,
  },
  head: {
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
