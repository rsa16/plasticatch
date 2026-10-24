import { clampDate, daysInMonth } from '@/features/onboarding/calendar';

function parts(date: Date): [number, number, number] {
  return [date.getFullYear(), date.getMonth(), date.getDate()];
}

describe('calendar helpers', () => {
  it('knows how many days each month has, including leap years', () => {
    expect(daysInMonth(2024, 0)).toBe(31);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2023, 1)).toBe(28);
    expect(daysInMonth(2000, 1)).toBe(29);
    expect(daysInMonth(1900, 1)).toBe(28);
    expect(daysInMonth(2024, 3)).toBe(30);
    expect(daysInMonth(2024, 11)).toBe(31);
  });

  it('clamps 31 January to the end of February', () => {
    expect(parts(clampDate(2023, 1, 31))).toEqual([2023, 1, 28]);
    expect(parts(clampDate(2024, 1, 31))).toEqual([2024, 1, 29]);
  });

  it('clamps a day that the target month does not have', () => {
    expect(parts(clampDate(2023, 2, 31))).toEqual([2023, 2, 31]);
    expect(parts(clampDate(2024, 3, 31))).toEqual([2024, 3, 30]);
  });

  it('keeps a day that exists in the target month', () => {
    expect(parts(clampDate(2024, 0, 15))).toEqual([2024, 0, 15]);
  });
});
