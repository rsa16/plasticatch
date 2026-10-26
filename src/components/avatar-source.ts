import type { ImageSource } from 'expo-image';

/**
 * Pick the head art for a stored avatar. The profile stores preset part keys (`hair_1`,
 * `skin_1`, …); the first part with artwork wins. Anything missing or unrecognised falls back
 * to the supplied default rather than rendering nothing.
 *
 * Kept free of asset imports so the fallback rules can be tested without the bundler.
 */
export function avatarHeadSource(
  avatar: Record<string, string> | null | undefined,
  artwork: Readonly<Record<string, ImageSource>>,
  fallback: ImageSource,
): ImageSource {
  for (const preset of Object.values(avatar ?? {})) {
    const part = artwork[preset];
    if (part !== undefined) return part;
  }

  return fallback;
}
