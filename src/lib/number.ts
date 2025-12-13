/**
 * Convert unknown input to a finite number.
 *
 * Useful for Postgres `numeric` values which may arrive as strings depending on
 * PostgREST serialization settings.
 */
export function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;

  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number(value);

  return Number.isFinite(n) ? n : null;
}


