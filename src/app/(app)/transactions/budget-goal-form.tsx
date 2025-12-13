"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { updateMonthlyBudgetGoalAction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type UpdateMonthlyBudgetGoalFormInput,
  updateMonthlyBudgetGoalSchema,
} from "@/features/transactions/schemas";

type Props = {
  initialMonthlyBudgetGoal: number | null;
  initialMonthlyFixedExpenses: number | null;
};

export default function BudgetGoalForm({
  initialMonthlyBudgetGoal,
  initialMonthlyFixedExpenses,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<UpdateMonthlyBudgetGoalFormInput>({
    resolver: zodResolver(updateMonthlyBudgetGoalSchema),
    defaultValues: {
      monthlyBudgetGoal: initialMonthlyBudgetGoal ?? "",
      monthlyFixedExpenses: initialMonthlyFixedExpenses ?? "",
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

  return (
    <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="monthlyBudgetGoal">Aylık hedef bütçe (₺)</Label>
        <Input
          id="monthlyBudgetGoal"
          inputMode="decimal"
          placeholder="Örn: 5000"
          {...form.register("monthlyBudgetGoal")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="monthlyFixedExpenses">Aylık sabit giderler (₺)</Label>
        <Input
          id="monthlyFixedExpenses"
          inputMode="decimal"
          placeholder="Örn: 2200"
          {...form.register("monthlyFixedExpenses")}
        />
        <p className="text-xs text-muted-foreground">
          Kira/yurt, abonelikler ve telefon gibi sabit giderler için ayırdığın toplam tutar.
        </p>
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
  );
}


