import { canSubmitHomeState } from '@/features/onboarding/home-state';

describe('canSubmitHomeState', () => {
  it('stays disabled until a real state is chosen', () => {
    expect(canSubmitHomeState(null)).toBe(false);
    expect(canSubmitHomeState('')).toBe(false);
    expect(canSubmitHomeState('XX')).toBe(false);
    expect(canSubmitHomeState('ca')).toBe(false);
  });

  it('enables Next for an accepted state code', () => {
    expect(canSubmitHomeState('CA')).toBe(true);
    expect(canSubmitHomeState('DC')).toBe(true);
  });
});
