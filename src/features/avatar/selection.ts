import {
  AVATAR_PARTS,
  DEFAULT_AVATAR,
  isAvatarPreset,
  type AvatarPart,
  type AvatarSelection,
} from '@/constants/avatar';

/**
 * Turn whatever the server stored into a complete, renderable selection.
 *
 * The RPC only constrains the keys and value shape, so a profile may hold an unknown preset or
 * a value from another slot. Each slot falls back independently to the default; unknown keys are
 * ignored. Pure so it can be tested without a device.
 */
export function avatarSelectionFrom(
  avatar: Record<string, string> | null | undefined,
): AvatarSelection {
  const selection = { ...DEFAULT_AVATAR };

  for (const part of AVATAR_PARTS) {
    const stored = avatar?.[part];
    if (isAvatarPreset(part, stored)) selection[part] = stored as string;
  }

  return selection;
}

/**
 * Build the exact payload for `update_my_profile(p_avatar)`.
 *
 * Only the three accepted keys are emitted, in a fixed order, and every value is a catalogue
 * preset. This is the single place that decides what the public avatar JSON may contain.
 */
export function avatarStoredFrom(selection: AvatarSelection): AvatarSelection {
  return avatarSelectionFrom(selection);
}

/** Replace one slot when the new value is part of the catalogue. */
export function withAvatarPart(
  selection: AvatarSelection,
  part: AvatarPart,
  id: string,
): AvatarSelection {
  if (!isAvatarPreset(part, id)) return { ...selection };
  return { ...selection, [part]: id };
}

/** Whether two selections would store the same avatar. */
export function sameAvatarSelection(a: AvatarSelection, b: AvatarSelection): boolean {
  return AVATAR_PARTS.every((part) => a[part] === b[part]);
}
