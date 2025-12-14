import { describe, expect, it } from "vitest";

import { buildRateLimitKey, getClientIp } from "./rate-limit";

describe("rate-limit helpers", () => {
  describe("getClientIp", () => {
    it("uses first x-forwarded-for entry", () => {
      const ip = getClientIp({
        get: (k) => (k === "x-forwarded-for" ? "1.1.1.1, 2.2.2.2" : null),
      });
      expect(ip).toBe("1.1.1.1");
    });

    it("falls back to x-real-ip", () => {
      const ip = getClientIp({
        get: (k) => (k === "x-real-ip" ? "3.3.3.3" : null),
      });
      expect(ip).toBe("3.3.3.3");
    });

    it("returns null when no ip headers", () => {
      const ip = getClientIp({ get: () => null });
      expect(ip).toBeNull();
    });
  });

  it("buildRateLimitKey is stable and bounded", () => {
    const key = buildRateLimitKey({
      scope: "auth.login",
      ip: "1.1.1.1",
      userId: null,
    });
    expect(key).toContain("auth.login");
    expect(key.length).toBeLessThanOrEqual(200);
  });
});


