import {
  avatarFromJson,
  mapProfileRow,
  needsOnboarding,
  onboardingStartRoute,
  postSignInRoute,
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
  total_xp: 245,
  level: 3,
  current_streak: 5,
  username_changed_at: '2026-10-01T00:00:00Z',
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
      totalXp: 245,
      level: 3,
      currentStreak: 5,
      usernameChangedAt: '2026-10-01T00:00:00Z',
    });
  });

  it('treats a blank home state as unset', () => {
    expect(mapProfileRow({ ...row, home_state: '  ' }).homeState).toBeNull();
  });

  it('defaults missing rollups to zero', () => {
    const mapped = mapProfileRow({
      ...row,
      total_xp: null,
      level: null,
      current_streak: null,
    });

    expect(mapped).toMatchObject({ totalXp: 0, level: 0, currentStreak: 0 });
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

describe('postSignInRoute', () => {
  it('sends a complete profile through the entry gate', () => {
    expect(postSignInRoute(mapProfileRow(row))).toBe('/');
  });

  it('resumes onboarding at the first missing step', () => {
    expect(postSignInRoute(null)).toBe('/profile');
    expect(postSignInRoute(mapProfileRow({ ...row, username: null }))).toBe('/profile');
    expect(postSignInRoute(mapProfileRow({ ...row, home_state: null }))).toBe('/home-state');
  });
});
