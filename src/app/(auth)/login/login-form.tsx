"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { loginAction, resendConfirmationEmailAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginInput, loginSchema } from "@/features/auth/schemas";

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [isResendPending, startResendTransition] = React.useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginInput) => {
    setServerError(null);
    setResendMessage(null);

    startTransition(async () => {
      const result = await loginAction(values);

      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof LoginInput, { message: messages[0] });
        }
        return;
      }

      router.push(result.redirectTo ?? "/dashboard");
    });
  };

  const onResendConfirmation = () => {
    setServerError(null);
    setResendMessage(null);

    startResendTransition(async () => {
      const email = form.getValues("email");
      const result = await resendConfirmationEmailAction({ email });

      if (!result.ok) {
        setResendMessage(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof LoginInput, { message: messages[0] });
        }
        return;
      }

      if (result.message) setResendMessage(result.message);
    });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          {...form.register("email")}
        />
        {form.formState.errors.email?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Parola</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
        />
        {form.formState.errors.password?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      {resendMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {resendMessage}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Giriş yapılıyor..." : "Giriş yap"}
      </Button>

      <Button
        className="w-full"
        type="button"
        variant="outline"
        disabled={isResendPending}
        onClick={onResendConfirmation}
      >
        {isResendPending ? "Gönderiliyor..." : "Doğrulama e-postasını tekrar gönder"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Hesabın yok mu?{" "}
        <Link className="text-foreground underline underline-offset-4" href="/register">
          Kayıt ol
        </Link>
      </p>
    </form>
  );
}


