import "server-only";

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type FieldErrors = Record<string, string[] | undefined>;

export type ApiErrorResponse = {
  message: string;
  code: ApiErrorCode;
  requestId: string;
  issues?: FieldErrors;
};

export function jsonOk<T>(data: T, requestId: string, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("x-request-id", requestId);
  return res;
}

export function jsonError(status: number, body: ApiErrorResponse) {
  const res = NextResponse.json(body, { status });
  res.headers.set("x-request-id", body.requestId);
  return res;
}

export function unauthorized(requestId: string) {
  return jsonError(401, { message: "Unauthorized", code: "UNAUTHORIZED", requestId });
}

export function forbidden(requestId: string) {
  return jsonError(403, { message: "Forbidden", code: "FORBIDDEN", requestId });
}

export function badRequest(requestId: string, message = "Bad request") {
  return jsonError(400, { message, code: "BAD_REQUEST", requestId });
}

export function invalidPayload(requestId: string, issues: FieldErrors) {
  return jsonError(400, { message: "Invalid payload", code: "VALIDATION_ERROR", requestId, issues });
}

export function unsupportedMediaType(requestId: string) {
  return jsonError(415, { message: "Unsupported media type", code: "UNSUPPORTED_MEDIA_TYPE", requestId });
}

export function payloadTooLarge(requestId: string) {
  return jsonError(413, { message: "Payload too large", code: "PAYLOAD_TOO_LARGE", requestId });
}

export function tooManyRequests(requestId: string, retryAfterSeconds?: number) {
  const res = jsonError(429, { message: "Too many requests", code: "RATE_LIMITED", requestId });
  if (retryAfterSeconds && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    res.headers.set("retry-after", String(Math.ceil(retryAfterSeconds)));
  }
  return res;
}

export function internalError(requestId: string, message = "Server error") {
  return jsonError(500, { message, code: "INTERNAL_ERROR", requestId });
}


