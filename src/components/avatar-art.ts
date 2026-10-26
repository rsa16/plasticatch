import type { ImageSource } from 'expo-image';

import { isAvatarPreset, type AvatarPart } from '@/constants/avatar';
import { avatarSelectionFrom } from '@/features/avatar/selection';

/**
 * The neutral head shown only when even the default preset has no artwork.
 *
 * Every real avatar resolves through the layered catalogue below, so this is a last-resort
 * guard rather than the normal render.
 */
export const DEFAULT_AVATAR_SOURCE: ImageSource = require('@/assets/images/leaderboard-avatar.png');

/**
 * Artwork keyed by preset id. Each asset is a transparent 1:1 layer: shirt background first,
 * skin head and neck above it, hair on top.
 */
export const AVATAR_ARTWORK: Readonly<Record<string, ImageSource>> = {
  hair_1: require('@/assets/images/avatar/hair_male_black.png'),
  hair_2: require('@/assets/images/avatar/hair_male_brown.png'),
  hair_3: require('@/assets/images/avatar/hair_male_blonde.png'),
  hair_4: require('@/assets/images/avatar/hair_male_ginger.png'),
  hair_5: require('@/assets/images/avatar/hair_female_black.png'),
  hair_6: require('@/assets/images/avatar/hair_female_brown.png'),
  hair_7: require('@/assets/images/avatar/hair_female_blonde.png'),
  hair_8: require('@/assets/images/avatar/hair_female_ginger.png'),
  skin_1: require('@/assets/images/avatar/skin_1_very_light.png'),
  skin_2: require('@/assets/images/avatar/skin_2_light.png'),
  skin_3: require('@/assets/images/avatar/skin_3_medium.png'),
  skin_4: require('@/assets/images/avatar/skin_4_tan.png'),
  skin_5: require('@/assets/images/avatar/skin_5_dark.png'),
  shirt_1: require('@/assets/images/avatar/shirt_bg_blue.png'),
  shirt_2: require('@/assets/images/avatar/shirt_bg_green.png'),
  shirt_3: require('@/assets/images/avatar/shirt_bg_red.png'),
  shirt_4: require('@/assets/images/avatar/shirt_bg_yellow.png'),
  shirt_5: require('@/assets/images/avatar/shirt_bg_purple.png'),
};

/** The three art layers of one head, in paint order. */
export type AvatarHeadArtwork = Record<AvatarPart, ImageSource>;

/** Artwork for one catalogue preset, or `null` when the asset is missing or foreign to the slot. */
export function avatarPartSource(part: AvatarPart, id: string): ImageSource | null {
  if (!isAvatarPreset(part, id)) return null;
  return AVATAR_ARTWORK[id] ?? null;
}

/**
 * Resolve a stored avatar to its three layers.
 *
 * A missing or unknown stored part falls back to the default preset for that slot. `null` means
 * even the fallback preset has no art, so the caller should render `DEFAULT_AVATAR_SOURCE`.
 */
export function avatarHeadLayers(
  avatar: Record<string, string> | null | undefined,
): AvatarHeadArtwork | null {
  const selection = avatarSelectionFrom(avatar);

  const layers = {
    shirt: AVATAR_ARTWORK[selection.shirt],
    skin: AVATAR_ARTWORK[selection.skin],
    hair: AVATAR_ARTWORK[selection.hair],
  };

  if (!layers.shirt || !layers.skin || !layers.hair) return null;

  return layers;
}
