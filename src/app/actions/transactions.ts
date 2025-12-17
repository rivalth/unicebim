"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { buildRateLimitKey, checkRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateWallet } from "@/services/wallet.service";
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

export type BulkImportResult = {
  ok: true;
  successCount: number;
  failedCount: number;
  failedTransactions: Array<{
    index: number;
    transaction: {
      amount: number;
      type: "income" | "expense";
      category: string;
      date: string;
      description?: string | null;
    };
    errors: string[];
  }>;
} | { ok: false; message: string };

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
    description: parsed.data.description?.trim() || null,
    wallet_id: parsed.data.wallet_id || null,
  });

  if (insertError) {
    logger.error("createTransaction.insert failed", {
      requestId: originCheck.requestId,
      code: insertError.code,
      message: insertError.message,
    });
    return { ok: false, message: "İşlem kaydedilemedi. Lütfen tekrar deneyin." };
  }

  // Update wallet balance if wallet_id is provided
  if (parsed.data.wallet_id) {
    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("id", parsed.data.wallet_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      logger.warn("createTransaction: wallet not found, skipping balance update", {
        requestId: originCheck.requestId,
        walletId: parsed.data.wallet_id,
      });
    } else {
      const currentBalance = typeof wallet.balance === "number" ? wallet.balance : Number(wallet.balance);
      const newBalance =
        parsed.data.type === "income"
          ? currentBalance + parsed.data.amount
          : currentBalance - parsed.data.amount;

      const updated = await updateWallet(
        parsed.data.wallet_id,
        { balance: newBalance },
        originCheck.requestId,
      );

      if (!updated) {
        logger.warn("createTransaction: wallet balance update failed", {
          requestId: originCheck.requestId,
          walletId: parsed.data.wallet_id,
        });
      }
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");

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

  // Get old transaction to revert wallet balance changes
  const { data: oldTx, error: oldTxError } = await supabase
    .from("transactions")
    .select("wallet_id, amount, type")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (oldTxError || !oldTx) {
    return { ok: false, message: "İşlem bulunamadı veya yetkiniz yok." };
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      amount: parsed.data.amount,
      wallet_id: parsed.data.wallet_id || null,
      type: parsed.data.type,
      category: parsed.data.category,
      date: date.toISOString(),
      description: parsed.data.description?.trim() || null,
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

  // Revert old transaction's effect on wallet balance
  if (oldTx.wallet_id) {
    const { data: oldWallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("id", oldTx.wallet_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (oldWallet) {
      const oldBalance = typeof oldWallet.balance === "number" ? oldWallet.balance : Number(oldWallet.balance);
      const oldAmount = typeof oldTx.amount === "number" ? oldTx.amount : Number(oldTx.amount);
      // Revert: if it was income, subtract; if expense, add back
      const revertedBalance =
        oldTx.type === "income" ? oldBalance - oldAmount : oldBalance + oldAmount;

      await updateWallet(oldTx.wallet_id, { balance: revertedBalance }, originCheck.requestId);
    }
  }

  // Apply new transaction's effect on wallet balance
  const newWalletId = parsed.data.wallet_id || null;
  if (newWalletId) {
    const { data: newWallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("id", newWalletId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (newWallet) {
      const currentBalance = typeof newWallet.balance === "number" ? newWallet.balance : Number(newWallet.balance);
      const newBalance =
        parsed.data.type === "income"
          ? currentBalance + parsed.data.amount
          : currentBalance - parsed.data.amount;

      await updateWallet(newWalletId, { balance: newBalance }, originCheck.requestId);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");

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

  // Get transaction before deleting to revert wallet balance
  const { data: txToDelete, error: fetchError } = await supabase
    .from("transactions")
    .select("wallet_id, amount, type")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !txToDelete) {
    return { ok: false, message: "İşlem bulunamadı veya yetkiniz yok." };
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("deleteTransaction.delete failed", {
      requestId: originCheck.requestId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "İşlem silinemedi. Lütfen tekrar deneyin." };
  }

  // Revert transaction's effect on wallet balance
  if (txToDelete.wallet_id) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("id", txToDelete.wallet_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (wallet) {
      const currentBalance = typeof wallet.balance === "number" ? wallet.balance : Number(wallet.balance);
      const amount = typeof txToDelete.amount === "number" ? txToDelete.amount : Number(txToDelete.amount);
      // Revert: if it was income, subtract; if expense, add back
      const revertedBalance =
        txToDelete.type === "income" ? currentBalance - amount : currentBalance + amount;

      await updateWallet(txToDelete.wallet_id, { balance: revertedBalance }, originCheck.requestId);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");

  return { ok: true };
}

/**
 * Bulk import transactions from bank statement import.
 *
 * Validates and inserts multiple transactions in a single operation.
 * Uses batch insert for better performance.
 * Returns detailed results including which transactions succeeded and which failed.
 */
export async function bulkImportTransactionsAction(
  transactions: Array<{
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string; // YYYY-MM-DD format
  }>,
): Promise<BulkImportResult> {
  const originCheck = await enforceSameOriginForServerAction("bulkImportTransactionsAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  // Validate input array
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { ok: false, message: "En az bir işlem gerekli." };
  }

  if (transactions.length > 1000) {
    return { ok: false, message: "Bir seferde en fazla 1000 işlem içe aktarılabilir." };
  }

  const failedTransactions: Array<{
    index: number;
    transaction: {
      amount: number;
      type: "income" | "expense";
      category: string;
      date: string;
    };
    errors: string[];
  }> = [];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("bulkImportTransactions.getUser failed", {
      requestId: originCheck.requestId,
      message: userError.message,
    });
  }

  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  // Use a more lenient rate limit for bulk imports (10 bulk imports per hour)
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "tx.write", ip, userId: user.id }),
    policy: { limit: 10, windowSeconds: 3600 }, // 10 per hour for bulk operations
    requestId: originCheck.requestId,
    context: { action: "bulkImportTransactionsAction", userId: user.id, count: transactions.length },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  // Validate and transform each transaction
  const validatedTransactions: Array<{
    user_id: string;
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
    description: string | null;
  }> = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]!;
    const errors: string[] = [];

    // Validate using schema
    const parsed = createTransactionSchema.safeParse({
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      date: tx.date,
    });

    if (!parsed.success) {
      const txErrors = parsed.error.flatten().fieldErrors;
      for (const [, messages] of Object.entries(txErrors)) {
        errors.push(...(messages ?? []));
      }
      failedTransactions.push({
        index: i,
        transaction: tx,
        errors,
      });
      continue;
    }

    const date = new Date(parsed.data.date);
    if (!Number.isFinite(date.getTime())) {
      errors.push("Geçerli bir tarih seçin.");
      failedTransactions.push({
        index: i,
        transaction: tx,
        errors,
      });
      continue;
    }

    validatedTransactions.push({
      user_id: user.id,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      date: date.toISOString(),
      description: parsed.data.description?.trim() || null,
    });
  }

  // Batch insert (Supabase supports up to 1000 rows per insert)
  // Split into chunks of 500 for safety
  const CHUNK_SIZE = 500;
  const chunks: typeof validatedTransactions[] = [];
  for (let i = 0; i < validatedTransactions.length; i += CHUNK_SIZE) {
    chunks.push(validatedTransactions.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const { error: insertError } = await supabase.from("transactions").insert(chunk);

    if (insertError) {
      logger.error("bulkImportTransactions.insert failed", {
        requestId: originCheck.requestId,
        code: insertError.code,
        message: insertError.message,
        chunkSize: chunk.length,
      });
      return {
        ok: false,
        message: `İşlemler kaydedilemedi: ${insertError.message}`,
      };
    }
  }

  logger.info("bulkImportTransactions.success", {
    requestId: originCheck.requestId,
    userId: user.id,
    successCount: validatedTransactions.length,
    failedCount: failedTransactions.length,
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return {
    ok: true,
    successCount: validatedTransactions.length,
    failedCount: failedTransactions.length,
    failedTransactions,
  };
}

