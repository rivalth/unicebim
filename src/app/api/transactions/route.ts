import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTransactionSchema } from "@/features/transactions/schemas";
import { calculateMonthlySummary } from "@/features/transactions/summary";

function getMonthRange(monthParam: string | null) {
  const now = new Date();

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yearStr, monthStr] = monthParam.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      return { ym: monthParam, start, end };
    }
  }

  const ym = now.toISOString().slice(0, 7);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { ym, start, end };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const range = getMonthRange(monthParam);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) logger.warn("api.transactions.getUser failed", { message: userError.message });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: txRaw, error } = await supabase
    .from("transactions")
    .select("id, amount, type, category, date")
    .eq("user_id", user.id)
    .gte("date", range.start.toISOString())
    .lt("date", range.end.toISOString())
    .order("date", { ascending: false });

  if (error) {
    logger.error("api.transactions.select failed", { code: error.code, message: error.message });
    return NextResponse.json({ message: "Failed to fetch transactions" }, { status: 500 });
  }

  const transactions = (txRaw ?? []).map((t) => {
    const rawAmount = (t as unknown as { amount: unknown }).amount;
    const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
    return {
      ...t,
      amount: Number.isFinite(amount) ? amount : 0,
    };
  });

  const summary = calculateMonthlySummary(
    transactions.map((t) => ({ amount: t.amount, type: t.type })),
  );

  return NextResponse.json({
    month: range.ym,
    summary,
    transactions,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const date = new Date(parsed.data.date);
  if (!Number.isFinite(date.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) logger.warn("api.transactions.getUser failed", { message: userError.message });

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      date: date.toISOString(),
    })
    .select("id, amount, type, category, date")
    .single();

  if (error) {
    logger.error("api.transactions.insert failed", { code: error.code, message: error.message });
    return NextResponse.json({ message: "Failed to create transaction" }, { status: 500 });
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}


