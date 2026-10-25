import { useOnboardingDraftStore } from '@/features/onboarding/draft';

const store = () => useOnboardingDraftStore.getState();

function on(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

describe('onboarding draft store', () => {
  // The store is module-scoped, so each test starts from a clean session.
  beforeEach(() => {
    store().reset();
  });

  it('keeps the date of birth the player chose', () => {
    store().setDateOfBirth(on(2010, 4, 6));

    expect(store().dateOfBirth).toStrictEqual(on(2010, 4, 6));
  });

  it('replaces the username with the latest one the player typed', () => {
    store().setUsername('litterpicker');
    store().setUsername('tidyturtle');

    expect(store().username).toBe('tidyturtle');
  });

  it('keeps both answers when one of them changes', () => {
    store().setDateOfBirth(on(2010, 4, 6));
    store().setUsername('litterpicker');

    expect(store().dateOfBirth).toStrictEqual(on(2010, 4, 6));
    expect(store().username).toBe('litterpicker');
  });

  it('resets every answer so the next session starts clean', () => {
    store().setDateOfBirth(on(2010, 4, 6));
    store().setUsername('litterpicker');

    store().reset();

    expect(store().dateOfBirth).toBeUndefined();
    expect(store().username).toBe('');
  });
});
