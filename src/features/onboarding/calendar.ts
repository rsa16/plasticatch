const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** The number of days in a month, with `month` 0-based like `Date.getMonth()`. */
export function daysInMonth(year: number, month: number): number {
  if (month === 1 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month];
}

/**
 * A local date built from its parts, with the day clamped to the last day of the target month
 * (e.g. 31 January in February becomes the 28th or 29th).
 */
export function clampDate(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
}
