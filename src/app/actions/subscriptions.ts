"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  type CreateSubscriptionFormInput,
  type DeleteSubscriptionInput,
  type UpdateSubscriptionFormInput,
  createSubscriptionSchema,
  deleteSubscriptionSchema,
  updateSubscriptionSchema,
} from "@/features/subscriptions/schemas";
import { logger } from "@/lib/logger";
import { buildRateLimitKey, checkRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FieldErrors = Record<string, string[] | undefined>;

export type SubscriptionsActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function invalidInputResult(fieldErrors: FieldErrors): SubscriptionsActionResult {
  return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
}

export async function createSubscriptionAction(
  input: CreateSubscriptionFormInput,
): Promise<SubscriptionsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("createSubscriptionAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = createSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Subscriptions.createSubscription.getUser failed", {
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
    key: buildRateLimitKey({ scope: "subscriptions.write", ip, userId: user.id }),
    policy: rateLimitPolicies["subscriptions.write"],
    requestId: originCheck.requestId,
    context: { action: "createSubscriptionAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: parsed.data.amount,
    currency: parsed.data.currency ?? "TL",
    billing_cycle: parsed.data.billing_cycle ?? "monthly",
    next_renewal_date: parsed.data.next_renewal_date,
    icon_url: parsed.data.icon_url ?? null,
    is_active: parsed.data.is_active ?? true,
  });

  if (error) {
    logger.error("Subscriptions.createSubscription.insert failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Abonelik eklenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateSubscriptionAction(
  input: UpdateSubscriptionFormInput,
): Promise<SubscriptionsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("updateSubscriptionAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = updateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Subscriptions.updateSubscription.getUser failed", {
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
    key: buildRateLimitKey({ scope: "subscriptions.write", ip, userId: user.id }),
    policy: rateLimitPolicies["subscriptions.write"] ?? rateLimitPolicies["default.write"],
    requestId: originCheck.requestId,
    context: { action: "updateSubscriptionAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const updateData: {
    name?: string;
    amount?: number;
    currency?: string;
    billing_cycle?: "monthly" | "yearly";
    next_renewal_date?: string;
    icon_url?: string | null;
    is_active?: boolean;
  } = {};

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
  if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency;
  if (parsed.data.billing_cycle !== undefined) updateData.billing_cycle = parsed.data.billing_cycle;
  if (parsed.data.next_renewal_date !== undefined) updateData.next_renewal_date = parsed.data.next_renewal_date;
  if (parsed.data.icon_url !== undefined) updateData.icon_url = parsed.data.icon_url;
  if (parsed.data.is_active !== undefined) updateData.is_active = parsed.data.is_active;

  const { error } = await supabase
    .from("subscriptions")
    .update(updateData)
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Subscriptions.updateSubscription.update failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Abonelik güncellenirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteSubscriptionAction(
  input: DeleteSubscriptionInput,
): Promise<SubscriptionsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("deleteSubscriptionAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = deleteSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Subscriptions.deleteSubscription.getUser failed", {
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
    key: buildRateLimitKey({ scope: "subscriptions.write", ip, userId: user.id }),
    policy: rateLimitPolicies["subscriptions.write"] ?? rateLimitPolicies["default.write"],
    requestId: originCheck.requestId,
    context: { action: "deleteSubscriptionAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Subscriptions.deleteSubscription.delete failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Abonelik silinirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/transactions");
  return { ok: true };
}

