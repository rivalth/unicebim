"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type WalletData = {
  id: string;
  name: string;
  balance: number;
  is_default: boolean;
  created_at: string;
};

/**
 * Get all wallets for the current user.
 */
export async function getWallets(requestId?: string): Promise<WalletData[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("id, name, balance, is_default, created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("wallet.getWallets failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    balance: typeof w.balance === "number" ? w.balance : Number(w.balance),
    is_default: w.is_default,
    created_at: w.created_at,
  }));
}

/**
 * Get default wallet for the current user.
 */
export async function getDefaultWallet(requestId?: string): Promise<WalletData | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("id, name, balance, is_default, created_at")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    logger.error("wallet.getDefaultWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance),
    is_default: data.is_default,
    created_at: data.created_at,
  };
}

/**
 * Get wallet by ID for the current user.
 */
export async function getWalletById(walletId: string, requestId?: string): Promise<WalletData | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("id, name, balance, is_default, created_at")
    .eq("id", walletId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("wallet.getWalletById failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance),
    is_default: data.is_default,
    created_at: data.created_at,
  };
}

/**
 * Get wallet by ID (alias for getWalletById for backward compatibility).
 */
export async function getWallet(walletId: string, requestId?: string): Promise<WalletData | null> {
  return getWalletById(walletId, requestId);
}

type CreateWalletInput = {
  name: string;
  balance: number;
  isDefault: boolean;
};

/**
 * Create a new wallet for the current user.
 */
export async function createWallet(
  input: CreateWalletInput,
  requestId?: string,
): Promise<WalletData | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // If this wallet is set as default, unset other default wallets first
  if (input.isDefault) {
    await supabase
      .from("wallets")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("wallets")
    .insert({
      user_id: user.id,
      name: input.name,
      balance: input.balance,
      is_default: input.isDefault,
    })
    .select("id, name, balance, is_default, created_at")
    .single();

  if (error) {
    logger.error("wallet.createWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance),
    is_default: data.is_default,
    created_at: data.created_at,
  };
}

type UpdateWalletInput = {
  name?: string;
  balance?: number;
  isDefault?: boolean;
};

/**
 * Update a wallet for the current user.
 */
export async function updateWallet(
  walletId: string,
  input: UpdateWalletInput,
  requestId?: string,
): Promise<WalletData | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Verify wallet belongs to user
  const { data: existingWallet, error: checkError } = await supabase
    .from("wallets")
    .select("id, is_default")
    .eq("id", walletId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError || !existingWallet) {
    logger.error("wallet.updateWallet: wallet not found or access denied", {
      requestId,
      code: checkError?.code,
      message: checkError?.message,
    });
    return null;
  }

  // If this wallet is being set as default, unset other default wallets first
  if (input.isDefault === true && !existingWallet.is_default) {
    await supabase
      .from("wallets")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .neq("id", walletId);
  }

  const updates: {
    name?: string;
    balance?: number;
    is_default?: boolean;
  } = {};

  if (input.name !== undefined) {
    updates.name = input.name;
  }
  if (input.balance !== undefined) {
    updates.balance = input.balance;
  }
  if (input.isDefault !== undefined) {
    updates.is_default = input.isDefault;
  }

  if (Object.keys(updates).length === 0) {
    // No updates, return existing wallet
    return getWalletById(walletId, requestId);
  }

  const { data, error } = await supabase
    .from("wallets")
    .update(updates)
    .eq("id", walletId)
    .eq("user_id", user.id)
    .select("id, name, balance, is_default, created_at")
    .single();

  if (error) {
    logger.error("wallet.updateWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance),
    is_default: data.is_default,
    created_at: data.created_at,
  };
}

/**
 * Delete a wallet for the current user.
 * Only allowed if balance is 0.
 */
export async function deleteWallet(walletId: string, requestId?: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Verify wallet belongs to user and has zero balance
  const { data: wallet, error: checkError } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("id", walletId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError || !wallet) {
    logger.error("wallet.deleteWallet: wallet not found or access denied", {
      requestId,
      code: checkError?.code,
      message: checkError?.message,
    });
    return false;
  }

  const balance = typeof wallet.balance === "number" ? wallet.balance : Number(wallet.balance);
  if (balance !== 0) {
    logger.warn("wallet.deleteWallet: cannot delete wallet with non-zero balance", {
      requestId,
      walletId,
      balance,
    });
    return false;
  }

  const { error } = await supabase.from("wallets").delete().eq("id", walletId).eq("user_id", user.id);

  if (error) {
    logger.error("wallet.deleteWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}
