"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import { createTransactionAction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from "@/features/transactions/categories";
import { getCategoryMeta } from "@/features/transactions/category-meta";
import {
  createTransactionSchema,
  type CreateTransactionFormInput,
} from "@/features/transactions/schemas";

type Props = {
  defaultDate: string; // YYYY-MM-DD
};

const DEFAULT_EXPENSE_CATEGORY: TransactionCategory = "Beslenme";
const DEFAULT_INCOME_CATEGORY: TransactionCategory = "KYK/Burs";

export default function AddTransactionForm({ defaultDate }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<CreateTransactionFormInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: "",
      type: "expense",
      category: DEFAULT_EXPENSE_CATEGORY,
      date: defaultDate,
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });

  React.useEffect(() => {
    const current = form.getValues("category");
    if (type === "income") {
      const isValid = (INCOME_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) {
        form.setValue("category", DEFAULT_INCOME_CATEGORY, { shouldValidate: true });
      }
    } else {
      const isValid = (EXPENSE_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) {
        form.setValue("category", DEFAULT_EXPENSE_CATEGORY, { shouldValidate: true });
      }
    }
  }, [form, type]);

  const onSubmit = (values: CreateTransactionFormInput) => {
    setServerError(null);

    startTransition(async () => {
      const result = await createTransactionAction(values);

      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreateTransactionFormInput, { message: messages[0] });
        }
        return;
      }

      form.reset({
        amount: "",
        type: "expense",
        category: DEFAULT_EXPENSE_CATEGORY,
        date: defaultDate,
      });
      router.refresh();
    });
  };

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="type">Tür</Label>
        <select
          id="type"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("type")}
        >
          <option value="expense">Gider</option>
          <option value="income">Gelir</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Tutar</Label>
        <Input
          id="amount"
          inputMode="decimal"
          placeholder="0"
          {...form.register("amount")}
        />
        {form.formState.errors.amount?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.amount.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Kategori</Label>
        <input id="category" type="hidden" {...form.register("category")} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => {
            const { Icon, label } = getCategoryMeta(category as TransactionCategory);
            const isSelected = selectedCategory === category;
            return (
              <Button
                key={category}
                type="button"
                variant={isSelected ? "default" : "outline"}
                className="justify-start"
                onClick={() => form.setValue("category", category as TransactionCategory, { shouldValidate: true })}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Button>
            );
          })}
        </div>
        {form.formState.errors.category?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.category.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="date">Tarih</Label>
        <Input id="date" type="date" {...form.register("date")} />
        {form.formState.errors.date?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.date.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor..." : "Ekle"}
      </Button>
    </form>
  );
}


