import { describe, expect, it } from "vitest";

import { getUtcMonthRange, getUtcMonthRangeStrict, isYearMonth, parseYearMonth } from "./month";

describe("month utils", () => {
  it("validates YYYY-MM", () => {
    expect(isYearMonth("2025-01")).toBe(true);
    expect(isYearMonth("2025-1")).toBe(false);
    expect(isYearMonth("25-01")).toBe(false);
  });

  it("returns UTC month boundaries for valid month", () => {
    const range = getUtcMonthRange("2025-12", new Date("2020-01-01T00:00:00.000Z"));
    expect(range.ym).toBe("2025-12");
    expect(range.start.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("parseYearMonth rejects invalid ranges", () => {
    expect(parseYearMonth("2025-00")).toBeNull();
    expect(parseYearMonth("2025-13")).toBeNull();
  });

  it("getUtcMonthRangeStrict returns null for invalid input", () => {
    expect(getUtcMonthRangeStrict("invalid")).toBeNull();
  });

  it("falls back to now when invalid", () => {
    const now = new Date("2025-02-15T12:00:00.000Z");
    const range = getUtcMonthRange("invalid", now);
    expect(range.ym).toBe("2025-02");
    expect(range.start.toISOString()).toBe("2025-02-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2025-03-01T00:00:00.000Z");
  });
});


