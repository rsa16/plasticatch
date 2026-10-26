import { AVATAR_CATALOGUE, AVATAR_PARTS, DEFAULT_AVATAR } from '@/constants/avatar';

describe('avatar catalogue', () => {
  it('offers one preset list per accepted avatar key', () => {
    expect(AVATAR_PARTS).toStrictEqual(['hair', 'skin', 'shirt']);
    for (const part of AVATAR_PARTS) {
      expect(AVATAR_CATALOGUE[part].length).toBeGreaterThan(1);
    }
  });

  it('uses unique preset ids and a non-empty label per slot', () => {
    for (const part of AVATAR_PARTS) {
      const ids = AVATAR_CATALOGUE[part].map((preset) => preset.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const preset of AVATAR_CATALOGUE[part]) {
        expect(preset.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every default value in its own slot', () => {
    for (const part of AVATAR_PARTS) {
      expect(AVATAR_CATALOGUE[part].some((preset) => preset.id === DEFAULT_AVATAR[part])).toBe(
        true,
      );
    }
  });

  it('only offers ids the profile RPC accepts', () => {
    for (const part of AVATAR_PARTS) {
      for (const preset of AVATAR_CATALOGUE[part]) {
        expect(preset.id).toMatch(/^[a-z0-9_]{1,32}$/);
      }
    }
  });
});
