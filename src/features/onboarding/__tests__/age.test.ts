import { admit, canContinueOnboarding, MIN_AGE } from '@/features/onboarding/age';

function on(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

describe('age gate', () => {
  it('admits a player who turns 13 today', () => {
    expect(MIN_AGE).toBe(13);
    expect(admit(on(2013, 5, 15), on(2026, 5, 15))).toBe(true);
  });

  it('blocks a player who is one day short of 13', () => {
    expect(admit(on(2013, 5, 16), on(2026, 5, 15))).toBe(false);
  });

  it('blocks a future date of birth', () => {
    expect(admit(on(2026, 5, 16), on(2026, 5, 15))).toBe(false);
  });

  it('admits an older player', () => {
    expect(admit(on(1990, 0, 1), on(2026, 5, 15))).toBe(true);
  });

  it('compares calendar dates only, ignoring the time of day', () => {
    const dob = new Date(2013, 5, 15, 23, 59, 59);
    const today = new Date(2026, 5, 15, 0, 0, 0);
    expect(admit(dob, today)).toBe(true);
  });
});

describe('onboarding gate', () => {
  const today = on(2026, 5, 15);

  it('does not let an unanswered draft continue', () => {
    expect(canContinueOnboarding({ username: '' }, today)).toBe(false);
  });

  it('lets a draft that is exactly 13 continue', () => {
    expect(canContinueOnboarding({ dateOfBirth: on(2013, 5, 15), username: '' }, today)).toBe(true);
  });

  it('does not let a draft one day short of 13 continue', () => {
    expect(canContinueOnboarding({ dateOfBirth: on(2013, 5, 16), username: '' }, today)).toBe(
      false,
    );
  });
});
