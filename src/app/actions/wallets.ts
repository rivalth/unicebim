"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  type CreateWalletFormInput,
  type UpdateWalletFormInput,
  type DeleteWalletInput,
  type TransferBetweenWalletsFormInput,
  createWalletSchema,
  updateWalletSchema,
  deleteWalletSchema,
  transferBetweenWalletsSchema,
} from "@/features/wallets/schemas";
import { logger } from "@/lib/logger";
import { buildRateLimitKey, checkRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import * as walletService from "@/services/wallet.service";

type FieldErrors = Record<string, string[] | undefined>;

export type WalletsActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

function invalidInputResult(fieldErrors: FieldErrors): WalletsActionResult {
  return { ok: false, message: "Lütfen alanları kontrol edin.", fieldErrors };
}

export async function createWalletAction(
  input: CreateWalletFormInput,
): Promise<WalletsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("createWalletAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = createWalletSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("createWallet.getUser failed", {
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
    key: buildRateLimitKey({ scope: "wallets.write", ip, userId: user.id }),
    policy: rateLimitPolicies["wallets.write"],
    requestId: originCheck.requestId,
    context: { action: "createWalletAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const wallet = await walletService.createWallet(
    {
      name: parsed.data.name,
      balance: parsed.data.balance,
      isDefault: parsed.data.isDefault ?? false,
    },
    originCheck.requestId,
  );

  if (!wallet) {
    return { ok: false, message: "Cüzdan oluşturulamadı. Lütfen tekrar deneyin." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateWalletAction(
  input: UpdateWalletFormInput,
): Promise<WalletsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("updateWalletAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = updateWalletSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("updateWallet.getUser failed", {
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
    key: buildRateLimitKey({ scope: "wallets.write", ip, userId: user.id }),
    policy: rateLimitPolicies["wallets.write"],
    requestId: originCheck.requestId,
    context: { action: "updateWalletAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const wallet = await walletService.updateWallet(
    parsed.data.id,
    {
      name: parsed.data.name,
      balance: parsed.data.balance, // Update balance (service handles initial_balance internally)
      isDefault: parsed.data.isDefault,
    },
    originCheck.requestId,
  );

  if (!wallet) {
    return { ok: false, message: "Cüzdan güncellenemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteWalletAction(
  input: DeleteWalletInput,
): Promise<WalletsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("deleteWalletAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = deleteWalletSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("deleteWallet.getUser failed", {
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
    key: buildRateLimitKey({ scope: "wallets.write", ip, userId: user.id }),
    policy: rateLimitPolicies["wallets.write"],
    requestId: originCheck.requestId,
    context: { action: "deleteWalletAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const success = await walletService.deleteWallet(parsed.data.id, originCheck.requestId);

  if (!success) {
    return { ok: false, message: "Cüzdan silinemedi. Bakiye sıfır olmalı veya cüzdan mevcut olmalı." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function transferBetweenWalletsAction(
  input: TransferBetweenWalletsFormInput,
): Promise<WalletsActionResult> {
  const originCheck = await enforceSameOriginForServerAction("transferBetweenWalletsAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const parsed = transferBetweenWalletsSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInputResult(parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.fromWalletId === parsed.data.toWalletId) {
    return { ok: false, message: "Aynı cüzdana transfer yapılamaz.", fieldErrors: {} };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("transferBetweenWallets.getUser failed", {
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
    key: buildRateLimitKey({ scope: "wallets.write", ip, userId: user.id }),
    policy: rateLimitPolicies["wallets.write"],
    requestId: originCheck.requestId,
    context: { action: "transferBetweenWalletsAction", userId: user.id },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  // Verify both wallets belong to the user and check balance
  const [fromWallet, toWallet] = await Promise.all([
    walletService.getWallet(parsed.data.fromWalletId, originCheck.requestId),
    walletService.getWallet(parsed.data.toWalletId, originCheck.requestId),
  ]);

  if (!fromWallet || !toWallet) {
    return { ok: false, message: "Cüzdanlar bulunamadı veya yetkiniz yok." };
  }

  if (fromWallet.balance < parsed.data.amount) {
    return {
      ok: false,
      message: `Yetersiz bakiye. ${fromWallet.name} cüzdanında ${fromWallet.balance} TL var.`,
      fieldErrors: { amount: ["Yetersiz bakiye"] },
    };
  }

  // Perform transfer by creating two transactions:
  // 1. Expense from source wallet
  // 2. Income to destination wallet
  // This way balance is automatically calculated from transactions

  const transferDate = new Date(parsed.data.date);
  if (!Number.isFinite(transferDate.getTime())) {
    return { ok: false, message: "Geçersiz tarih." };
  }

  // Create expense transaction from source wallet
  const { error: expenseError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: parsed.data.amount,
    type: "expense",
    category: "Sabitler", // Transfer category
    date: transferDate.toISOString(),
    description: `Transfer: ${toWallet.name} cüzdanına`,
    wallet_id: parsed.data.fromWalletId,
  });

  if (expenseError) {
    logger.error("transferBetweenWallets: expense transaction failed", {
      requestId: originCheck.requestId,
      code: expenseError.code,
      message: expenseError.message,
    });
    return { ok: false, message: "Transfer başlatılamadı. Lütfen tekrar deneyin." };
  }

  // Create income transaction to destination wallet
  const { error: incomeError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: parsed.data.amount,
    type: "income",
    category: "KYK/Burs", // Transfer category (using income category)
    date: transferDate.toISOString(),
    description: `Transfer: ${fromWallet.name} cüzdanından`,
    wallet_id: parsed.data.toWalletId,
  });

  if (incomeError) {
    // Rollback: delete the expense transaction
    // Note: In production, use a DB transaction for atomicity
    logger.error("transferBetweenWallets: income transaction failed", {
      requestId: originCheck.requestId,
      code: incomeError.code,
      message: incomeError.message,
    });
    // Try to delete the expense transaction (best effort)
    await supabase
      .from("transactions")
      .delete()
      .eq("user_id", user.id)
      .eq("wallet_id", parsed.data.fromWalletId)
      .eq("type", "expense")
      .eq("category", "Sabitler")
      .eq("amount", parsed.data.amount)
      .order("created_at", { ascending: false })
      .limit(1);
    return { ok: false, message: "Transfer tamamlanamadı. Lütfen tekrar deneyin." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
