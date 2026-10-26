/**
 * The avatar contract shared with `update_my_profile`.
 *
 * A profile stores exactly `{ hair, skin, shirt }`; each value is a preset id matching the
 * server's `^[a-z0-9_]+$` rule. There is deliberately no free-form builder: every value the
 * picker can produce comes from this catalogue.
 */

/** The item slots the RPC accepts. Order is the picker's tab order. */
export const AVATAR_PARTS = ['hair', 'skin', 'shirt'] as const;

export type AvatarPart = (typeof AVATAR_PARTS)[number];

/** One selectable preset. `id` is what goes into the stored JSON; `label` is for screen readers. */
export type AvatarPreset = {
  id: string;
  label: string;
};

/** A complete selection: one preset per slot. */
export type AvatarSelection = Record<AvatarPart, string>;

export const HAIR_PRESETS: readonly AvatarPreset[] = [
  { id: 'hair_1', label: 'Short black hair' },
  { id: 'hair_2', label: 'Short brown hair' },
  { id: 'hair_3', label: 'Short blonde hair' },
  { id: 'hair_4', label: 'Short ginger hair' },
  { id: 'hair_5', label: 'Long black hair' },
  { id: 'hair_6', label: 'Long brown hair' },
  { id: 'hair_7', label: 'Long blonde hair' },
  { id: 'hair_8', label: 'Long ginger hair' },
];

export const SKIN_PRESETS: readonly AvatarPreset[] = [
  { id: 'skin_1', label: 'Very light skin' },
  { id: 'skin_2', label: 'Light skin' },
  { id: 'skin_3', label: 'Medium skin' },
  { id: 'skin_4', label: 'Tan skin' },
  { id: 'skin_5', label: 'Dark skin' },
];

export const SHIRT_PRESETS: readonly AvatarPreset[] = [
  { id: 'shirt_1', label: 'Blue shirt' },
  { id: 'shirt_2', label: 'Green shirt' },
  { id: 'shirt_3', label: 'Red shirt' },
  { id: 'shirt_4', label: 'Yellow shirt' },
  { id: 'shirt_5', label: 'Purple shirt' },
];

/** Every preset, indexed by the stored key it fills. */
export const AVATAR_CATALOGUE: Readonly<Record<AvatarPart, readonly AvatarPreset[]>> = {
  hair: HAIR_PRESETS,
  skin: SKIN_PRESETS,
  shirt: SHIRT_PRESETS,
};

/** What the server assigns to a new profile, and what the app renders before a choice is made. */
export const DEFAULT_AVATAR: AvatarSelection = {
  hair: 'hair_1',
  skin: 'skin_1',
  shirt: 'shirt_1',
};

/** The presets for one slot, in display order. */
export function avatarPresets(part: AvatarPart): readonly AvatarPreset[] {
  return AVATAR_CATALOGUE[part];
}

/** Whether `id` is a preset this slot can store. */
export function isAvatarPreset(part: AvatarPart, id: string | null | undefined): boolean {
  return typeof id === 'string' && AVATAR_CATALOGUE[part].some((preset) => preset.id === id);
}
