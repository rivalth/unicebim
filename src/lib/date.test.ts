import { describe, expect, it } from "vitest";

import { toLocalYmd } from "@/lib/date";

describe("toLocalYmd", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = toLocalYmd(new Date("2025-12-13T10:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});


