import {
  EMPTY_ONBOARDING_DRAFT,
  onboardingDraftReducer,
  usernameProblem,
  type OnboardingDraft,
} from '@/features/onboarding/draft';

function on(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

describe('onboarding draft', () => {
  it('keeps the date of birth the player chose', () => {
    const draft = onboardingDraftReducer(EMPTY_ONBOARDING_DRAFT, {
      type: 'setDateOfBirth',
      dateOfBirth: on(2010, 4, 6),
    });

    expect(draft.dateOfBirth).toStrictEqual(on(2010, 4, 6));
  });

  it('replaces the username with the latest one the player typed', () => {
    const first = onboardingDraftReducer(EMPTY_ONBOARDING_DRAFT, {
      type: 'setUsername',
      username: 'litterpicker',
    });
    const second = onboardingDraftReducer(first, {
      type: 'setUsername',
      username: 'tidyturtle',
    });

    expect(second.username).toBe('tidyturtle');
  });

  it('keeps both answers when one of them changes', () => {
    const withDate = onboardingDraftReducer(EMPTY_ONBOARDING_DRAFT, {
      type: 'setDateOfBirth',
      dateOfBirth: on(2010, 4, 6),
    });
    const withName = onboardingDraftReducer(withDate, {
      type: 'setUsername',
      username: 'litterpicker',
    });

    expect(withName).toStrictEqual<OnboardingDraft>({
      dateOfBirth: on(2010, 4, 6),
      username: 'litterpicker',
    });
  });

  it('resets every answer', () => {
    const filled: OnboardingDraft = {
      dateOfBirth: on(2010, 4, 6),
      username: 'litterpicker',
    };

    expect(onboardingDraftReducer(filled, { type: 'reset' })).toStrictEqual(EMPTY_ONBOARDING_DRAFT);
  });

  it('does not mutate the draft it is given', () => {
    const draft: OnboardingDraft = { username: 'litterpicker' };

    onboardingDraftReducer(draft, { type: 'setDateOfBirth', dateOfBirth: on(2010, 4, 6) });
    onboardingDraftReducer(draft, { type: 'reset' });

    expect(draft).toStrictEqual<OnboardingDraft>({ username: 'litterpicker' });
  });
});

describe('username admission', () => {
  it('rejects an empty username with a reason', () => {
    expect(usernameProblem('')).toBe('Enter a username.');
  });

  it('rejects a username that is only whitespace', () => {
    expect(usernameProblem('   ')).toBe('Enter a username.');
  });

  it('accepts a username, ignoring surrounding whitespace', () => {
    expect(usernameProblem('litterpicker')).toBeNull();
    expect(usernameProblem('  litterpicker  ')).toBeNull();
  });
});
