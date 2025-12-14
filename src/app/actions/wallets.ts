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
      isDefault: parsed.data.isDefault,
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
      balance: parsed.data.balance,
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

  // Perform transfer: Update both wallets in a transaction-like manner
  // Note: In production, use a DB transaction, but Supabase client doesn't support transactions easily.
  // For MVP, we'll do sequential updates and handle partial failures manually.

  // Update from wallet (decrease balance)
  const fromUpdated = await walletService.updateWallet(
    parsed.data.fromWalletId,
    { balance: fromWallet.balance - parsed.data.amount },
    originCheck.requestId,
  );

  if (!fromUpdated) {
    return { ok: false, message: "Transfer başlatılamadı. Lütfen tekrar deneyin." };
  }

  // Update to wallet (increase balance)
  const toUpdated = await walletService.updateWallet(
    parsed.data.toWalletId,
    { balance: toWallet.balance + parsed.data.amount },
    originCheck.requestId,
  );

  if (!toUpdated) {
    // Rollback: restore from wallet balance
    await walletService.updateWallet(
      parsed.data.fromWalletId,
      { balance: fromWallet.balance },
      originCheck.requestId,
    );
    return { ok: false, message: "Transfer tamamlanamadı. Lütfen tekrar deneyin." };
  }

  // Optional: Record transfer as a transaction for audit trail
  // For MVP, we skip this to keep it simple, but in production you might want to track transfers

  revalidatePath("/dashboard");
  return { ok: true };
}
