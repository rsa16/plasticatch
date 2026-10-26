import { US_STATES, isUsStateCode, usStateName } from '@/constants/us-states';

describe('US_STATES', () => {
  it('lists the 50 states plus DC', () => {
    expect(US_STATES).toHaveLength(51);
    expect(US_STATES.filter((state) => state.code === 'DC')).toHaveLength(1);
  });

  it('uses unique two-letter codes and no blank names', () => {
    const codes = US_STATES.map((state) => state.code);

    expect(new Set(codes).size).toBe(US_STATES.length);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
    for (const state of US_STATES) expect(state.name.trim()).not.toBe('');
  });

  it('is alphabetised by name', () => {
    const names = US_STATES.map((state) => state.name);
    expect(names).toStrictEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('isUsStateCode', () => {
  it('accepts only listed codes', () => {
    expect(isUsStateCode('CA')).toBe(true);
    expect(isUsStateCode('DC')).toBe(true);
    expect(isUsStateCode('ca')).toBe(false);
    expect(isUsStateCode('XX')).toBe(false);
    expect(isUsStateCode(null)).toBe(false);
    expect(isUsStateCode(undefined)).toBe(false);
  });
});

describe('usStateName', () => {
  it('names a known code and stays null otherwise', () => {
    expect(usStateName('CA')).toBe('California');
    expect(usStateName('DC')).toBe('District of Columbia');
    expect(usStateName('XX')).toBeNull();
    expect(usStateName(null)).toBeNull();
  });
});
