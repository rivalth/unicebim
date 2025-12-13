import { describe, expect, it } from "vitest";

import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
  updateMonthlyBudgetGoalSchema,
} from "@/features/transactions/schemas";

describe("transactions schemas", () => {
  describe("createTransactionSchema", () => {
    it("accepts valid payload and coerces numeric input", () => {
      const parsed = createTransactionSchema.parse({
        amount: "12,5",
        type: "expense",
        category: "Beslenme",
        date: "2025-12-01",
      });

      expect(parsed.amount).toBe(12.5);
      expect(parsed.type).toBe("expense");
    });

    it("rejects invalid date format", () => {
      expect(() =>
        createTransactionSchema.parse({
          amount: 10,
          type: "income",
          category: "KYK/Burs",
          date: "01-12-2025",
        }),
      ).toThrow();
    });
  });

  describe("updateTransactionSchema", () => {
    it("accepts a valid payload", () => {
      const parsed = updateTransactionSchema.parse({
        id: "3f2f2ce1-9a6b-4ad3-9b3f-9d7e5d2a2a2a",
        amount: 100,
        type: "expense",
        category: "Ulaşım",
        date: "2025-12-02",
      });

      expect(parsed.id).toBe("3f2f2ce1-9a6b-4ad3-9b3f-9d7e5d2a2a2a");
    });
  });

  describe("deleteTransactionSchema", () => {
    it("rejects invalid UUIDs", () => {
      expect(() => deleteTransactionSchema.parse({ id: "not-a-uuid" })).toThrow();
    });
  });

  describe("updateMonthlyBudgetGoalSchema", () => {
    it("treats empty string as null", () => {
      const parsed = updateMonthlyBudgetGoalSchema.parse({ monthlyBudgetGoal: "" });
      expect(parsed.monthlyBudgetGoal).toBeNull();
    });

    it("treats empty fixed expenses as null", () => {
      const parsed = updateMonthlyBudgetGoalSchema.parse({ monthlyFixedExpenses: "" });
      expect(parsed.monthlyFixedExpenses).toBeNull();
    });
  });
});


