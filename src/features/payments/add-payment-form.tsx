"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Plus, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

import { createPaymentAction } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CreatePaymentFormInput,
  createPaymentSchema,
} from "@/features/payments/schemas";

type Props = {
  defaultDueDate?: string; // YYYY-MM-DD format
  onSuccess?: () => void;
};

export default function AddPaymentForm({ defaultDueDate, onSuccess }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Default to 7 days from now if not provided
  const getDefaultDate = () => {
    if (defaultDueDate) return defaultDueDate;
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split("T")[0];
  };

  const form = useForm<CreatePaymentFormInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      name: "",
      amount: "",
      due_date: getDefaultDate(),
    },
  });

  const onSubmit = async (values: CreatePaymentFormInput) => {
    setServerError(null);
    form.clearErrors();
    setIsPending(true);

    try {
      const result = await createPaymentAction(values);
      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreatePaymentFormInput, { message: messages[0] });
        }
        return;
      }

      // Success: reset form immediately before notifying parent
      form.reset(
        { name: "", amount: "", due_date: getDefaultDate() },
        {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        },
      );
      router.refresh();
      // Notify parent after reset completes
      onSuccess?.();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="payment-name">Ödeme adı</Label>
        <Input
          id="payment-name"
          placeholder="Örn: Yurt ödemesi, Kira, Fatura"
          {...form.register("name")}
        />
        {form.formState.errors.name?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-amount">Tutar (₺)</Label>
        <Input
          id="payment-amount"
          inputMode="decimal"
          placeholder="Örn: 1500"
          {...form.register("amount")}
        />
        {form.formState.errors.amount?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.amount.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="payment-due-date">Vade tarihi</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="payment-due-date"
            type="date"
            className="pl-10"
            {...form.register("due_date")}
          />
        </div>
        {form.formState.errors.due_date?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.due_date.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Bu ödeme bütçenizden düşecek ve ödeme tarihine kadar uyarı alacaksınız.
        </p>
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        <Plus className="size-4 mr-2" aria-hidden="true" />
        {isPending ? "Yükleniyor..." : "Ödeme Ekle"}
      </Button>
    </form>
  );
}

