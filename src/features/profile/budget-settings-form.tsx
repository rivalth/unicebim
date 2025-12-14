"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { updateMonthlyBudgetGoalAction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type UpdateMonthlyBudgetGoalFormInput,
  updateMonthlyBudgetGoalSchema,
} from "@/features/transactions/schemas";
import AddFixedExpenseForm from "@/features/fixed-expenses/add-fixed-expense-form";
import FixedExpensesList from "@/features/fixed-expenses/fixed-expenses-list";

type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

type Props = {
  initialMonthlyBudgetGoal: number | null;
  initialNextIncomeDate: string | null;
  initialMealPrice: number | null;
  fixedExpenses: FixedExpense[];
  monthlyFixedExpenses?: number | null; // DB-calculated total from profiles.monthly_fixed_expenses
};

export default function BudgetSettingsForm({
  initialMonthlyBudgetGoal,
  initialNextIncomeDate,
  initialMealPrice,
  fixedExpenses: initialFixedExpenses,
  monthlyFixedExpenses,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [expenses, setExpenses] = React.useState<FixedExpense[]>(initialFixedExpenses);

  // Sync with server data when it changes (e.g., after refresh)
  React.useEffect(() => {
    setExpenses(initialFixedExpenses);
  }, [initialFixedExpenses]);

  const form = useForm<UpdateMonthlyBudgetGoalFormInput>({
    resolver: zodResolver(updateMonthlyBudgetGoalSchema),
    defaultValues: {
      // Convert to string for form inputs. `0` or `null` becomes empty string (schema requires positive).
      monthlyBudgetGoal:
        initialMonthlyBudgetGoal == null || initialMonthlyBudgetGoal === 0
          ? ""
          : String(initialMonthlyBudgetGoal),
      nextIncomeDate: initialNextIncomeDate ?? "",
      mealPrice: initialMealPrice == null || initialMealPrice === 0 ? "" : String(initialMealPrice),
    },
  });

  const onSubmit = (values: UpdateMonthlyBudgetGoalFormInput) => {
    setServerError(null);

    startTransition(async () => {
      const result = await updateMonthlyBudgetGoalAction(values);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      router.refresh();
    });
  };

  const handleAddSuccess = React.useCallback(() => {
    // Refresh to get updated data from server
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <Label htmlFor="monthlyBudgetGoal">Aylık hedef bütçe (₺)</Label>
          <Input
            id="monthlyBudgetGoal"
            inputMode="decimal"
            placeholder="Örn: 5000"
            {...form.register("monthlyBudgetGoal")}
          />
          {form.formState.errors.monthlyBudgetGoal?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.monthlyBudgetGoal.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nextIncomeDate">Bir sonraki gelir/burs tarihi</Label>
          <Input
            id="nextIncomeDate"
            type="date"
            {...form.register("nextIncomeDate")}
            min={new Date().toISOString().split("T")[0]}
          />
          <p className="text-xs text-muted-foreground">
            Burs veya gelir gününü seç. Dashboard&apos;da günlük harcama limiti hesaplanır.
          </p>
          {form.formState.errors.nextIncomeDate?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.nextIncomeDate.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mealPrice">Yemekhane öğün fiyatı (₺)</Label>
          <Input
            id="mealPrice"
            inputMode="decimal"
            placeholder="Örn: 15"
            {...form.register("mealPrice")}
          />
          <p className="text-xs text-muted-foreground">
            Okulda bir öğün yemeğin fiyatı. Dashboard&apos;da bakiyeni &quot;kaç öğün yemek&quot; olarak görebilirsin.
          </p>
          {form.formState.errors.mealPrice?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.mealPrice.message}
            </p>
          ) : null}
        </div>

        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Aylık sabit giderler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kira/yurt, abonelikler ve telefon gibi sabit giderlerini ekle. Sistem otomatik olarak
            toplamı hesaplar.
          </p>
          <div className="border-b pb-4">
            <AddFixedExpenseForm onSuccess={handleAddSuccess} />
          </div>
          <FixedExpensesList expenses={expenses} total={monthlyFixedExpenses} />
        </CardContent>
      </Card>
    </div>
  );
}