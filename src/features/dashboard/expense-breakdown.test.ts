import { describe, expect, it } from "vitest";

import { buildConicGradient, getExpenseBreakdown, getRealityCheckMessage } from "@/features/dashboard/expense-breakdown";

describe("expense breakdown", () => {
  it("returns empty slices when there are no expenses", () => {
    const result = getExpenseBreakdown([]);
    expect(result.total).toBe(0);
    expect(result.slices).toEqual([]);
    expect(getRealityCheckMessage(result.slices)).toBe("Bu ay henüz gider yok.");
  });

  it("groups and sorts categories and generates a message", () => {
    const { total, slices } = getExpenseBreakdown([
      { category: "Sosyal/Keyif", amount: 600 },
      { category: "Beslenme", amount: 400 },
    ]);

    expect(total).toBe(1000);
    expect(slices[0].category).toBe("Sosyal/Keyif");
    expect(slices[0].percent).toBeCloseTo(0.6, 5);

    const message = getRealityCheckMessage(slices);
    expect(message).toContain("%60");
    expect(message).toContain("Sosyal/Keyif");

    const gradient = buildConicGradient(slices);
    expect(gradient).toContain("conic-gradient(");
  });
});


