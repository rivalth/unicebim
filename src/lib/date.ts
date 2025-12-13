/**
 * Format a Date as a local date-only string (YYYY-MM-DD).
 *
 * Useful for `<input type="date" />` default values.
 */
export function toLocalYmd(date: Date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}


