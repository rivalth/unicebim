"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import { createTransactionAction } from "@/app/actions/transactions";
import { createSubscriptionAction } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from "@/features/transactions/categories";
import TransactionCategoryPicker from "@/features/transactions/category-picker";
import {
  createTransactionSchema,
  type CreateTransactionFormInput,
} from "@/features/transactions/schemas";
import { detectSubscriptionService, getBrandIcon } from "@/lib/brand-icon";

type Props = {
  defaultDate: string; // YYYY-MM-DD
  onSuccess?: () => void; // Optional callback when transaction is successfully created
};

const DEFAULT_EXPENSE_CATEGORY: TransactionCategory = "Beslenme";
const DEFAULT_INCOME_CATEGORY: TransactionCategory = "KYK/Burs";

export default function AddTransactionForm({ defaultDate, onSuccess }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = React.useState(false);
  const [detectedService, setDetectedService] = React.useState<string | null>(null);
  const [isCreatingSubscription, setIsCreatingSubscription] = React.useState(false);

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
  const description = useWatch({ control: form.control, name: "description" });

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

  // Smart detection: Check if description contains a popular subscription service
  React.useEffect(() => {
    if (type !== "expense" || !description || description.trim().length === 0) {
      setShowSubscriptionPrompt(false);
      setDetectedService(null);
      return;
    }

    const service = detectSubscriptionService(description);
    if (service) {
      setDetectedService(service);
      setShowSubscriptionPrompt(true);
    } else {
      setShowSubscriptionPrompt(false);
      setDetectedService(null);
    }
  }, [description, type]);

  const handleCreateSubscription = async (values: CreateTransactionFormInput) => {
    setIsCreatingSubscription(true);
    try {
      // Get icon for the subscription
      const iconUrl = await getBrandIcon(values.description || "");

      // Calculate next renewal date: 1 month from transaction date (default monthly)
      const transactionDate = new Date(values.date);
      const nextRenewalDate = new Date(transactionDate);
      nextRenewalDate.setMonth(transactionDate.getMonth() + 1);

      const subscriptionResult = await createSubscriptionAction({
        name: values.description || detectedService || "Abonelik",
        amount: values.amount,
        currency: "TL",
        billing_cycle: "monthly",
        next_renewal_date: nextRenewalDate.toISOString().split("T")[0]!,
        icon_url: iconUrl,
        is_active: true,
      });

      if (!subscriptionResult.ok) {
        // If subscription creation fails, still create the transaction
        console.warn("Subscription creation failed:", subscriptionResult.message);
      }
    } catch (error) {
      // Silently fail - subscription creation is optional
      console.warn("Failed to create subscription:", error);
    } finally {
      setIsCreatingSubscription(false);
    }
  };

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

      // If subscription prompt was shown and user wants to create subscription
      // (This will be handled by a separate button/action in the UI)
      // For now, we'll create subscription automatically if detected
      if (showSubscriptionPrompt && detectedService && type === "expense") {
        await handleCreateSubscription(values);
      }

      form.reset({
        amount: "",
        type: "expense",
        category: DEFAULT_EXPENSE_CATEGORY,
        date: defaultDate,
        description: null,
      });
      setShowSubscriptionPrompt(false);
      setDetectedService(null);
      router.refresh();
      // Call onSuccess callback if provided (e.g., to close modal)
      onSuccess?.();
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
          placeholder="Örn: 120"
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
        <TransactionCategoryPicker
          type={type}
          value={(selectedCategory as TransactionCategory) ?? DEFAULT_EXPENSE_CATEGORY}
          onChange={(category) =>
            form.setValue("category", category as TransactionCategory, { shouldValidate: true })
          }
        />
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

      <div className="grid gap-2">
        <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
        <textarea
          id="description"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          placeholder="İşlem hakkında not ekleyin..."
          maxLength={500}
          {...form.register("description")}
        />
        {form.formState.errors.description?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.description.message}
          </p>
        ) : null}
        {showSubscriptionPrompt && detectedService && type === "expense" && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-primary">
              Bu bir abonelik gibi görünüyor: <span className="capitalize">{detectedService}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              İşlemi kaydettiğinde bu abonelik otomatik olarak abonelikler listesine eklenecek.
            </p>
          </div>
        )}
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || isCreatingSubscription}>
        {isPending || isCreatingSubscription ? "Kaydediliyor..." : "Ekle"}
      </Button>
    </form>
  );
}


