import { Image } from 'expo-image';

/** The trimmed wordmark's aspect ratio, so callers size it by height alone. */
const LOGO_ASPECT = 1162 / 315;

/**
 * The PlastiCatch wordmark, used on the sign-in hero.
 *
 * The artwork is lime on transparent, so it only reads on a dark surface: it sits over the
 * sign-in photo and scrim, never on the light theme's paper background.
 */
export function BrandMark({ height = 48 }: { height?: number }) {
  return (
    <Image
      source={require('@/assets/images/plasticatch_logo.png')}
      style={{ width: Math.round(height * LOGO_ASPECT), height }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="PlastiCatch"
    />
  );
}
