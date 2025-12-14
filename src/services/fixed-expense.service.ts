import "server-only";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";

export type FixedExpenseData = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  created_at: string;
};

/**
 * Create a fixed expense for the current user.
 *
 * @param fixedExpense - Fixed expense data to insert
 * @param requestId - Request ID for logging
 * @returns Created fixed expense data or null if creation failed
 */
export async function createFixedExpense(
  fixedExpense: { name: string; amount: number },
  requestId: string,
): Promise<FixedExpenseData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("fixed_expenses")
    .insert({
      user_id: user.id,
      name: fixedExpense.name,
      amount: fixedExpense.amount,
    })
    .select("id, user_id, name, amount, created_at")
    .single();

  if (error) {
    logger.error("fixedExpense.createFixedExpense failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Update a fixed expense for the current user.
 *
 * @param fixedExpenseId - ID of the fixed expense to update
 * @param updates - Fixed expense fields to update
 * @param requestId - Request ID for logging
 * @returns Updated fixed expense data or null if update failed
 */
export async function updateFixedExpense(
  fixedExpenseId: string,
  updates: { name: string; amount: number },
  requestId: string,
): Promise<FixedExpenseData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("fixed_expenses")
    .update(updates)
    .eq("id", fixedExpenseId)
    .eq("user_id", user.id) // Ensure user owns the fixed expense
    .select("id, user_id, name, amount, created_at")
    .maybeSingle();

  if (error) {
    logger.error("fixedExpense.updateFixedExpense failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Delete a fixed expense for the current user.
 *
 * @param fixedExpenseId - ID of the fixed expense to delete
 * @param requestId - Request ID for logging
 * @returns true if deletion succeeded, false otherwise
 */
export async function deleteFixedExpense(
  fixedExpenseId: string,
  requestId: string,
): Promise<boolean> {
  const user = await getCachedUser();
  if (!user) {
    return false;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", fixedExpenseId)
    .eq("user_id", user.id); // Ensure user owns the fixed expense

  if (error) {
    logger.error("fixedExpense.deleteFixedExpense failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}

