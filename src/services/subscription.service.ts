import "server-only";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";

export type SubscriptionData = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: "monthly" | "yearly";
  next_renewal_date: string; // YYYY-MM-DD format
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpcomingSubscriptionRenewal = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: "monthly" | "yearly";
  next_renewal_date: string; // YYYY-MM-DD format
  icon_url: string | null;
  days_until_renewal: number;
};

/**
 * Get all subscriptions for the current user.
 *
 * @param requestId - Request ID for logging
 * @returns Array of subscription data
 */
export async function getSubscriptions(requestId: string): Promise<SubscriptionData[]> {
  const user = await getCachedUser();
  if (!user) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, amount, currency, billing_cycle, next_renewal_date, icon_url, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("subscription.getSubscriptions failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
}

/**
 * Get active subscriptions for the current user.
 *
 * @param requestId - Request ID for logging
 * @returns Array of active subscription data
 */
export async function getActiveSubscriptions(requestId: string): Promise<SubscriptionData[]> {
  const user = await getCachedUser();
  if (!user) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, amount, currency, billing_cycle, next_renewal_date, icon_url, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("next_renewal_date", { ascending: true });

  if (error) {
    logger.error("subscription.getActiveSubscriptions failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
}

/**
 * Get upcoming subscription renewals within the next N days.
 *
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @param requestId - Request ID for logging
 * @returns Array of upcoming renewals
 */
export async function getUpcomingSubscriptionRenewals(
  daysAhead: number = 7,
  requestId: string = "unknown",
): Promise<UpcomingSubscriptionRenewal[]> {
  const user = await getCachedUser();
  if (!user) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_upcoming_subscription_renewals", {
    p_user_id: user.id,
    p_days_ahead: daysAhead,
  });

  if (error) {
    logger.error("subscription.getUpcomingSubscriptionRenewals failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as UpcomingSubscriptionRenewal[];
}

/**
 * Get total monthly cost of all active subscriptions.
 *
 * @param requestId - Request ID for logging
 * @returns Total monthly cost
 */
export async function getMonthlySubscriptionsTotal(requestId: string = "unknown"): Promise<number> {
  const user = await getCachedUser();
  if (!user) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_monthly_subscriptions_total", {
    p_user_id: user.id,
  });

  if (error) {
    logger.error("subscription.getMonthlySubscriptionsTotal failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return typeof data === "number" ? data : 0;
}

/**
 * Create a subscription for the current user.
 *
 * @param subscription - Subscription data to insert
 * @param requestId - Request ID for logging
 * @returns Created subscription data or null if creation failed
 */
export async function createSubscription(
  subscription: {
    name: string;
    amount: number;
    currency?: string;
    billing_cycle?: "monthly" | "yearly";
    next_renewal_date: string; // YYYY-MM-DD format
    icon_url?: string | null;
    is_active?: boolean;
  },
  requestId: string,
): Promise<SubscriptionData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      name: subscription.name,
      amount: subscription.amount,
      currency: subscription.currency ?? "TL",
      billing_cycle: subscription.billing_cycle ?? "monthly",
      next_renewal_date: subscription.next_renewal_date,
      icon_url: subscription.icon_url ?? null,
      is_active: subscription.is_active ?? true,
    })
    .select("id, user_id, name, amount, currency, billing_cycle, next_renewal_date, icon_url, is_active, created_at, updated_at")
    .single();

  if (error) {
    logger.error("subscription.createSubscription failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Update a subscription for the current user.
 *
 * @param subscriptionId - ID of the subscription to update
 * @param updates - Subscription fields to update
 * @param requestId - Request ID for logging
 * @returns Updated subscription data or null if update failed
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    name?: string;
    amount?: number;
    currency?: string;
    billing_cycle?: "monthly" | "yearly";
    next_renewal_date?: string; // YYYY-MM-DD format
    icon_url?: string | null;
    is_active?: boolean;
  },
  requestId: string,
): Promise<SubscriptionData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .eq("user_id", user.id) // Ensure user owns the subscription
    .select("id, user_id, name, amount, currency, billing_cycle, next_renewal_date, icon_url, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    logger.error("subscription.updateSubscription failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data;
}

/**
 * Delete a subscription for the current user.
 *
 * @param subscriptionId - ID of the subscription to delete
 * @param requestId - Request ID for logging
 * @returns true if deletion succeeded, false otherwise
 */
export async function deleteSubscription(
  subscriptionId: string,
  requestId: string,
): Promise<boolean> {
  const user = await getCachedUser();
  if (!user) {
    return false;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("user_id", user.id); // Ensure user owns the subscription

  if (error) {
    logger.error("subscription.deleteSubscription failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}

