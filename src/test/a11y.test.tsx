import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/actions/fixed-expenses", () => ({
  deleteFixedExpenseAction: vi.fn(async () => ({ ok: false, message: "error" })),
  updateFixedExpenseAction: vi.fn(async () => ({ ok: true })),
}));

describe("a11y smoke", () => {
  it("FixedExpensesList has no obvious axe violations", async () => {
    const FixedExpensesList = (await import("@/features/fixed-expenses/fixed-expenses-list")).default;

    const { container } = render(
      <FixedExpensesList
        expenses={[
          { id: "3f2f2ce1-9a6b-4ad3-9b3f-9d7e5d2a2a2a", name: "Kira", amount: 2500 },
        ]}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});


