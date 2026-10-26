import { DEFAULT_AVATAR, isAvatarPreset } from '@/constants/avatar';
import {
  avatarSelectionFrom,
  avatarStoredFrom,
  sameAvatarSelection,
  withAvatarPart,
} from '@/features/avatar/selection';

describe('avatarSelectionFrom', () => {
  it('keeps a complete stored selection', () => {
    expect(avatarSelectionFrom({ hair: 'hair_5', skin: 'skin_3', shirt: 'shirt_2' })).toStrictEqual(
      { hair: 'hair_5', skin: 'skin_3', shirt: 'shirt_2' },
    );
  });

  it('uses the default part when the profile has no avatar', () => {
    expect(avatarSelectionFrom(null)).toStrictEqual(DEFAULT_AVATAR);
    expect(avatarSelectionFrom(undefined)).toStrictEqual(DEFAULT_AVATAR);
  });

  it('falls back per part and ignores keys the RPC does not accept', () => {
    expect(
      avatarSelectionFrom({ hair: 'hair_9', skin: 'skin_2', hat: 'hat_1', shirt: 'shirt_4' }),
    ).toStrictEqual({ hair: DEFAULT_AVATAR.hair, skin: 'skin_2', shirt: 'shirt_4' });
  });

  it('defaults a stored part that belongs to another slot', () => {
    expect(avatarSelectionFrom({ hair: 'skin_1' })).toStrictEqual(DEFAULT_AVATAR);
  });
});

describe('avatarStoredFrom', () => {
  it('writes exactly the accepted hair, skin and shirt keys', () => {
    const stored = avatarStoredFrom({ hair: 'hair_4', skin: 'skin_5', shirt: 'shirt_3' });

    expect(stored).toStrictEqual({ hair: 'hair_4', skin: 'skin_5', shirt: 'shirt_3' });
    expect(Object.keys(stored).sort()).toStrictEqual(['hair', 'shirt', 'skin']);
  });

  it('never writes an invalid id', () => {
    expect(avatarStoredFrom({ hair: 'hair_9', skin: 'skin_2', shirt: 'shirt_1' })).toStrictEqual({
      hair: DEFAULT_AVATAR.hair,
      skin: 'skin_2',
      shirt: 'shirt_1',
    });
  });

  it('round-trips a known selection', () => {
    const selection = { hair: 'hair_7', skin: 'skin_4', shirt: 'shirt_5' };

    expect(avatarStoredFrom(avatarSelectionFrom(selection))).toStrictEqual(selection);
  });
});

describe('withAvatarPart', () => {
  it('replaces one part without touching the others', () => {
    expect(withAvatarPart(DEFAULT_AVATAR, 'hair', 'hair_8')).toStrictEqual({
      ...DEFAULT_AVATAR,
      hair: 'hair_8',
    });
  });

  it('ignores an unknown preset', () => {
    expect(withAvatarPart(DEFAULT_AVATAR, 'hair', 'hair_99')).toStrictEqual(DEFAULT_AVATAR);
  });
});

describe('sameAvatarSelection', () => {
  it('compares every part', () => {
    expect(sameAvatarSelection(DEFAULT_AVATAR, { ...DEFAULT_AVATAR })).toBe(true);
    expect(sameAvatarSelection(DEFAULT_AVATAR, { ...DEFAULT_AVATAR, shirt: 'shirt_2' })).toBe(
      false,
    );
  });
});

describe('catalogue integrity', () => {
  it('keeps the default preset in every slot', () => {
    expect(isAvatarPreset('hair', DEFAULT_AVATAR.hair)).toBe(true);
    expect(isAvatarPreset('skin', DEFAULT_AVATAR.skin)).toBe(true);
    expect(isAvatarPreset('shirt', DEFAULT_AVATAR.shirt)).toBe(true);
  });
});
