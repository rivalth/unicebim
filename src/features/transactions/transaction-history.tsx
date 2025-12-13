"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { Pencil, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteTransactionAction, updateTransactionAction } from "@/app/actions/transactions";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalYmd } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  ALL_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionCategory,
} from "@/features/transactions/categories";
import { getCategoryMeta } from "@/features/transactions/category-meta";
import { updateTransactionSchema, type UpdateTransactionFormInput } from "@/features/transactions/schemas";

export type TransactionRow = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // ISO
};

function isKnownCategory(category: string): category is TransactionCategory {
  return (ALL_CATEGORIES as readonly string[]).includes(category);
}

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function TransactionHistory({ transactions }: { transactions: TransactionRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<TransactionRow | null>(null);
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [listError, setListError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const form = useForm<UpdateTransactionFormInput>({
    resolver: zodResolver(updateTransactionSchema),
    defaultValues: {
      id: "",
      amount: "",
      type: "expense",
      category: "Beslenme",
      date: toLocalYmd(),
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });

  React.useEffect(() => {
    if (!editing) return;

    const category: TransactionCategory = isKnownCategory(editing.category)
      ? editing.category
      : "Beslenme";

    form.reset({
      id: editing.id,
      amount: String(editing.amount),
      type: editing.type,
      category,
      date: toLocalYmd(new Date(editing.date)),
    });
  }, [editing, form]);

  React.useEffect(() => {
    const current = form.getValues("category");
    if (type === "income") {
      const isValid = (INCOME_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) form.setValue("category", "KYK/Burs", { shouldValidate: true });
    } else {
      const isValid = (EXPENSE_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) form.setValue("category", "Beslenme", { shouldValidate: true });
    }
  }, [form, type]);

  const onEditSubmit = (values: UpdateTransactionFormInput) => {
    setEditError(null);
    startTransition(async () => {
      const result = await updateTransactionAction(values);
      if (!result.ok) {
        setEditError(result.message);
        return;
      }
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    setListError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteTransactionAction({ id });
      setDeletingId(null);
      if (!result.ok) {
        setListError(result.message);
        return;
      }
      router.refresh();
    });
  };

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">Bu ay henüz işlem yok.</p>;
  }

  return (
    <>
      {listError ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {listError}
        </p>
      ) : null}

      <ul className="divide-y">
        {transactions.map((t) => {
          const known = isKnownCategory(t.category);
          const meta = known ? getCategoryMeta(t.category) : null;
          const Icon = meta?.Icon ?? Tag;

          return (
            <li className="flex items-center justify-between gap-4 py-3" key={t.id}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full border bg-background">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.category}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("tr-TR")} •{" "}
                    {t.type === "income" ? "Gelir" : "Gider"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "min-w-[120px] text-right text-sm font-medium tabular-nums",
                    t.type === "income" ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatTRY(t.amount)}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(t);
                    setEditOpen(true);
                  }}
                  aria-label="Düzenle"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Sil">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>İşlem silinsin mi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bu işlem geri alınamaz. Silmek istediğinize emin misiniz?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancelButton disabled={isPending}>Vazgeç</AlertDialogCancelButton>
                      <AlertDialogActionButton
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isPending && deletingId === t.id}
                        onClick={() => onDelete(t.id)}
                      >
                        {isPending && deletingId === t.id ? "Siliniyor..." : "Sil"}
                      </AlertDialogActionButton>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>İşlemi düzenle</DialogTitle>
            <DialogDescription>Gerekli alanları güncelle ve kaydet.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={form.handleSubmit(onEditSubmit)}>
            <input type="hidden" {...form.register("id")} />

            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Tutar</Label>
              <Input
                id="edit-amount"
                inputMode="decimal"
                placeholder="0"
                {...form.register("amount")}
              />
              {form.formState.errors.amount?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Tür</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "expense" ? "default" : "outline"}
                  onClick={() => form.setValue("type", "expense", { shouldValidate: true })}
                >
                  Gider
                </Button>
                <Button
                  type="button"
                  variant={type === "income" ? "default" : "outline"}
                  onClick={() => form.setValue("type", "income", { shouldValidate: true })}
                >
                  Gelir
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-category">Kategori</Label>
              <input id="edit-category" type="hidden" {...form.register("category")} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => {
                  const { Icon, label } = getCategoryMeta(category as TransactionCategory);
                  const isSelected = selectedCategory === category;
                  return (
                    <Button
                      key={category}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className="justify-start"
                      onClick={() =>
                        form.setValue("category", category as TransactionCategory, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </Button>
                  );
                })}
              </div>
              {form.formState.errors.category?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.category.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-date">Tarih</Label>
              <Input id="edit-date" type="date" {...form.register("date")} />
              {form.formState.errors.date?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.date.message}
                </p>
              ) : null}
            </div>

            {editError ? (
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            ) : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


