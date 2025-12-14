import "server-only";

import type { NextRequest } from "next/server";

import { getRequestId } from "@/lib/http/request-id";
import {
  jsonError,
  type ApiErrorResponse,
} from "@/lib/http/response";

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("application/json");
}

function byteLength(text: string): number {
  // Works in both Node and edge runtimes.
  return new TextEncoder().encode(text).length;
}

export type ReadJsonBodyResult =
  | { ok: true; requestId: string; data: unknown }
  | { ok: false; requestId: string; response: Response; error: ApiErrorResponse };

export async function readJsonBody(
  request: NextRequest,
  {
    maxBytes = 32 * 1024,
    requestId: requestIdOverride,
  }: { maxBytes?: number; requestId?: string } = {},
): Promise<ReadJsonBodyResult> {
  const requestId = requestIdOverride ?? getRequestId(request.headers);

  if (!isJsonContentType(request.headers.get("content-type"))) {
    const error: ApiErrorResponse = {
      message: "Unsupported media type",
      code: "UNSUPPORTED_MEDIA_TYPE",
      requestId,
    };
    return { ok: false, requestId, response: jsonError(415, error), error };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    const error: ApiErrorResponse = { message: "Invalid request body", code: "BAD_REQUEST", requestId };
    return { ok: false, requestId, response: jsonError(400, error), error };
  }

  if (byteLength(raw) > maxBytes) {
    const error: ApiErrorResponse = { message: "Payload too large", code: "PAYLOAD_TOO_LARGE", requestId };
    return { ok: false, requestId, response: jsonError(413, error), error };
  }

  if (raw.trim() === "") {
    return { ok: true, requestId, data: null };
  }

  try {
    return { ok: true, requestId, data: JSON.parse(raw) };
  } catch {
    const error: ApiErrorResponse = { message: "Invalid JSON", code: "BAD_REQUEST", requestId };
    return { ok: false, requestId, response: jsonError(400, error), error };
  }
}


