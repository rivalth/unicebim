"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  type CreatePaymentFormInput,
  type DeletePaymentInput,
  type UpdatePaymentFormInput,
  type MarkPaymentPaidInput,
  createPaymentSchema,
  deletePaymentSchema,
  updatePaymentSchema,
  markPaymentPaidSchema,
} from "@/features/payments/schemas";
import { logger } from "@/lib/logger";
import { buildRateLimitKey, checkRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FieldErrors = Record<string, string[] | undefined>;

export type PaymentsActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function invalidInputResult(fieldErrors: FieldErrors): PaymentsActionResult {
  return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
}

export async function createPaymentAction(
  input: CreatePaymentFormInput,
): Promise<PaymentsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("createPaymentAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Payments.createPayment.getUser failed", {
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
    key: buildRateLimitKey({ scope: "payments.write", ip, userId: user.id }),
    policy: rateLimitPolicies["payments.write"],
    requestId: originCheck.requestId,
    context: { action: "createPaymentAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  // Validate due_date is not in the past
  const dueDate = new Date(parsed.data.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate < today) {
    return invalidInputResult({ due_date: ["Vade tarihi bugünden önce olamaz."] });
  }

  const { error } = await supabase.from("upcoming_payments").insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
  });

  if (error) {
    logger.error("Payments.createPayment.insert failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Ödeme eklenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updatePaymentAction(
  input: UpdatePaymentFormInput,
): Promise<PaymentsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("updatePaymentAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = updatePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Payments.updatePayment.getUser failed", {
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
    key: buildRateLimitKey({ scope: "payments.write", ip, userId: user.id }),
    policy: rateLimitPolicies["payments.write"] ?? rateLimitPolicies["tx.write"],
    requestId: originCheck.requestId,
    context: { action: "updatePaymentAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const updateData: {
    name: string;
    amount: number;
    due_date: string;
    is_paid?: boolean;
  } = {
    name: parsed.data.name,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
  };

  if (parsed.data.is_paid !== undefined) {
    updateData.is_paid = parsed.data.is_paid;
  }

  const { error } = await supabase
    .from("upcoming_payments")
    .update(updateData)
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Payments.updatePayment.update failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Ödeme güncellenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePaymentAction(
  input: DeletePaymentInput,
): Promise<PaymentsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("deletePaymentAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = deletePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Payments.deletePayment.getUser failed", {
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
    key: buildRateLimitKey({ scope: "payments.write", ip, userId: user.id }),
    policy: rateLimitPolicies["payments.write"] ?? rateLimitPolicies["tx.write"],
    requestId: originCheck.requestId,
    context: { action: "deletePaymentAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const { error } = await supabase
    .from("upcoming_payments")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Payments.deletePayment.delete failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Ödeme silinirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markPaymentPaidAction(
  input: MarkPaymentPaidInput,
): Promise<PaymentsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("markPaymentPaidAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = markPaymentPaidSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Payments.markPaymentPaid.getUser failed", {
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
    key: buildRateLimitKey({ scope: "payments.write", ip, userId: user.id }),
    policy: rateLimitPolicies["payments.write"] ?? rateLimitPolicies["tx.write"],
    requestId: originCheck.requestId,
    context: { action: "markPaymentPaidAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  // Update payment status
  const { error } = await supabase
    .from("upcoming_payments")
    .update({ is_paid: parsed.data.is_paid })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Payments.markPaymentPaid.update failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Ödeme durumu güncellenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

