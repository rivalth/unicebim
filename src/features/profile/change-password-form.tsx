"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { changePasswordAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut parola gereklidir"),
    newPassword: z
      .string()
      .min(8, "Yeni parola en az 8 karakter olmalıdır")
      .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
      .regex(/[a-z]/, "En az bir küçük harf içermelidir")
      .regex(/[0-9]/, "En az bir rakam içermelidir"),
    confirmPassword: z.string().min(1, "Parola onayı gereklidir"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Parolalar eşleşmiyor",
    path: ["confirmPassword"],
  });

type ChangePasswordFormInput = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: ChangePasswordFormInput) => {
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await changePasswordAction(values);

      if (!result.ok) {
        setServerError(result.message);
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            form.setError(field as keyof ChangePasswordFormInput, {
              type: "server",
              message: errors?.[0],
            });
          });
        }
        return;
      }

      setSuccessMessage("Parola başarıyla değiştirildi.");
      form.reset();
    });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Mevcut Parola</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            {...form.register("currentPassword")}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.formState.errors.currentPassword?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.currentPassword.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="newPassword">Yeni Parola</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            {...form.register("newPassword")}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.formState.errors.newPassword?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.newPassword.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Yeni Parola (Tekrar)</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            {...form.register("confirmPassword")}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.formState.errors.confirmPassword?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-emerald-600" role="alert">
          {successMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Değiştiriliyor..." : "Parolayı Değiştir"}
      </Button>
    </form>
  );
}
