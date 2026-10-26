import { AVATAR_CATALOGUE, AVATAR_PARTS, DEFAULT_AVATAR } from '@/constants/avatar';
import {
  AVATAR_ARTWORK,
  DEFAULT_AVATAR_SOURCE,
  avatarHeadLayers,
  avatarPartSource,
} from '@/components/avatar-art';

describe('avatar artwork', () => {
  it('has real artwork for every preset in the catalogue', () => {
    for (const part of AVATAR_PARTS) {
      for (const preset of AVATAR_CATALOGUE[part]) {
        expect(avatarPartSource(part, preset.id)).not.toBeNull();
        expect(AVATAR_ARTWORK[preset.id]).toBeDefined();
      }
    }
  });

  it('resolves the default stored avatar to all three layers', () => {
    const layers = avatarHeadLayers({ hair: 'hair_1', skin: 'skin_1', shirt: 'shirt_1' });

    expect(layers).not.toBeNull();
    expect(layers?.hair).toBe(AVATAR_ARTWORK[DEFAULT_AVATAR.hair]);
    expect(layers?.skin).toBe(AVATAR_ARTWORK[DEFAULT_AVATAR.skin]);
    expect(layers?.shirt).toBe(AVATAR_ARTWORK[DEFAULT_AVATAR.shirt]);
  });

  it('layers the default head when the stored avatar is missing or unknown', () => {
    expect(avatarHeadLayers(null)).toStrictEqual(avatarHeadLayers(DEFAULT_AVATAR));
    expect(avatarHeadLayers({ hair: 'hair_99' })).toStrictEqual(avatarHeadLayers(DEFAULT_AVATAR));
  });

  it('keeps the neutral fallback separate from every layered preset', () => {
    expect(Object.values(AVATAR_ARTWORK)).not.toContain(DEFAULT_AVATAR_SOURCE);
  });
});
