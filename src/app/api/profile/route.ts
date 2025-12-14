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
import { isSameOriginRequest } from "@/lib/security/csrf";
import { buildRateLimitKey, enforceRateLimit, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { getProfile, updateProfile } from "@/services/profile.service";
import type { Database } from "@/lib/supabase/types";
import { updateMonthlyBudgetGoalSchema } from "@/features/transactions/schemas";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);
  const profile = await getProfile(requestId);

  if (!profile) {
    return unauthorized(requestId);
  }

  const res = jsonOk({ profile }, requestId);
  res.headers.set("cache-control", "no-store");
  return res;
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  const expectedOrigin = new URL(request.url).origin;
  if (!isSameOriginRequest({ headers: request.headers, expectedOrigin })) {
    logger.warn("csrf.blocked", {
      requestId,
      route: "/api/profile",
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
    });
    return forbidden(requestId);
  }

  const body = await readJsonBody(request, { requestId });
  if (!body.ok) return body.response;

  const parsed = updateMonthlyBudgetGoalSchema.safeParse(body.data);
  if (!parsed.success) {
    return invalidPayload(requestId, parsed.error.flatten().fieldErrors);
  }

  // Check if user exists by trying to get profile
  const existingProfile = await getProfile(requestId);
  if (!existingProfile) {
    return unauthorized(requestId);
  }

  const ip = getClientIp(request.headers);
  const rl = await enforceRateLimit({
    key: buildRateLimitKey({ scope: "profile.write", ip, userId: existingProfile.id }),
    policy: rateLimitPolicies["profile.write"],
    requestId,
    context: { route: "/api/profile", userId: existingProfile.id },
  });
  if (!rl.ok) return rl.response;

  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (parsed.data.monthlyBudgetGoal !== undefined) {
    updates.monthly_budget_goal =
      parsed.data.monthlyBudgetGoal == null ? null : parsed.data.monthlyBudgetGoal;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest(requestId, "No fields to update");
  }

  const profile = await updateProfile(updates, requestId);

  if (!profile) {
    return internalError(requestId, "Failed to update profile");
  }

  const res = jsonOk({ profile }, requestId);
  res.headers.set("cache-control", "no-store");
  return res;
}


