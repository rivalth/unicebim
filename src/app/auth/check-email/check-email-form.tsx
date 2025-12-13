"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { RefreshCw } from "lucide-react";

import { resendConfirmationEmailAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ResendConfirmationInput,
  resendConfirmationSchema,
} from "@/features/auth/schemas";

export default function CheckEmailForm({ defaultEmail }: { defaultEmail?: string }) {
  const [serverMessage, setServerMessage] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ResendConfirmationInput>({
    resolver: zodResolver(resendConfirmationSchema),
    defaultValues: {
      email: defaultEmail ?? "",
    },
  });

  const onSubmit = (values: ResendConfirmationInput) => {
    setServerMessage(null);
    setServerError(null);

    startTransition(async () => {
      const result = await resendConfirmationEmailAction(values);

      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof ResendConfirmationInput, { message: messages[0] });
        }
        return;
      }

      if (result.message) setServerMessage(result.message);
    });
  };

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" type="email" inputMode="email" {...form.register("email")} />
        {form.formState.errors.email?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      {serverMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {serverMessage}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? (
          "Gönderiliyor..."
        ) : (
          <>
            <RefreshCw className="size-4" aria-hidden="true" />
            Doğrulama e-postasını tekrar gönder
          </>
        )}
      </Button>
    </form>
  );
}


