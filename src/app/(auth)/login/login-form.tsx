"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginInput, loginSchema } from "@/features/auth/schemas";

export default function LoginForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = React.useCallback(
    (values: LoginInput) => {
    setServerError(null);
    form.clearErrors();

    startTransition(async () => {
      try {
        const result = await loginAction(values);

        if (!result.ok) {
          // Handle field-level errors
          const fieldErrors = result.fieldErrors ?? {};
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (!messages?.length) continue;
            form.setError(field as keyof LoginInput, { message: messages[0] });
          }

          // Handle redirect (e.g., email confirmation required)
          if (result.redirectTo) {
            window.location.href = result.redirectTo;
            return;
          }

          // Show server error message
          setServerError(result.message);
          return;
        }

        // Successful login: use full page reload to ensure auth state is refreshed
        // This prevents issues where router.push doesn't update the session properly
        window.location.href = result.redirectTo ?? "/dashboard";
      } catch (error) {
        // Handle unexpected errors (network, etc.)
        console.error("Login error:", error);
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
            autoComplete="current-password"
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

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? "Giriş yapılıyor..." : "Giriş yap"}
      </button>

    </form>
  );
}


