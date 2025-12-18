import type { Database } from "@/lib/supabase/types";
import { toFiniteNumber } from "@/lib/number";

/**
 * Map a raw profile row from Supabase to a normalized profile object.
 *
 * Handles numeric type coercion for Postgres `numeric` fields which may arrive
 * as strings depending on PostgREST serialization settings.
 *
 * @param row - Raw profile row from Supabase query
 * @returns Normalized profile object with guaranteed numeric types, or null if row is null/undefined
 */
export function mapProfileRow(
  row: Database["public"]["Tables"]["profiles"]["Row"] | null | undefined,
): {
  id: string;
  full_name: string | null;
  monthly_budget_goal: number | null;
  monthly_fixed_expenses: number | null;
  meal_price: number | null;
  next_income_date: string | null;
  avatar_url: string | null;
} | null {
  if (!row) return null;

  // Handle next_income_date (date type from Postgres)
  const rawDate = (row as unknown as { next_income_date?: string | null }).next_income_date;
  const nextIncomeDate =
    rawDate && typeof rawDate === "string" ? rawDate : rawDate === null ? null : String(rawDate || null);

  return {
    id: row.id,
    full_name: row.full_name,
    monthly_budget_goal: toFiniteNumber(
      (row as unknown as { monthly_budget_goal?: unknown }).monthly_budget_goal,
    ),
    monthly_fixed_expenses: toFiniteNumber(
      (row as unknown as { monthly_fixed_expenses?: unknown }).monthly_fixed_expenses,
    ),
    meal_price: toFiniteNumber((row as unknown as { meal_price?: unknown }).meal_price),
    next_income_date: nextIncomeDate,
    avatar_url: row.avatar_url ?? null,
  };
}

/**
 * Map a raw transaction row from Supabase to a normalized transaction object.
 *
 * Handles numeric type coercion for Postgres `numeric` fields which may arrive
 * as strings depending on PostgREST serialization settings.
 *
 * Accepts partial rows (e.g., when only `id, amount, type, category, date` are selected).
 *
 * @param row - Raw transaction row from Supabase query (may be partial, amount may be unknown)
 * @returns Normalized transaction object with guaranteed numeric amount
 */
export function mapTransactionRow(
  row: {
    id: string;
    amount: unknown;
    type: "income" | "expense";
    category: string;
    date: string;
    description?: string | null;
    wallet_id?: string | null;
    user_id?: string;
  },
): {
  id: string;
  user_id?: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  description: string | null;
  wallet_id: string | null;
} {
  const rawAmount = (row as unknown as { amount: unknown }).amount;
  const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);

  return {
    id: row.id,
    ...(row.user_id ? { user_id: row.user_id } : {}),
    amount: Number.isFinite(amount) ? amount : 0,
    type: row.type,
    category: row.category,
    date: row.date,
    description: row.description ?? null,
    wallet_id: row.wallet_id ?? null,
  };
}

/**
 * Map an array of raw transaction rows from Supabase to normalized transaction objects.
 *
 * @param rows - Array of raw transaction rows from Supabase query
 * @returns Array of normalized transaction objects
 */
export function mapTransactionRows(
  rows: Database["public"]["Tables"]["transactions"]["Row"][] | null | undefined,
): Array<ReturnType<typeof mapTransactionRow>> {
  if (!rows) return [];
  return rows.map(mapTransactionRow);
}

/**
 * Normalize a transaction amount from unknown type to finite number.
 *
 * Useful for partial queries where only amount needs normalization.
 *
 * @param amount - Raw amount value (may be string or number)
 * @returns Normalized amount (0 if invalid)
 */
export function normalizeTransactionAmount(amount: unknown): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

