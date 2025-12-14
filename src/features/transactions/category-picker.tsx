"use client";

import { Button } from "@/components/ui/button";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionCategory,
} from "@/features/transactions/categories";
import { getCategoryMeta } from "@/features/transactions/category-meta";

export default function TransactionCategoryPicker({
  type,
  value,
  onChange,
}: {
  type: "income" | "expense";
  value: TransactionCategory;
  onChange: (category: TransactionCategory) => void;
}) {
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {categories.map((category) => {
        const { Icon, label } = getCategoryMeta(category as TransactionCategory);
        const isSelected = value === category;
        return (
          <Button
            key={category}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className="justify-start"
            onClick={() => onChange(category as TransactionCategory)}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}


