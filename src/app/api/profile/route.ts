import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { toFiniteNumber } from "@/lib/number";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { updateMonthlyBudgetGoalSchema } from "@/features/transactions/schemas";

export async function GET() {
  const user = await getCachedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("api.profile.select failed", { code: error.code, message: error.message });
    return NextResponse.json({ message: "Failed to fetch profile" }, { status: 500 });
  }

  const profile = data
    ? {
        ...data,
        monthly_budget_goal: toFiniteNumber(
          (data as unknown as { monthly_budget_goal?: unknown }).monthly_budget_goal,
        ),
        monthly_fixed_expenses: toFiniteNumber(
          (data as unknown as { monthly_fixed_expenses?: unknown }).monthly_fixed_expenses,
        ),
      }
    : null;

  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = updateMonthlyBudgetGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await getCachedUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (parsed.data.monthlyBudgetGoal !== undefined) {
    updates.monthly_budget_goal =
      parsed.data.monthlyBudgetGoal == null ? null : parsed.data.monthlyBudgetGoal;
  }
  if (parsed.data.monthlyFixedExpenses !== undefined) {
    updates.monthly_fixed_expenses =
      parsed.data.monthlyFixedExpenses == null ? null : parsed.data.monthlyFixedExpenses;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ profile: null }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses")
    .maybeSingle();

  if (error) {
    logger.error("api.profile.update failed", { code: error.code, message: error.message });
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 });
  }

  const profile = data
    ? {
        ...data,
        monthly_budget_goal: toFiniteNumber(
          (data as unknown as { monthly_budget_goal?: unknown }).monthly_budget_goal,
        ),
        monthly_fixed_expenses: toFiniteNumber(
          (data as unknown as { monthly_fixed_expenses?: unknown }).monthly_fixed_expenses,
        ),
      }
    : null;

  return NextResponse.json({ profile });
}


