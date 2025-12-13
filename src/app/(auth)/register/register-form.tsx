"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type RegisterInput, registerSchema } from "@/features/auth/schemas";

export default function RegisterForm() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const onSubmit = (values: RegisterInput) => {
    setServerMessage(null);
    setServerError(null);

    startTransition(async () => {
      const result = await registerAction(values);

      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof RegisterInput, { message: messages[0] });
        }
        return;
      }

      if (result.message) setServerMessage(result.message);
      router.push(result.redirectTo ?? "/dashboard");
    });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="fullName">Ad Soyad</Label>
        <Input id="fullName" autoComplete="name" {...form.register("fullName")} />
        {form.formState.errors.fullName?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.fullName.message}
          </p>
        ) : null}
      </div>

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
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Parola (Tekrar)</Label>
        <Input
          id="passwordConfirm"
          type="password"
          autoComplete="new-password"
          {...form.register("passwordConfirm")}
        />
        {form.formState.errors.passwordConfirm?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.passwordConfirm.message}
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
        {isPending ? "Kayıt oluşturuluyor..." : "Kayıt ol"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{" "}
        <Link className="text-foreground underline underline-offset-4" href="/login">
          Giriş yap
        </Link>
      </p>
    </form>
  );
}


