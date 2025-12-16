"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Trash2, Pencil, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { deleteSubscriptionAction, updateSubscriptionAction } from "@/app/actions/subscriptions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTRY } from "@/lib/money";
import { type UpdateSubscriptionFormInput, updateSubscriptionSchema } from "@/features/subscriptions/schemas";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: "monthly" | "yearly";
  next_renewal_date: string; // YYYY-MM-DD format
  icon_url: string | null;
  is_active: boolean;
};

type Props = {
  subscriptions: Subscription[];
  totalMonthly?: number | null; // Optional: if provided, use DB-calculated total
};

export default function SubscriptionsList({ subscriptions, totalMonthly: dbTotal }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState<Subscription | null>(null);
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const form = useForm<UpdateSubscriptionFormInput>({
    resolver: zodResolver(updateSubscriptionSchema),
    defaultValues: {
      id: "",
      name: "",
      amount: "",
      currency: "TL",
      billing_cycle: "monthly",
      next_renewal_date: new Date().toISOString().split("T")[0]!,
      icon_url: null,
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (!editing) return;
    setEditError(null);
    form.reset({
      id: editing.id,
      name: editing.name,
      amount: String(editing.amount),
      currency: editing.currency,
      billing_cycle: editing.billing_cycle,
      next_renewal_date: editing.next_renewal_date,
      icon_url: editing.icon_url,
      is_active: editing.is_active,
    });
  }, [editing, form]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteSubscriptionAction({ id: deleteId });
    setIsDeleting(false);

    if (result.ok) {
      setDeleteId(null);
      toast.success("Abonelik silindi.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleEditSubmit = async (values: UpdateSubscriptionFormInput) => {
    setEditError(null);
    form.clearErrors();
    setIsSaving(true);

    try {
      const result = await updateSubscriptionAction(values);
      if (!result.ok) {
        setEditError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof UpdateSubscriptionFormInput, { message: messages[0] });
        }
        return;
      }

      toast.success("Abonelik güncellendi.");
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate monthly total
  const calculateMonthlyTotal = (subs: Subscription[]): number => {
    return subs.reduce((sum, sub) => {
      if (!sub.is_active) return sum;
      if (sub.billing_cycle === "monthly") {
        return sum + sub.amount;
      } else {
        return sum + sub.amount / 12;
      }
    }, 0);
  };

  const totalMonthly = dbTotal ?? calculateMonthlyTotal(subscriptions);

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Henüz abonelik eklenmemiş.</p>
        <p className="text-xs text-muted-foreground">
          Netflix, Spotify, Kira gibi düzenli aboneliklerini ekleyerek takip edebilirsin.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-3 flex-1">
              {subscription.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={subscription.icon_url}
                  alt=""
                  className="size-10 rounded object-contain"
                  aria-hidden="true"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded bg-muted">
                  <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{subscription.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatTRY(subscription.amount)} {subscription.currency} /{" "}
                  {subscription.billing_cycle === "monthly" ? "ay" : "yıl"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Sonraki ödeme: {new Date(subscription.next_renewal_date).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {!subscription.is_active && " (Pasif)"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(subscription);
                  setEditOpen(true);
                }}
                aria-label="Düzenle"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(subscription.id)}
                aria-label="Sil"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Aylık Toplam</span>
          <span className="font-semibold text-foreground">{formatTRY(totalMonthly)}</span>
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aboneliği sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu aboneliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelButton disabled={isDeleting}>İptal</AlertDialogCancelButton>
            <AlertDialogActionButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Siliniyor..." : "Sil"}
            </AlertDialogActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aboneliği düzenle</DialogTitle>
            <DialogDescription>Abonelik bilgilerini güncelle, sonra kaydet.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={form.handleSubmit(handleEditSubmit)}>
            <input type="hidden" {...form.register("id")} />

            <div className="grid gap-2">
              <Label htmlFor="edit-subscription-name">Abonelik adı</Label>
              <Input
                id="edit-subscription-name"
                placeholder="Örn: Netflix"
                {...form.register("name")}
              />
              {form.formState.errors.name?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-subscription-amount">Tutar</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-subscription-amount"
                  inputMode="decimal"
                  placeholder="Örn: 120"
                  className="flex-1"
                  {...form.register("amount")}
                />
                <select
                  id="edit-subscription-currency"
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
              <Label htmlFor="edit-subscription-billing-cycle">Faturalama döngüsü</Label>
              <select
                id="edit-subscription-billing-cycle"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("billing_cycle")}
              >
                <option value="monthly">Aylık</option>
                <option value="yearly">Yıllık</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-subscription-next-renewal-date">Sonraki Ödeme Tarihi</Label>
              <Input
                id="edit-subscription-next-renewal-date"
                type="date"
                {...form.register("next_renewal_date")}
              />
              {form.formState.errors.next_renewal_date?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.next_renewal_date.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-subscription-is-active"
                {...form.register("is_active")}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="edit-subscription-is-active" className="cursor-pointer">
                Aktif
              </Label>
            </div>

            {editError ? (
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            ) : null}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

