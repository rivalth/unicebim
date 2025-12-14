import "server-only";

import { logger } from "@/lib/logger";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type ProfileData = {
  id: string;
  full_name: string | null;
  monthly_budget_goal: number | null;
  monthly_fixed_expenses: number | null;
};

/**
 * Get the current user's profile.
 *
 * @param requestId - Request ID for logging
 * @returns Profile data or null if user not found
 */
export async function getProfile(requestId: string): Promise<ProfileData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("profile.getProfile failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return mapProfileRow(data);
}

/**
 * Update the current user's profile.
 *
 * @param updates - Profile fields to update
 * @param requestId - Request ID for logging
 * @returns Updated profile data or null if update failed
 */
export async function updateProfile(
  updates: Database["public"]["Tables"]["profiles"]["Update"],
  requestId: string,
): Promise<ProfileData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses")
    .maybeSingle();

  if (error) {
    logger.error("profile.updateProfile failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return mapProfileRow(data);
}

