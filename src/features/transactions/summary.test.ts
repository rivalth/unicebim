import { describe, expect, it } from "vitest";

import { calculateMonthlySummary } from "@/features/transactions/summary";

describe("calculateMonthlySummary", () => {
  it("returns zeros for empty list", () => {
    expect(calculateMonthlySummary([])).toEqual({
      incomeTotal: 0,
      expenseTotal: 0,
      netTotal: 0,
    });
  });

  it("sums incomes and expenses separately", () => {
    const result = calculateMonthlySummary([
      { type: "income", amount: 1000 },
      { type: "expense", amount: 250 },
      { type: "expense", amount: 50 },
    ]);

    expect(result).toEqual({
      incomeTotal: 1000,
      expenseTotal: 300,
      netTotal: 700,
    });
  });
});


