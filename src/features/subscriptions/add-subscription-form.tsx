"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Loader2, ImageIcon, ChevronDown } from "lucide-react";

import { createSubscriptionAction } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrandIcon, POPULAR_SUBSCRIPTION_SERVICES } from "@/lib/brand-icon";
import {
  type CreateSubscriptionFormInput,
  createSubscriptionSchema,
} from "@/features/subscriptions/schemas";

type Props = {
  onSuccess?: () => void;
};

export default function AddSubscriptionForm({ onSuccess }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [isFetchingIcon, setIsFetchingIcon] = React.useState(false);
  const [iconUrl, setIconUrl] = React.useState<string | null>(null);
  const [iconError, setIconError] = React.useState(false);

  // Calculate default next renewal date (1 month from today for monthly, 1 year for yearly)
  const getDefaultNextRenewalDate = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    return nextMonth.toISOString().split("T")[0]!;
  };

  const form = useForm<CreateSubscriptionFormInput>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      name: "",
      amount: "",
      currency: "TL",
      billing_cycle: "monthly",
      next_renewal_date: getDefaultNextRenewalDate(),
      icon_url: null,
      is_active: true,
    },
  });

  const billingCycle = useWatch({ control: form.control, name: "billing_cycle" });

  // Update next_renewal_date when billing_cycle changes
  React.useEffect(() => {
    const currentDate = form.getValues("next_renewal_date");
    if (!currentDate || typeof currentDate !== "string") return;

    const current = new Date(currentDate);
    if (!Number.isFinite(current.getTime())) return;

    const newDate = new Date(current);

    if (billingCycle === "monthly") {
      newDate.setMonth(current.getMonth() + 1);
    } else if (billingCycle === "yearly") {
      newDate.setFullYear(current.getFullYear() + 1);
    }

    form.setValue("next_renewal_date", newDate.toISOString().split("T")[0]!);
  }, [billingCycle, form]);

  const name = useWatch({ control: form.control, name: "name" });

  // Auto-fetch icon when name changes (debounced)
  React.useEffect(() => {
    if (!name || name.trim().length === 0) {
      setIconUrl(null);
      form.setValue("icon_url", null);
      setIsFetchingIcon(false);
      setIconError(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsFetchingIcon(true);
      setIconError(false);
      try {
        const icon = await getBrandIcon(name);
        if (icon) {
          setIconUrl(icon);
          form.setValue("icon_url", icon);
        } else {
          setIconUrl(null);
          form.setValue("icon_url", null);
        }
      } catch {
        // Silently fail - icon fetching is optional
        setIconUrl(null);
        form.setValue("icon_url", null);
        setIconError(true);
      } finally {
        setIsFetchingIcon(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [name, form]);

  const onSubmit = async (values: CreateSubscriptionFormInput) => {
    setServerError(null);
    form.clearErrors();
    setIsPending(true);

    try {
      const result = await createSubscriptionAction(values);
      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreateSubscriptionFormInput, { message: messages[0] });
        }
        return;
      }

      // Success: reset form
      form.reset(
        {
          name: "",
          amount: "",
          currency: "TL",
          billing_cycle: "monthly",
          next_renewal_date: getDefaultNextRenewalDate(),
          icon_url: null,
          is_active: true,
        },
        {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        },
      );
      setIconUrl(null);
      router.refresh();
      onSuccess?.();
    } finally {
      setIsPending(false);
    }
  };

  const handleServiceSelect = React.useCallback((service: string) => {
    const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
    form.setValue("name", serviceName, { shouldValidate: true });
    // Trigger icon fetch immediately
    setIsFetchingIcon(true);
    getBrandIcon(serviceName)
      .then((icon) => {
        if (icon) {
          setIconUrl(icon);
          form.setValue("icon_url", icon);
        } else {
          setIconUrl(null);
          form.setValue("icon_url", null);
        }
      })
      .catch(() => {
        setIconUrl(null);
        form.setValue("icon_url", null);
      })
      .finally(() => {
        setIsFetchingIcon(false);
      });
  }, [form]);

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="name">Abonelik adı</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="name"
              placeholder="Örn: Netflix, Spotify, Kira"
              {...form.register("name")}
              className="pr-24"
            />
            <select
              className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-md border border-input bg-background px-2 pr-6 text-xs text-muted-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none"
              onChange={(e) => {
                if (e.target.value) {
                  handleServiceSelect(e.target.value);
                  e.target.value = ""; // Reset dropdown
                }
              }}
              value=""
            >
              <option value="">⚡ Hızlı seç</option>
              {POPULAR_SUBSCRIPTION_SERVICES.map((service) => (
                <option key={service} value={service}>
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 size-3 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
          {isFetchingIcon && (
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          {iconUrl && !isFetchingIcon && !iconError && (
            <div className="relative size-10 rounded border border-border overflow-hidden">
              <Image
                src={iconUrl}
                alt=""
                fill
                className="object-contain"
                aria-hidden="true"
                onError={() => {
                  setIconError(true);
                  setIconUrl(null);
                  form.setValue("icon_url", null);
                }}
                unoptimized
              />
            </div>
          )}
          {!iconUrl && !isFetchingIcon && name && name.trim().length > 0 && (
            <div className="flex size-10 items-center justify-center rounded bg-muted border border-border">
              <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>
        {form.formState.errors.name?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.name.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Popüler servislerden birini seçebilir veya manuel olarak yazabilirsiniz.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Tutar</Label>
        <div className="flex gap-2">
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="Örn: 120"
            className="flex-1"
            {...form.register("amount")}
          />
          <select
            id="currency"
            className="h-10 w-20 rounded-md border border-input bg-background px-3 text-sm"
            {...form.register("currency")}
          >
            <option value="TL">TL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        {form.formState.errors.amount?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.amount.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="billing_cycle">Faturalama döngüsü</Label>
        <select
          id="billing_cycle"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("billing_cycle")}
        >
          <option value="monthly">Aylık</option>
          <option value="yearly">Yıllık</option>
        </select>
        {form.formState.errors.billing_cycle?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.billing_cycle.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="next_renewal_date">Sonraki Ödeme Tarihi</Label>
        <Input
          id="next_renewal_date"
          type="date"
          {...form.register("next_renewal_date")}
        />
        {form.formState.errors.next_renewal_date?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.next_renewal_date.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Aboneliğin bir sonraki ödeme tarihini seçin. {billingCycle === "monthly" ? "Aylık" : "Yıllık"} abonelikler için uygun tarihi seçebilirsiniz.
        </p>
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || isFetchingIcon}>
        <Plus className="mr-2 size-4" aria-hidden="true" />
        {isPending ? "Yükleniyor..." : "Ekle"}
      </Button>
    </form>
  );
}

