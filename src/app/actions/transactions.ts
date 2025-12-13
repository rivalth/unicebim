"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type CreateTransactionFormInput,
  createTransactionSchema,
  type UpdateMonthlyBudgetGoalFormInput,
  updateMonthlyBudgetGoalSchema,
} from "@/features/transactions/schemas";

type FieldErrors = Record<string, string[] | undefined>;

export type TransactionsActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function invalidInputResult(fieldErrors: FieldErrors): TransactionsActionResult {
  return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
}

export async function createTransactionAction(
  input: CreateTransactionFormInput,
): Promise<TransactionsActionResult> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("createTransaction.getUser failed", { message: userError.message });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const date = new Date(parsed.data.date);
  if (!Number.isFinite(date.getTime())) {
    return invalidInputResult({ date: ["Geçerli bir tarih seçin."] });
  }

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: parsed.data.amount,
    type: parsed.data.type,
    category: parsed.data.category,
    date: date.toISOString(),
  });

  if (insertError) {
    logger.error("createTransaction.insert failed", {
      code: insertError.code,
      message: insertError.message,
    });
    return { ok: false, message: "İşlem kaydedilemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function updateMonthlyBudgetGoalAction(
  input: UpdateMonthlyBudgetGoalFormInput,
): Promise<TransactionsActionResult> {
  const parsed = updateMonthlyBudgetGoalSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("updateMonthlyBudgetGoal.getUser failed", { message: userError.message });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const monthlyBudgetGoal =
    parsed.data.monthlyBudgetGoal == null ? null : parsed.data.monthlyBudgetGoal;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ monthly_budget_goal: monthlyBudgetGoal })
    .eq("id", user.id);

  if (updateError) {
    logger.error("updateMonthlyBudgetGoal.update failed", {
      code: updateError.code,
      message: updateError.message,
    });
    return { ok: false, message: "Bütçe hedefi güncellenemedi." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ok: true };
}


