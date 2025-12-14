"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";

export type Wallet = {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  is_default: boolean;
  created_at: string;
};

/**
 * Get all wallets for the current authenticated user.
 */
export async function getWallets(requestId: string): Promise<Wallet[] | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("id, user_id, name, balance, is_default, created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("getWallets failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) return [];

  // Map numeric balance from Postgres
  return data.map((w) => ({
    ...w,
    balance: typeof w.balance === "number" ? w.balance : Number(w.balance) || 0,
  }));
}

/**
 * Get a single wallet by ID (for the current user).
 */
export async function getWallet(walletId: string, requestId: string): Promise<Wallet | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("id, user_id, name, balance, is_default, created_at")
    .eq("id", walletId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("getWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance) || 0,
  };
}

/**
 * Create a new wallet for the current user.
 */
export async function createWallet(
  input: { name: string; balance: number; isDefault?: boolean },
  requestId: string,
): Promise<Wallet | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // If this wallet should be default, unset other defaults first
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
      is_default: input.isDefault ?? false,
    })
    .select("id, user_id, name, balance, is_default, created_at")
    .single();

  if (error) {
    logger.error("createWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance) || 0,
  };
}

/**
 * Update an existing wallet.
 */
export async function updateWallet(
  walletId: string,
  updates: Partial<{ name: string; balance: number; isDefault: boolean }>,
  requestId: string,
): Promise<Wallet | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // If setting as default, unset other defaults first
  if (updates.isDefault === true) {
    await supabase
      .from("wallets")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .neq("id", walletId);
  }

  const dbUpdates: Database["public"]["Tables"]["wallets"]["Update"] = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
  if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;

  if (Object.keys(dbUpdates).length === 0) {
    return getWallet(walletId, requestId);
  }

  const { data, error } = await supabase
    .from("wallets")
    .update(dbUpdates)
    .eq("id", walletId)
    .eq("user_id", user.id)
    .select("id, user_id, name, balance, is_default, created_at")
    .single();

  if (error) {
    logger.error("updateWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    balance: typeof data.balance === "number" ? data.balance : Number(data.balance) || 0,
  };
}

/**
 * Delete a wallet. Only allowed if balance is 0.
 */
export async function deleteWallet(walletId: string, requestId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check balance first
  const wallet = await getWallet(walletId, requestId);
  if (!wallet) {
    return false;
  }

  if (wallet.balance > 0) {
    logger.warn("deleteWallet: cannot delete wallet with balance", {
      requestId,
      walletId,
      balance: wallet.balance,
    });
    return false;
  }

  const { error } = await supabase.from("wallets").delete().eq("id", walletId).eq("user_id", user.id);

  if (error) {
    logger.error("deleteWallet failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}
