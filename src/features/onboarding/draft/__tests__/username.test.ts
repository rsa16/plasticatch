import { usernameProblem } from '@/features/onboarding/draft';

describe('username admission', () => {
  it('rejects an empty username with a reason', () => {
    expect(usernameProblem('')).toBe('Enter a username.');
  });

  it('rejects a username that is only whitespace', () => {
    expect(usernameProblem('   ')).toBe('Enter a username.');
  });

  it('accepts a valid username, ignoring surrounding whitespace', () => {
    expect(usernameProblem('litterpicker')).toBeNull();
    expect(usernameProblem('  litterpicker  ')).toBeNull();
  });
});
