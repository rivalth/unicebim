import { describe, expect, it } from "vitest";

import { getExpectedOriginFromHeaders, getSourceOrigin, isSameOriginRequest } from "./csrf";

describe("csrf helpers", () => {
  it("extracts source origin from Origin header", () => {
    const origin = getSourceOrigin({ get: (k) => (k === "origin" ? "https://app.example.com" : null) });
    expect(origin).toBe("https://app.example.com");
  });

  it("extracts source origin from Referer header", () => {
    const origin = getSourceOrigin({
      get: (k) => (k === "referer" ? "https://app.example.com/path?q=1" : null),
    });
    expect(origin).toBe("https://app.example.com");
  });

  it("computes expected origin from forwarded headers", () => {
    const expected = getExpectedOriginFromHeaders({
      get: (k) => (k === "x-forwarded-proto" ? "https" : k === "x-forwarded-host" ? "app.example.com" : null),
    });
    expect(expected).toBe("https://app.example.com");
  });

  it("defaults proto for localhost when x-forwarded-proto is missing", () => {
    const expected = getExpectedOriginFromHeaders({
      get: (k) => (k === "host" ? "localhost:3000" : null),
    });
    expect(expected).toBe("http://localhost:3000");
  });

  it("accepts same-origin requests via Origin header", () => {
    const ok = isSameOriginRequest({
      headers: { get: (k) => (k === "origin" ? "https://app.example.com" : null) },
      expectedOrigin: "https://app.example.com",
    });
    expect(ok).toBe(true);
  });

  it("rejects cross-origin requests via Origin header", () => {
    const ok = isSameOriginRequest({
      headers: { get: (k) => (k === "origin" ? "https://evil.example.com" : null) },
      expectedOrigin: "https://app.example.com",
    });
    expect(ok).toBe(false);
  });

  it("falls back to sec-fetch-site when Origin/Referer absent", () => {
    const ok = isSameOriginRequest({
      headers: { get: (k) => (k === "sec-fetch-site" ? "same-origin" : null) },
      expectedOrigin: "https://app.example.com",
    });
    expect(ok).toBe(true);
  });
});


