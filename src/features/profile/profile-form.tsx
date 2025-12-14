"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateProfileAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Ad en az 2 karakter olmalıdır")
    .max(100, "Ad en fazla 100 karakter olabilir")
    .optional()
    .or(z.literal("")),
});

type ProfileFormInput = z.infer<typeof profileSchema>;

type Props = {
  initialFullName: string | null;
};

export function ProfileForm({ initialFullName }: Props) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: initialFullName ?? "",
    },
  });

  const onSubmit = (values: ProfileFormInput) => {
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateProfileAction({
        full_name: values.full_name || null,
      });

      if (!result.ok) {
        setServerError(result.message);
        if (result.fieldErrors) {
          // Set field errors
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            form.setError(field as keyof ProfileFormInput, {
              type: "server",
              message: errors?.[0],
            });
          });
        }
        return;
      }

      setSuccessMessage("Profil başarıyla güncellendi.");
      form.reset({ full_name: values.full_name });
    });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="full_name">Tam Ad</Label>
        <Input
          id="full_name"
          placeholder="Örn: Ahmet Yılmaz"
          {...form.register("full_name")}
          disabled={isPending}
        />
        {form.formState.errors.full_name?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.full_name.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Görünen adın. Dashboard&apos;da &quot;Merhaba, {form.watch("full_name") || "Kullanıcı"}&quot;
          şeklinde gösterilir.
        </p>
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
        {isPending ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </form>
  );
}
