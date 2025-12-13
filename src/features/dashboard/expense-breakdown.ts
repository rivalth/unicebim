import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/features/transactions/categories";

export type ExpenseSlice = {
  category: ExpenseCategory | "Diğer";
  amount: number;
  /**
   * 0..1
   */
  percent: number;
  color: string;
};

const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  "Sosyal/Keyif": "#f97316",
  Beslenme: "#22c55e",
  Ulaşım: "#3b82f6",
  Sabitler: "#a855f7",
  Okul: "#eab308",
};

const OTHER_COLOR = "#64748b"; // slate-500

function safeNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function getExpenseBreakdown(expenses: Array<{ category: string; amount: number }>): {
  total: number;
  slices: ExpenseSlice[];
} {
  const totals: Record<string, number> = {};
  let otherTotal = 0;

  for (const e of expenses) {
    const amount = Math.max(0, safeNumber(e.amount));
    if (amount === 0) continue;

    if ((EXPENSE_CATEGORIES as readonly string[]).includes(e.category)) {
      totals[e.category] = (totals[e.category] ?? 0) + amount;
    } else {
      otherTotal += amount;
    }
  }

  const total =
    Object.values(totals).reduce((acc, v) => acc + v, 0) + (otherTotal > 0 ? otherTotal : 0);

  if (total <= 0) return { total: 0, slices: [] };

  const slices: ExpenseSlice[] = [];

  for (const category of EXPENSE_CATEGORIES) {
    const amount = totals[category] ?? 0;
    if (amount <= 0) continue;
    slices.push({
      category,
      amount,
      percent: amount / total,
      color: EXPENSE_CATEGORY_COLORS[category],
    });
  }

  if (otherTotal > 0) {
    slices.push({
      category: "Diğer",
      amount: otherTotal,
      percent: otherTotal / total,
      color: OTHER_COLOR,
    });
  }

  slices.sort((a, b) => b.amount - a.amount);

  return { total, slices };
}

export function buildConicGradient(slices: ExpenseSlice[]): string {
  if (slices.length === 0) return `conic-gradient(${OTHER_COLOR} 0deg 360deg)`;

  let cursor = 0;
  const parts = slices.map((s) => {
    const start = cursor;
    const sweep = s.percent * 360;
    const end = cursor + sweep;
    cursor = end;
    return `${s.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

export function getRealityCheckMessage(slices: ExpenseSlice[]): string {
  if (slices.length === 0) return "Bu ay henüz gider yok.";

  const top = slices[0];
  const pct = Math.round(top.percent * 100);

  const adviceByCategory: Record<string, string> = {
    "Sosyal/Keyif": "Biraz yavaşla.",
    Beslenme: "Dışarıdan söylemeyi azaltmayı deneyebilirsin.",
    Ulaşım: "Daha ekonomik bir ulaşım planı yapmayı düşün.",
    Sabitler: "Sabit giderlerini gözden geçir.",
    Okul: "Okul masraflarını önceden planla.",
    Diğer: "Harcamalarını gözden geçir.",
  };

  const advice = adviceByCategory[top.category] ?? adviceByCategory["Diğer"];

  return `Harcamalarının %${pct}'i ${top.category} kategorisine gitmiş. ${advice}`;
}


