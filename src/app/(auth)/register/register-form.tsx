"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import Link from "next/link";

import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type RegisterInput, registerSchema } from "@/features/auth/schemas";

export default function RegisterForm() {
  const [serverMessage, setServerMessage] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = React.useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      passwordConfirm: "",
      acceptTerms: false,
    },
  });

  const onSubmit = React.useCallback(
    (values: RegisterInput) => {
    setServerMessage(null);
    setServerError(null);
    form.clearErrors();

    startTransition(async () => {
      try {
        const result = await registerAction(values);

        if (!result.ok) {
          // Handle field-level errors
          const fieldErrors = result.fieldErrors ?? {};
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (!messages?.length) continue;
            form.setError(field as keyof RegisterInput, { message: messages[0] });
          }

          // Show server error message
          setServerError(result.message);
          return;
        }

        // Handle success message (e.g., email confirmation required)
        if (result.message) {
          setServerMessage(result.message);
        }

        // Successful registration: use full page reload for redirects
        // This ensures auth state is properly refreshed
        if (result.redirectTo) {
          window.location.href = result.redirectTo;
          return;
        }
      } catch (error) {
        // Handle unexpected errors (network, etc.)
        console.error("Register error:", error);
        setServerError("Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    });
    },
    [form],
  );

  const handleFormSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit(onSubmit)(e);
    },
    [form, onSubmit],
  );

  return (
    <form className="space-y-4" method="post" onSubmit={handleFormSubmit}>
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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-10"
            {...form.register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </Button>
        </div>
        {form.formState.errors.password?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Parola (Tekrar)</Label>
        <div className="relative">
          <Input
            id="passwordConfirm"
            type={showPasswordConfirm ? "text" : "password"}
            autoComplete="new-password"
            className="pr-10"
            {...form.register("passwordConfirm")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPasswordConfirm((v) => !v)}
            aria-label={showPasswordConfirm ? "Parolayı gizle" : "Parolayı göster"}
            aria-pressed={showPasswordConfirm}
          >
            {showPasswordConfirm ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        {form.formState.errors.passwordConfirm?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.passwordConfirm.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptTerms"
            type="checkbox"
            className="mt-0.5"
            {...form.register("acceptTerms")}
          />
          <Label
            htmlFor="acceptTerms"
            className="text-sm font-normal leading-normal cursor-pointer"
          >
            <span>
              <Link href="/privacy" className="underline hover:text-foreground" target="_blank">
                Gizlilik Politikası
              </Link>
              {" ve "}
              <Link href="/terms" className="underline hover:text-foreground" target="_blank">
                Kullanım Şartları
              </Link>
              &apos;nı okudum ve kabul ediyorum.
            </span>
          </Label>
        </div>
        {form.formState.errors.acceptTerms?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.acceptTerms.message}
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

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? "Kayıt oluşturuluyor..." : "Kayıt ol"}
      </button>

    </form>
  );
}


