import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { avatarHeadLayers, DEFAULT_AVATAR_SOURCE } from '@/components/avatar-art';
import { useTheme } from '@/theme';

type AvatarHeadProps = {
  /** The stored `{ hair, skin, shirt }` object; missing or unknown parts use the default preset. */
  avatar: Record<string, string> | null | undefined;
  /** Square size in points; the head is clipped to a circle. */
  size: number;
  /** Screen-reader label. Omit when a parent already describes the avatar. */
  label?: string;
};

/**
 * The layered avatar head: shirt background, skin, then hair.
 *
 * Every surface that shows an avatar uses this component, so the picker, header, Map marker and
 * leaderboard cannot drift apart. If no layer resolves, it renders the neutral head instead of
 * an empty circle.
 */
export function AvatarHead({ avatar, size, label }: AvatarHeadProps) {
  const theme = useTheme();
  const layers = avatarHeadLayers(avatar);
  const frame = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label === undefined ? undefined : 'image'}
      accessibilityLabel={label}
      style={[styles.frame, frame, { backgroundColor: theme.color.surfaceSunken }]}
    >
      {layers ? (
        <>
          <Image source={layers.shirt} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Image source={layers.skin} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Image source={layers.hair} style={StyleSheet.absoluteFill} contentFit="cover" />
        </>
      ) : (
        <Image source={DEFAULT_AVATAR_SOURCE} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
});
