import "server-only";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { isMissingRpcFunctionError } from "@/lib/supabase/errors";
import { toFiniteNumber } from "@/lib/number";

export type PaymentData = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentWithAnalysis = PaymentData & {
  days_until_due: number;
  total_unpaid_amount: number;
};

/**
 * Normalize payment amount from database (handles numeric/string conversion)
 */
function normalizePaymentAmount(amount: unknown): number {
  return toFiniteNumber(amount);
}

/**
 * Map database row to PaymentData
 */
function mapPaymentRow(row: Database["public"]["Tables"]["upcoming_payments"]["Row"]): PaymentData {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    amount: normalizePaymentAmount(row.amount),
    due_date: row.due_date,
    is_paid: row.is_paid,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create a new upcoming payment for the current user.
 */
export async function createPayment(
  payment: {
    name: string;
    amount: number;
    due_date: string; // YYYY-MM-DD format
  },
  requestId: string,
): Promise<PaymentData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("upcoming_payments")
    .insert({
      user_id: user.id,
      name: payment.name,
      amount: payment.amount,
      due_date: payment.due_date,
    })
    .select()
    .single();

  if (error) {
    logger.error("payment.createPayment failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return mapPaymentRow(data);
}

/**
 * Update an existing payment for the current user.
 */
export async function updatePayment(
  paymentId: string,
  updates: Database["public"]["Tables"]["upcoming_payments"]["Update"],
  requestId: string,
): Promise<PaymentData | null> {
  const user = await getCachedUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("upcoming_payments")
    .update(updates)
    .eq("id", paymentId)
    .eq("user_id", user.id) // Ensure user owns the payment
    .select()
    .maybeSingle();

  if (error) {
    logger.error("payment.updatePayment failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null; // Payment not found or user doesn't own it
  }

  return mapPaymentRow(data);
}

/**
 * Delete a payment for the current user.
 */
export async function deletePayment(paymentId: string, requestId: string): Promise<boolean> {
  const user = await getCachedUser();
  if (!user) {
    return false;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("upcoming_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", user.id); // Ensure user owns the payment

  if (error) {
    logger.error("payment.deletePayment failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}

/**
 * Get all upcoming payments for the current user with analysis data.
 */
export async function getUpcomingPaymentsWithAnalysis(
  requestId: string,
): Promise<PaymentWithAnalysis[]> {
  const user = await getCachedUser();
  if (!user) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  // Try to use RPC function first
  const rpcResult = await supabase.rpc("get_upcoming_payments_with_analysis", {
    p_user_id: user.id,
  });

  if (!rpcResult.error) {
    const data = rpcResult.data ?? [];
    return data.map((row) => ({
      id: row.id,
      user_id: user.id,
      name: row.name,
      amount: normalizePaymentAmount(row.amount),
      due_date: row.due_date,
      is_paid: row.is_paid,
      paid_at: row.paid_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      days_until_due: Number.isFinite(row.days_until_due) ? row.days_until_due : 0,
      total_unpaid_amount: normalizePaymentAmount(row.total_unpaid_amount),
    }));
  }

  if (isMissingRpcFunctionError(rpcResult.error)) {
    logger.warn("payment.getUpcomingPaymentsWithAnalysis missing RPC (fallback)", {
      requestId,
      code: rpcResult.error.code,
      message: rpcResult.error.message,
    });

    // Fallback: query directly and calculate analysis
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const { data: payments, error } = await supabase
      .from("upcoming_payments")
      .select("*")
      .eq("user_id", user.id)
      .or(`is_paid.eq.false,and(due_date.gte.${todayStr})`)
      .order("due_date", { ascending: true });

    if (error) {
      logger.error("payment.getUpcomingPaymentsWithAnalysis fallback failed", {
        requestId,
        code: error.code,
        message: error.message,
      });
      return [];
    }

    const unpaidPayments = (payments ?? []).filter((p) => !p.is_paid);
    const totalUnpaidAmount = unpaidPayments.reduce(
      (sum, p) => sum + normalizePaymentAmount(p.amount),
      0,
    );

    return (payments ?? []).map((row) => {
      const dueDate = new Date(row.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.max(
        0,
        Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      );

      return {
        ...mapPaymentRow(row),
        days_until_due: daysUntilDue,
        total_unpaid_amount: totalUnpaidAmount,
      };
    });
  }

  logger.error("payment.getUpcomingPaymentsWithAnalysis failed", {
    requestId,
    code: rpcResult.error.code,
    message: rpcResult.error.message,
  });
  return [];
}

/**
 * Get total unpaid upcoming payments amount for the current user.
 */
export async function getUnpaidPaymentsTotal(requestId: string): Promise<number> {
  const user = await getCachedUser();
  if (!user) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();

  const rpcResult = await supabase.rpc("get_unpaid_upcoming_payments_total", {
    p_user_id: user.id,
  });

  if (!rpcResult.error) {
    return normalizePaymentAmount(rpcResult.data);
  }

  if (isMissingRpcFunctionError(rpcResult.error)) {
    logger.warn("payment.getUnpaidPaymentsTotal missing RPC (fallback)", {
      requestId,
      code: rpcResult.error.code,
      message: rpcResult.error.message,
    });

    // Fallback: query directly
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: payments, error } = await supabase
      .from("upcoming_payments")
      .select("amount")
      .eq("user_id", user.id)
      .eq("is_paid", false)
      .gte("due_date", today.toISOString().split("T")[0]);

    if (error) {
      logger.error("payment.getUnpaidPaymentsTotal fallback failed", {
        requestId,
        code: error.code,
        message: error.message,
      });
      return 0;
    }

    return (payments ?? []).reduce((sum, p) => sum + normalizePaymentAmount(p.amount), 0);
  }

  logger.error("payment.getUnpaidPaymentsTotal failed", {
    requestId,
    code: rpcResult.error.code,
    message: rpcResult.error.message,
  });
  return 0;
}

