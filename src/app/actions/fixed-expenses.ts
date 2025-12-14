"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  type CreateFixedExpenseFormInput,
  type DeleteFixedExpenseInput,
  type UpdateFixedExpenseFormInput,
  createFixedExpenseSchema,
  deleteFixedExpenseSchema,
  updateFixedExpenseSchema,
} from "@/features/fixed-expenses/schemas";
import { logger } from "@/lib/logger";
import { buildRateLimitKey, checkRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
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
  const originCheck = await enforceSameOriginForServerAction("createFixedExpenseAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

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
    logger.warn("FixedExpenses.createFixedExpense.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum açmanız gerekiyor." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "fixed_expenses.write", ip, userId: user.id }),
    policy: rateLimitPolicies["fixed_expenses.write"],
    requestId: originCheck.requestId,
    context: { action: "createFixedExpenseAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const { error } = await supabase.from("fixed_expenses").insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: parsed.data.amount,
  });

  if (error) {
    logger.error("FixedExpenses.createFixedExpense.insert failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Sabit gider eklenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateFixedExpenseAction(
  input: UpdateFixedExpenseFormInput,
): Promise<FixedExpensesActionResult> {
  const originCheck = await enforceSameOriginForServerAction("updateFixedExpenseAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

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
    logger.warn("FixedExpenses.updateFixedExpense.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum açmanız gerekiyor." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "fixed_expenses.write", ip, userId: user.id }),
    policy: rateLimitPolicies["fixed_expenses.write"],
    requestId: originCheck.requestId,
    context: { action: "updateFixedExpenseAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

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
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Sabit gider güncellenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteFixedExpenseAction(
  input: DeleteFixedExpenseInput,
): Promise<FixedExpensesActionResult> {
  const originCheck = await enforceSameOriginForServerAction("deleteFixedExpenseAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

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
    logger.warn("FixedExpenses.deleteFixedExpense.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum açmanız gerekiyor." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "fixed_expenses.write", ip, userId: user.id }),
    policy: rateLimitPolicies["fixed_expenses.write"],
    requestId: originCheck.requestId,
    context: { action: "deleteFixedExpenseAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("FixedExpenses.deleteFixedExpense.delete failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Sabit gider silinirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}
