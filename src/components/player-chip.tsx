import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AvatarHead } from '@/components/avatar-head';
import { Text } from '@/components/text';
import { useSessionStore } from '@/features/auth';
import { makeStyles, useTheme } from '@/theme';

const AVATAR_SIZE = 36;

/**
 * The header player chip: the player's avatar with a level badge. Tapping it opens Settings,
 * which remains the one account surface.
 */
export function PlayerChip() {
  const theme = useTheme();
  const styles = useStyles();
  const profile = useSessionStore((state) => state.profile);
  const level = profile?.level;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={level ? `Level ${level}. Settings` : 'Settings'}
      accessibilityHint="Opens your profile and account settings"
      hitSlop={theme.space.sm}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <AvatarHead avatar={profile?.avatar ?? null} size={AVATAR_SIZE} />
      {level ? (
        <View style={styles.level}>
          <Text variant="caption" tone="inverse" style={styles.levelText}>
            {level}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** A compact streak readout for the Map. */
export function StreakChip({ streak }: { streak: number }) {
  const styles = useStyles();

  return (
    <View style={styles.streak} accessibilityLabel={`${streak} day streak`}>
      <Text variant="caption">🔥</Text>
      <Text variant="caption">{streak}</Text>
      <Text variant="caption" tone="muted">
        {streak === 1 ? 'day' : 'days'}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.color.bg,
    backgroundColor: t.color.brand,
  },
  levelText: {
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: t.radius.pill,
  },
}));
