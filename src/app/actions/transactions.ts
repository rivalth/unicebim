"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { buildRateLimitKey, checkRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  type CreateTransactionFormInput,
  createTransactionSchema,
  type DeleteTransactionInput,
  deleteTransactionSchema,
  type UpdateMonthlyBudgetGoalFormInput,
  updateMonthlyBudgetGoalSchema,
  type UpdateTransactionFormInput,
  updateTransactionSchema,
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
  const originCheck = await enforceSameOriginForServerAction("createTransactionAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("createTransaction.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "tx.write", ip, userId: user.id }),
    policy: rateLimitPolicies["tx.write"],
    requestId: originCheck.requestId,
    context: { action: "createTransactionAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

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
      requestId: originCheck.requestId,
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
  const originCheck = await enforceSameOriginForServerAction("updateMonthlyBudgetGoalAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = updateMonthlyBudgetGoalSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("updateMonthlyBudgetGoal.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "profile.write", ip, userId: user.id }),
    policy: rateLimitPolicies["profile.write"],
    requestId: originCheck.requestId,
    context: { action: "updateMonthlyBudgetGoalAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (parsed.data.monthlyBudgetGoal !== undefined) {
    updates.monthly_budget_goal =
      parsed.data.monthlyBudgetGoal == null ? null : parsed.data.monthlyBudgetGoal;
  }
  if (parsed.data.nextIncomeDate !== undefined) {
    updates.next_income_date = parsed.data.nextIncomeDate == null ? null : parsed.data.nextIncomeDate;
  }
  if (parsed.data.mealPrice !== undefined) {
    updates.meal_price = parsed.data.mealPrice == null ? null : parsed.data.mealPrice;
  }

  if (Object.keys(updates).length === 0) return { ok: true };

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (updateError) {
    logger.error("updateMonthlyBudgetGoal.update failed", {
      requestId: originCheck.requestId,
      code: updateError.code,
      message: updateError.message,
    });
    return { ok: false, message: "Bütçe hedefi güncellenemedi." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function updateTransactionAction(
  input: UpdateTransactionFormInput,
): Promise<TransactionsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("updateTransactionAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("updateTransaction.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "tx.write", ip, userId: user.id }),
    policy: rateLimitPolicies["tx.write"],
    requestId: originCheck.requestId,
    context: { action: "updateTransactionAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const date = new Date(parsed.data.date);
  if (!Number.isFinite(date.getTime())) {
    return invalidInputResult({ date: ["Geçerli bir tarih seçin."] });
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      date: date.toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    logger.error("updateTransaction.update failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "İşlem güncellenemedi. Lütfen tekrar deneyin." };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "İşlem bulunamadı veya yetkiniz yok." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function deleteTransactionAction(
  input: DeleteTransactionInput,
): Promise<TransactionsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("deleteTransactionAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("deleteTransaction.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "tx.write", ip, userId: user.id }),
    policy: rateLimitPolicies["tx.write"],
    requestId: originCheck.requestId,
    context: { action: "deleteTransactionAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    logger.error("deleteTransaction.delete failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "İşlem silinemedi. Lütfen tekrar deneyin." };
  }

  if (!data || data.length === 0) {
    return { ok: false, message: "İşlem bulunamadı veya yetkiniz yok." };
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ok: true };
}


