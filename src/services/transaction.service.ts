import "server-only";

import { logger } from "@/lib/logger";
import { mapTransactionRow, normalizeTransactionAmount } from "@/lib/supabase/mappers";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { calculateMonthlySummary } from "@/features/transactions/summary";
import { isMissingRpcFunctionError } from "@/lib/supabase/errors";
import type { UtcMonthRange } from "@/lib/month";

export type TransactionData = {
  id: string;
  user_id?: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};

export type MonthlySummaryData = {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
};

/**
 * Create a new transaction for the current user.
 *
 * @param transaction - Transaction data to insert
 * @param requestId - Request ID for logging
 * @returns Created transaction data or null if creation failed
 */
export async function createTransaction(
  transaction: {
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string; // ISO string
  },
  requestId: string,
): Promise<TransactionData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
    })
    .select("id, amount, type, category, date, user_id")
    .single();

  if (error) {
    logger.error("transaction.createTransaction failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return mapTransactionRow(data);
}

/**
 * Update an existing transaction for the current user.
 *
 * @param transactionId - ID of the transaction to update
 * @param updates - Transaction fields to update
 * @param requestId - Request ID for logging
 * @returns Updated transaction data or null if update failed
 */
export async function updateTransaction(
  transactionId: string,
  updates: Database["public"]["Tables"]["transactions"]["Update"],
  requestId: string,
): Promise<TransactionData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .eq("user_id", user.id) // Ensure user owns the transaction
    .select("id, amount, type, category, date, user_id")
    .maybeSingle();

  if (error) {
    logger.error("transaction.updateTransaction failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null; // Transaction not found or user doesn't own it
  }

  return mapTransactionRow(data);
}

/**
 * Delete a transaction for the current user.
 *
 * @param transactionId - ID of the transaction to delete
 * @param requestId - Request ID for logging
 * @returns true if deletion succeeded, false otherwise
 */
export async function deleteTransaction(transactionId: string, requestId: string): Promise<boolean> {
  const user = await getCachedUser();
  if (!user) {
    return false;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", user.id); // Ensure user owns the transaction

  if (error) {
    logger.error("transaction.deleteTransaction failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}

/**
 * Get monthly summary for the current user.
 *
 * @param range - UTC month range
 * @param requestId - Request ID for logging
 * @returns Monthly summary data
 */
export async function getMonthlySummary(
  range: UtcMonthRange,
  requestId: string,
): Promise<MonthlySummaryData> {
  const user = await getCachedUser();
  if (!user) {
    return { incomeTotal: 0, expenseTotal: 0, netTotal: 0 };
  }

  const supabase = await createSupabaseServerClient();

  const summaryResult = await supabase.rpc("get_monthly_summary", {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
  });

  const { data: summaryRows, error: summaryError } = summaryResult;

  if (summaryError) {
    if (isMissingRpcFunctionError(summaryError)) {
      logger.warn("transaction.getMonthlySummary missing (fallback)", {
        requestId,
        code: summaryError.code,
        message: summaryError.message,
      });

      // Fallback: pull all transactions to calculate summary
      const { data: allRaw, error: allError } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", user.id)
        .gte("date", range.start.toISOString())
        .lt("date", range.end.toISOString());

      if (allError) {
        logger.error("transaction.getMonthlySummary fallback failed", {
          requestId,
          code: allError.code,
          message: allError.message,
        });
        return { incomeTotal: 0, expenseTotal: 0, netTotal: 0 };
      }

      const txForSummary = (allRaw ?? []).map((t) => ({
        amount: normalizeTransactionAmount((t as unknown as { amount: unknown }).amount),
        type: t.type,
      }));

      return calculateMonthlySummary(txForSummary);
    } else {
      logger.error("transaction.getMonthlySummary failed", {
        requestId,
        code: (summaryError as { code?: string }).code,
        message: (summaryError as { message?: string }).message,
      });
      return { incomeTotal: 0, expenseTotal: 0, netTotal: 0 };
    }
  }

  const summaryFromDb = summaryRows?.[0];
  if (!summaryFromDb) {
    return { incomeTotal: 0, expenseTotal: 0, netTotal: 0 };
  }

  return {
    incomeTotal:
      normalizeTransactionAmount(
        (summaryFromDb as unknown as { income_total?: unknown }).income_total,
      ) ?? 0,
    expenseTotal:
      normalizeTransactionAmount(
        (summaryFromDb as unknown as { expense_total?: unknown }).expense_total,
      ) ?? 0,
    netTotal:
      normalizeTransactionAmount(
        (summaryFromDb as unknown as { net_total?: unknown }).net_total,
      ) ?? 0,
  };
}

