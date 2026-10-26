import {
  avatarFromJson,
  mapProfileRow,
  needsOnboarding,
  onboardingStartRoute,
} from '@/features/auth/types';

const row = {
  id: 'user-1',
  username: 'cryptic',
  avatar: { hair: 'hair_1', skin: 'skin_1', shirt: 'shirt_1' },
  home_state: 'CA',
  age_verified_at: '2026-10-01T00:00:00Z',
  terms_accepted_at: '2026-10-01T00:00:00Z',
  terms_version: '2026-10-01',
  privacy_accepted_at: '2026-10-01T00:00:00Z',
  privacy_version: '2026-10-01',
};

describe('mapProfileRow', () => {
  it('maps the stored row onto the profile shape', () => {
    expect(mapProfileRow(row)).toStrictEqual({
      id: 'user-1',
      username: 'cryptic',
      avatar: { hair: 'hair_1', skin: 'skin_1', shirt: 'shirt_1' },
      homeState: 'CA',
      ageVerifiedAt: '2026-10-01T00:00:00Z',
      termsAcceptedAt: '2026-10-01T00:00:00Z',
      termsVersion: '2026-10-01',
      privacyAcceptedAt: '2026-10-01T00:00:00Z',
      privacyVersion: '2026-10-01',
    });
  });

  it('treats a blank home state as unset', () => {
    expect(mapProfileRow({ ...row, home_state: '  ' }).homeState).toBeNull();
  });
});

describe('avatarFromJson', () => {
  it('keeps only string entries', () => {
    expect(avatarFromJson({ hair: 'hair_1', skin: 3, shirt: 'shirt_1' })).toStrictEqual({
      hair: 'hair_1',
      shirt: 'shirt_1',
    });
  });

  it('returns null for anything that is not a populated object', () => {
    expect(avatarFromJson(null)).toBeNull();
    expect(avatarFromJson([])).toBeNull();
    expect(avatarFromJson('hair_1')).toBeNull();
    expect(avatarFromJson({ skin: 3 })).toBeNull();
  });
});

describe('needsOnboarding', () => {
  it('is true without a profile, username or home state', () => {
    expect(needsOnboarding(null)).toBe(true);
    expect(needsOnboarding(mapProfileRow({ ...row, username: null }))).toBe(true);
    expect(needsOnboarding(mapProfileRow({ ...row, home_state: null }))).toBe(true);
    expect(needsOnboarding(mapProfileRow({ ...row, home_state: '  ' }))).toBe(true);
  });

  it('is false once both a username and a home state exist', () => {
    expect(needsOnboarding(mapProfileRow(row))).toBe(false);
  });
});

describe('onboardingStartRoute', () => {
  it('starts at the step the profile is missing', () => {
    expect(onboardingStartRoute(null)).toBe('/profile');
    expect(onboardingStartRoute(mapProfileRow({ ...row, username: null }))).toBe('/profile');
    expect(onboardingStartRoute(mapProfileRow({ ...row, home_state: null }))).toBe('/home-state');
  });
});
