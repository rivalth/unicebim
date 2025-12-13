"use server";

import { revalidatePath } from "next/cache";

import {
  type CreateFixedExpenseFormInput,
  type DeleteFixedExpenseInput,
  type UpdateFixedExpenseFormInput,
  createFixedExpenseSchema,
  deleteFixedExpenseSchema,
  updateFixedExpenseSchema,
} from "@/features/fixed-expenses/schemas";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FieldErrors = Record<string, string[] | undefined>;

export type FixedExpensesActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function invalidInputResult(fieldErrors: FieldErrors): FixedExpensesActionResult {
  return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
}

export async function createFixedExpenseAction(
  input: CreateFixedExpenseFormInput,
): Promise<FixedExpensesActionResult> {
  const parsed = createFixedExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("FixedExpenses.createFixedExpense.getUser failed", { message: userError.message });
  }

  if (!user) {
    return { ok: false, message: "Oturum açmanız gerekiyor." };
  }

  const { error } = await supabase.from("fixed_expenses").insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: parsed.data.amount,
  });

  if (error) {
    logger.error("FixedExpenses.createFixedExpense.insert failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Sabit gider eklenirken bir hata oluştu." };
  }

  // Update profiles.monthly_fixed_expenses with sum of all fixed expenses
  await syncMonthlyFixedExpenses(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateFixedExpenseAction(
  input: UpdateFixedExpenseFormInput,
): Promise<FixedExpensesActionResult> {
  const parsed = updateFixedExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("FixedExpenses.updateFixedExpense.getUser failed", { message: userError.message });
  }

  if (!user) {
    return { ok: false, message: "Oturum açmanız gerekiyor." };
  }

  const { error } = await supabase
    .from("fixed_expenses")
    .update({
      name: parsed.data.name,
      amount: parsed.data.amount,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("FixedExpenses.updateFixedExpense.update failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Sabit gider güncellenirken bir hata oluştu." };
  }

  // Update profiles.monthly_fixed_expenses with sum of all fixed expenses
  await syncMonthlyFixedExpenses(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteFixedExpenseAction(
  input: DeleteFixedExpenseInput,
): Promise<FixedExpensesActionResult> {
  const parsed = deleteFixedExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("FixedExpenses.deleteFixedExpense.getUser failed", { message: userError.message });
  }

  if (!user) {
    return { ok: false, message: "Oturum açmanız gerekiyor." };
  }

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("FixedExpenses.deleteFixedExpense.delete failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Sabit gider silinirken bir hata oluştu." };
  }

  // Update profiles.monthly_fixed_expenses with sum of all fixed expenses
  await syncMonthlyFixedExpenses(user.id);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

/**
 * Sync profiles.monthly_fixed_expenses with sum of all fixed_expenses for a user.
 */
async function syncMonthlyFixedExpenses(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { data: expenses, error: selectError } = await supabase
    .from("fixed_expenses")
    .select("amount")
    .eq("user_id", userId);

  if (selectError) {
    logger.error("FixedExpenses.syncMonthlyFixedExpenses.select failed", {
      code: selectError.code,
      message: selectError.message,
    });
    return;
  }

  const total = expenses.reduce((sum, e) => sum + (typeof e.amount === "number" ? e.amount : Number(e.amount)), 0);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ monthly_fixed_expenses: total })
    .eq("id", userId);

  if (updateError) {
    logger.error("FixedExpenses.syncMonthlyFixedExpenses.update failed", {
      code: updateError.code,
      message: updateError.message,
    });
  }
}

