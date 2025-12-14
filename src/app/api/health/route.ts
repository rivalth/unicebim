import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createWeakEtag } from "@/lib/http/etag";
import { getRequestId } from "@/lib/http/request-id";

/**
 * Process start time (used to calculate uptime).
 * Set once when the module is first loaded.
 */
const processStartTime = Date.now();

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  // Calculate uptime in seconds (process.uptime() gives seconds since process started)
  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeMs = Date.now() - processStartTime;

  const body = {
    ok: true,
    service: "unicebim",
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      milliseconds: uptimeMs,
      formatted: formatUptime(uptimeSeconds),
    },
    build: {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  const json = JSON.stringify(body);
  const etag = await createWeakEtag(json);

  const cacheControl = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

  if (request.headers.get("if-none-match") === etag) {
    const res = new NextResponse(null, { status: 304 });
    res.headers.set("etag", etag);
    res.headers.set("cache-control", cacheControl);
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const res = NextResponse.json(body);
  res.headers.set("etag", etag);
  res.headers.set("cache-control", cacheControl);
  res.headers.set("x-request-id", requestId);
  return res;
}

/**
 * Format uptime seconds into a human-readable string.
 * Examples: "5s", "2m 30s", "1h 15m", "2d 3h"
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}


