import { avatarHeadSource } from '../avatar-source';

/** Stand-ins for bundled artwork; the component supplies the real asset sources. */
const ART = { uri: 'art://hair_1' };
const FALLBACK = { uri: 'art://default' };

describe('avatarHeadSource', () => {
  it('uses the artwork for a stored avatar preset', () => {
    expect(avatarHeadSource({ hair: 'hair_1', skin: 'skin_1' }, { hair_1: ART }, FALLBACK)).toBe(
      ART,
    );
  });

  it('falls back when the profile has no avatar', () => {
    expect(avatarHeadSource(null, {}, FALLBACK)).toBe(FALLBACK);
    expect(avatarHeadSource(undefined, {}, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when no stored part has artwork', () => {
    expect(avatarHeadSource({ hair: 'hair_9' }, { hair_1: ART }, FALLBACK)).toBe(FALLBACK);
    expect(avatarHeadSource({}, {}, FALLBACK)).toBe(FALLBACK);
  });
});
