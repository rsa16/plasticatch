import type { ImageSource } from 'expo-image';

import { avatarHeadSource } from './avatar-source';

/**
 * The head shown when the profile has no avatar, or its parts have no artwork yet.
 *
 * Shared by the header button and the live map marker so both always render the same fallback.
 */
export const DEFAULT_AVATAR_SOURCE: ImageSource = require('@/assets/images/leaderboard-avatar.png');

/**
 * Artwork keyed by a stored avatar part preset. V1 does not ship avatar part art yet — ticket 36
 * adds the picker and its assets — so this map is empty and every stored avatar falls back to the
 * default head. Keeping the lookup here means callers never render a missing asset.
 */
export const AVATAR_ARTWORK: Readonly<Record<string, ImageSource>> = {};

/** The head art for a stored avatar, with the app-wide fallback applied. */
export function storedAvatarHead(avatar: Record<string, string> | null | undefined): ImageSource {
  return avatarHeadSource(avatar, AVATAR_ARTWORK, DEFAULT_AVATAR_SOURCE);
}
