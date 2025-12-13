import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/url";

describe("safeRedirectPath", () => {
  it("returns fallback for non-string inputs", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });

  it("allows relative paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/dashboard?tab=1")).toBe("/dashboard?tab=1");
  });

  it("rejects absolute URLs and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
  });

  it("rejects non-path inputs", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeRedirectPath("dashboard")).toBe("/dashboard");
  });

  it("supports custom fallback", () => {
    expect(safeRedirectPath("https://evil.com", "/login")).toBe("/login");
  });
});


