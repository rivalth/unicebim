import { describe, expect, it } from "vitest";

import { calculateSmartBalance, getRemainingDaysInMonth } from "@/features/dashboard/smart-balance";

describe("smart balance", () => {
  it("calculates remaining days in month (inclusive)", () => {
    // Dec 2025 has 31 days
    expect(getRemainingDaysInMonth(new Date("2025-12-13T12:00:00Z"))).toBe(19);
    expect(getRemainingDaysInMonth(new Date("2025-12-31T12:00:00Z"))).toBe(1);
  });

  it("calculates today spendable limit using remaining fixed expenses", () => {
    const result = calculateSmartBalance({
      totalMoney: 5000,
      expenseTotal: 1200,
      plannedFixedExpenses: 2000,
      fixedExpensesPaid: 800,
      now: new Date("2025-12-21T12:00:00Z"), // 11 days remaining in Dec (21..31)
    });

    // remaining fixed = 1200, current balance = 3800, available = 2600 => 236.36...
    expect(result.remainingFixedExpenses).toBe(1200);
    expect(result.currentBalance).toBe(3800);
    expect(result.remainingDaysInMonth).toBe(11);
    expect(result.todaySpendableLimit).toBeCloseTo(2600 / 11, 5);
  });
});


