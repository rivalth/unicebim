import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createWeakEtag } from "@/lib/http/etag";
import { getRequestId } from "@/lib/http/request-id";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  const body = {
    ok: true,
    service: "unicebim",
    build: {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
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


