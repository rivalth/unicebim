"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";

import { createFixedExpenseAction } from "@/app/actions/fixed-expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CreateFixedExpenseFormInput,
  createFixedExpenseSchema,
} from "@/features/fixed-expenses/schemas";

type Props = {
  onSuccess?: () => void;
};

export default function AddFixedExpenseForm({ onSuccess }: Props) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<CreateFixedExpenseFormInput>({
    resolver: zodResolver(createFixedExpenseSchema),
    defaultValues: {
      name: "",
      amount: "",
    },
  });

  const onSubmit = (values: CreateFixedExpenseFormInput) => {
    setServerError(null);
    form.clearErrors();

    startTransition(async () => {
      const result = await createFixedExpenseAction(values);
      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreateFixedExpenseFormInput, { message: messages[0] });
        }
        return;
      }

      // Success: reset form and notify parent to refresh
      form.reset({ name: "", amount: "" }, { keepErrors: false });
      onSuccess?.();
    });
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="name">Gider adı</Label>
        <Input
          id="name"
          placeholder="Örn: Kira, Netflix, Telefon"
          {...form.register("name")}
        />
        {form.formState.errors.name?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Tutar (₺)</Label>
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

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        <Plus className="size-4 mr-2" aria-hidden="true" />
        {isPending ? "Yükleniyor..." : "Ekle"}
      </Button>
    </form>
  );
}

