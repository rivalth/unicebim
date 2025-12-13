"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { createFixedExpenseAction } from "@/app/actions/fixed-expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CreateFixedExpenseFormInput,
  createFixedExpenseSchema,
} from "@/features/fixed-expenses/schemas";

type Props = {
  onAdd?: (name: string, amount: number) => void;
  onError?: (name: string, amount: number) => void;
  onSuccess?: () => void;
};

export default function AddFixedExpenseForm({ onAdd, onError, onSuccess }: Props) {
  const router = useRouter();
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

    // Parse amount for optimistic update
    const amountValue =
      typeof values.amount === "number"
        ? values.amount
        : typeof values.amount === "string"
          ? Number(values.amount.replace(",", "."))
          : 0;

    // Optimistic update: add immediately to list
    if (onAdd && Number.isFinite(amountValue) && amountValue > 0) {
      onAdd(values.name, amountValue);
    }

    // Reset form immediately (don't wait for server)
    form.reset({ name: "", amount: "" }, { keepErrors: false });

    // Submit to server in background
    startTransition(async () => {
      const result = await createFixedExpenseAction(values);
      if (!result.ok) {
        // Rollback optimistic update on error
        if (onError && Number.isFinite(amountValue) && amountValue > 0) {
          onError(values.name, amountValue);
        }

        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreateFixedExpenseFormInput, { message: messages[0] });
        }
        return;
      }

      // Success: notify parent (it will refresh to get real IDs)
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
        {isPending ? "Ekleniyor..." : "Ekle"}
      </Button>
    </form>
  );
}

