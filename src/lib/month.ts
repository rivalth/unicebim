/**
 * Month range helpers (UTC).
 *
 * The app stores transaction timestamps in UTC and queries by UTC month boundaries.
 */

export type UtcMonthRange = {
  ym: string; // YYYY-MM
  start: Date; // inclusive (UTC)
  end: Date; // exclusive (UTC)
};

export function isYearMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function parseYearMonth(value: string): { year: number; month: number } | null {
  if (!isYearMonth(value)) return null;
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function getUtcMonthRangeStrict(monthParam: string): UtcMonthRange | null {
  const parsed = parseYearMonth(monthParam);
  if (!parsed) return null;
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  const end = new Date(Date.UTC(parsed.year, parsed.month, 1));
  return { ym: monthParam, start, end };
}

export function getUtcMonthRange(monthParam: string | null, now: Date = new Date()): UtcMonthRange {
  if (monthParam) {
    const strict = getUtcMonthRangeStrict(monthParam);
    if (strict) return strict;
  }

  const ym = now.toISOString().slice(0, 7);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { ym, start, end };
}


