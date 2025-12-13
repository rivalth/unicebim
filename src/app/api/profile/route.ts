import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { toFiniteNumber } from "@/lib/number";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateMonthlyBudgetGoalSchema } from "@/features/transactions/schemas";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) logger.warn("api.profile.getUser failed", { message: userError.message });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, monthly_budget_goal")
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) logger.warn("api.profile.getUser failed", { message: userError.message });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const monthlyBudgetGoal =
    parsed.data.monthlyBudgetGoal == null ? null : parsed.data.monthlyBudgetGoal;

  const { data, error } = await supabase
    .from("profiles")
    .update({ monthly_budget_goal: monthlyBudgetGoal })
    .eq("id", user.id)
    .select("id, full_name, monthly_budget_goal")
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
      }
    : null;

  return NextResponse.json({ profile });
}


