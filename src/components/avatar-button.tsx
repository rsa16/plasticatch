import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { storedAvatarHead } from '@/components/avatar-art';
import { Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';

/** The 44 pt tap target, even though the head itself is the size of a leaderboard avatar. */
const BUTTON_SIZE = 44;
const HEAD_SIZE = 32;

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
      <Image source={storedAvatarHead(avatar)} style={styles.head} contentFit="cover" />
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
