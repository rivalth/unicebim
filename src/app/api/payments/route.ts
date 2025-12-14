import type { NextRequest } from "next/server";

import { getRequestId } from "@/lib/http/request-id";
import { internalError, jsonOk, unauthorized } from "@/lib/http/response";
import { getUpcomingPaymentsWithAnalysis } from "@/services/payment.service";
import { getCachedUser } from "@/lib/supabase/server";

/**
 * GET /api/payments
 * 
 * Get all upcoming payments for the current user with analysis data.
 * 
 * Returns: Array of payments with days_until_due and total_unpaid_amount
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  const user = await getCachedUser();
  if (!user) {
    return unauthorized(requestId);
  }

  try {
    const payments = await getUpcomingPaymentsWithAnalysis(requestId);

    return jsonOk(
      {
        data: payments,
        meta: {
          requestId,
          count: payments.length,
        },
      },
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return internalError(requestId, message);
  }
}

