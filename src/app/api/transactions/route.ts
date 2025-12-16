import type { NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { readJsonBody } from "@/lib/http/request";
import { getRequestId } from "@/lib/http/request-id";
import {
  badRequest,
  forbidden,
  internalError,
  invalidPayload,
  jsonOk,
  unauthorized,
} from "@/lib/http/response";
import { getUtcMonthRange, getUtcMonthRangeStrict } from "@/lib/month";
import { decodeTxCursor, encodeTxCursor } from "@/lib/pagination/tx-cursor";
import { isSameOriginRequest } from "@/lib/security/csrf";
import { buildRateLimitKey, enforceRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { mapTransactionRow, normalizeTransactionAmount } from "@/lib/supabase/mappers";
import { isMissingRpcFunctionError } from "@/lib/supabase/errors";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import { toFiniteNumber } from "@/lib/number";
import { createTransactionSchema } from "@/features/transactions/schemas";
import { calculateMonthlySummary } from "@/features/transactions/summary";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const categoryParam = url.searchParams.get("category");
  const typeParam = url.searchParams.get("type");
  // const searchParam = url.searchParams.get("search"); // For future text search

  const range = monthParam ? getUtcMonthRangeStrict(monthParam) : getUtcMonthRange(null);
  if (!range) {
    return badRequest(requestId, "Invalid month");
  }

  const DEFAULT_LIMIT = 50;
  const MAX_LIMIT = 200;

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam == null ? DEFAULT_LIMIT : Number(limitParam);
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return badRequest(requestId, "Invalid limit");
  }

  const cursorParam = url.searchParams.get("cursor");
  const cursor = cursorParam ? decodeTxCursor(cursorParam) : null;
  if (cursorParam && !cursor) {
    return badRequest(requestId, "Invalid cursor");
  }

  const user = await getCachedUser();

  if (!user) {
    return unauthorized(requestId);
  }

  const supabase = await createSupabaseServerClient();

  const summaryResult = await supabase.rpc("get_monthly_summary", {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
  });
  const { data: summaryRows, error: summaryError } = summaryResult;

  const pageSize = limit + 1;

  // Prefer RPC keyset pagination. Fail-open to direct table query if function is missing.
  const rpcResult = (await supabase.rpc("get_transactions_page", {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
    p_limit: pageSize,
    p_cursor_date: cursor?.date ?? null,
    p_cursor_id: cursor?.id ?? null,
  })) as {
    data: Array<{ id: string; amount: unknown; type: "income" | "expense"; category: string; date: string; description: string | null }> | null;
    error: { code?: string; message?: string } | null;
  };

  // Apply client-side filters (category, type)
  // TODO: Move filtering to RPC function for better performance
  let filteredTxRaw = rpcResult.data ?? [];
  if (categoryParam) {
    filteredTxRaw = filteredTxRaw.filter((t) => t.category === categoryParam);
  }
  if (typeParam === "income" || typeParam === "expense") {
    filteredTxRaw = filteredTxRaw.filter((t) => t.type === typeParam);
  }

  let txRaw: Array<{ id: string; amount: unknown; type: "income" | "expense"; category: string; date: string; description: string | null }> =
    filteredTxRaw;

  if (rpcResult.error) {
    if (isMissingRpcFunctionError(rpcResult.error)) {
      // Fallback path (approx. keyset pagination).
      let q = supabase
        .from("transactions")
        .select("id, amount, type, category, date, description")
        .eq("user_id", user.id)
        .gte("date", range.start.toISOString())
        .lt("date", range.end.toISOString())
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .limit(pageSize);

      if (cursor) {
        // Approximate fallback: strict keyset requires OR filters; keep it simple and safe here.
        q = q.lt("date", cursor.date);
      }

      // Apply filters in fallback query
      if (categoryParam) {
        q = q.eq("category", categoryParam);
      }
      if (typeParam === "income" || typeParam === "expense") {
        q = q.eq("type", typeParam);
      }

      const { data, error } = await q;
      if (error) {
        logger.error("api.transactions.select fallback failed", {
          requestId,
          code: error.code,
          message: error.message,
        });
        return internalError(requestId, "Failed to fetch transactions");
      }

      txRaw = data ?? [];
    } else {
      logger.error("api.transactions.get_transactions_page failed", {
        requestId,
        code: rpcResult.error.code,
        message: rpcResult.error.message,
      });
      return internalError(requestId, "Failed to fetch transactions");
    }
  }

  const transactionsPage = txRaw.map(mapTransactionRow);

  const hasMore = transactionsPage.length > limit;
  const transactions = hasMore ? transactionsPage.slice(0, limit) : transactionsPage;
  const nextCursor =
    hasMore && transactions.length > 0
      ? encodeTxCursor({ id: transactions[transactions.length - 1]!.id, date: transactions[transactions.length - 1]!.date })
      : null;

  let summary: { incomeTotal: number; expenseTotal: number; netTotal: number };

  const summaryFromDb = summaryRows?.[0];
  if (summaryFromDb && !summaryError) {
    summary = {
      incomeTotal: toFiniteNumber(
        (summaryFromDb as unknown as { income_total?: unknown }).income_total,
      ) ?? 0,
      expenseTotal: toFiniteNumber(
        (summaryFromDb as unknown as { expense_total?: unknown }).expense_total,
      ) ?? 0,
      netTotal: toFiniteNumber(
        (summaryFromDb as unknown as { net_total?: unknown }).net_total,
      ) ?? 0,
    };
  } else {
    const ctx = { requestId, code: summaryError?.code, message: summaryError?.message };
    if (summaryError) {
      if (isMissingRpcFunctionError(summaryError)) {
        logger.warn("api.transactions.get_monthly_summary missing (fallback)", ctx);
      } else {
        logger.error("api.transactions.get_monthly_summary failed (fallback)", ctx);
      }
    }

    // Accurate fallback: compute from full month amounts/types if RPC is unavailable.
    const { data: allRaw, error: allError } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("date", range.start.toISOString())
      .lt("date", range.end.toISOString());

    if (allError) {
      logger.error("api.transactions.summary fallback select failed", {
        requestId,
        code: allError.code,
        message: allError.message,
      });
      return internalError(requestId, "Failed to fetch transactions");
    }

      const txForSummary = (allRaw ?? []).map((t) => ({
        amount: normalizeTransactionAmount((t as unknown as { amount: unknown }).amount),
        type: t.type,
      }));

    summary = calculateMonthlySummary(txForSummary);
  }

  const res = jsonOk(
    {
      month: range.ym,
      summary,
      transactions,
      nextCursor,
    },
    requestId,
  );
  res.headers.set("cache-control", "no-store");
  return res;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  const expectedOrigin = new URL(request.url).origin;
  if (!isSameOriginRequest({ headers: request.headers, expectedOrigin })) {
    logger.warn("csrf.blocked", {
      requestId,
      route: "/api/transactions",
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
    });
    return forbidden(requestId);
  }

  const body = await readJsonBody(request, { requestId });
  if (!body.ok) return body.response;

  const parsed = createTransactionSchema.safeParse(body.data);
  if (!parsed.success) {
    return invalidPayload(requestId, parsed.error.flatten().fieldErrors);
  }

  const date = new Date(parsed.data.date);
  if (!Number.isFinite(date.getTime())) {
    return badRequest(requestId, "Invalid date");
  }

  const user = await getCachedUser();

  if (!user) {
    return unauthorized(requestId);
  }

  const ip = getClientIp(request.headers);
  const rl = await enforceRateLimit({
    key: buildRateLimitKey({ scope: "tx.write", ip, userId: user.id }),
    policy: rateLimitPolicies["tx.write"],
    requestId,
    context: { route: "/api/transactions", userId: user.id },
  });
  if (!rl.ok) return rl.response;

  const supabase = await createSupabaseServerClient();

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
    logger.error("api.transactions.insert failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return internalError(requestId, "Failed to create transaction");
  }

  const res = jsonOk({ transaction: data }, requestId, { status: 201 });
  res.headers.set("cache-control", "no-store");
  return res;
}


