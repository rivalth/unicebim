"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { createWalletAction } from "@/app/actions/wallets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CreateWalletFormInput, createWalletSchema } from "@/features/wallets/schemas";

export default function AddWalletForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<CreateWalletFormInput>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      name: "",
      balance: "",
      isDefault: false,
    },
  });

  const onSubmit = (values: CreateWalletFormInput) => {
    setServerError(null);

    startTransition(async () => {
      const result = await createWalletAction(values);

      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreateWalletFormInput, { message: messages[0] });
        }
        return;
      }

      form.reset({
        name: "",
        balance: "",
        isDefault: false,
      });
      router.refresh();
    });
  };

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="wallet-name">Cüzdan adı</Label>
        <Input
          id="wallet-name"
          placeholder="Örn: Yemekhane Kartı, Akbil"
          {...form.register("name")}
        />
        {form.formState.errors.name?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="wallet-balance">Başlangıç bakiyesi (₺)</Label>
        <Input
          id="wallet-balance"
          inputMode="decimal"
          placeholder="Örn: 500"
          {...form.register("balance")}
        />
        {form.formState.errors.balance?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.balance.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="wallet-is-default"
          {...form.register("isDefault")}
          className="rounded border-input"
        />
        <Label htmlFor="wallet-is-default" className="cursor-pointer text-sm">
          Varsayılan cüzdan yap
        </Label>
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        <Plus className="size-4 mr-2" aria-hidden="true" />
        {isPending ? "Ekleniyor..." : "Cüzdan Ekle"}
      </Button>
    </form>
  );
}
