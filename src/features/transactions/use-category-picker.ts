import { useEffect } from "react";
import { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from "./categories";

const DEFAULT_EXPENSE_CATEGORY: TransactionCategory = "Beslenme";
const DEFAULT_INCOME_CATEGORY: TransactionCategory = "KYK/Burs";

/**
 * Hook to sync category selection with transaction type.
 * Automatically resets category to a valid default when type changes.
 *
 * @param form - React Hook Form instance
 * @param type - Current transaction type ("income" | "expense")
 * @param categoryFieldName - Field name for category in the form (default: "category")
 */
export function useCategoryTypeSync<T extends FieldValues>(
  form: UseFormReturn<T>,
  type: "income" | "expense",
  categoryFieldName: Path<T> = "category" as Path<T>,
) {
  useEffect(() => {
    const current = form.getValues(categoryFieldName);
    if (typeof current !== "string") return;

    const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const isValid = (categories as readonly string[]).includes(current);

    if (!isValid) {
      const defaultCategory = type === "income" ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY;
      form.setValue(categoryFieldName, defaultCategory as PathValue<T, Path<T>>, { shouldValidate: true });
    }
  }, [form, type, categoryFieldName]);
}

// Type helper for PathValue (React Hook Form internal type)
type PathValue<TFieldValues extends FieldValues, TPath extends Path<TFieldValues>> = TPath extends `${infer K}.${infer R}`
  ? K extends keyof TFieldValues
    ? R extends Path<TFieldValues[K]>
      ? PathValue<TFieldValues[K], R>
      : never
    : never
  : TPath extends keyof TFieldValues
    ? TFieldValues[TPath]
    : never;
