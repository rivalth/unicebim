"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { deleteFixedExpenseAction, updateFixedExpenseAction } from "@/app/actions/fixed-expenses";
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
import { type UpdateFixedExpenseFormInput, updateFixedExpenseSchema } from "@/features/fixed-expenses/schemas";

type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

type Props = {
  expenses: FixedExpense[];
  total?: number | null; // Optional: if provided, use DB-calculated total instead of client-side reduce
};

export default function FixedExpensesList({ expenses, total: dbTotal }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState<FixedExpense | null>(null);
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const form = useForm<UpdateFixedExpenseFormInput>({
    resolver: zodResolver(updateFixedExpenseSchema),
    defaultValues: {
      id: "",
      name: "",
      amount: "",
    },
  });

  React.useEffect(() => {
    if (!editing) return;
    setEditError(null);
    form.reset({
      id: editing.id,
      name: editing.name,
      amount: String(editing.amount),
    });
  }, [editing, form]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteFixedExpenseAction({ id: deleteId });
    setIsDeleting(false);

    if (result.ok) {
      setDeleteId(null);
      toast.success("Sabit gider silindi.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleEditSubmit = async (values: UpdateFixedExpenseFormInput) => {
    setEditError(null);
    form.clearErrors();
    setIsSaving(true);

    try {
      const result = await updateFixedExpenseAction(values);
      if (!result.ok) {
        setEditError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof UpdateFixedExpenseFormInput, { message: messages[0] });
        }
        return;
      }

      toast.success("Sabit gider güncellendi.");
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Henüz sabit gider eklenmemiş.</p>
        <p className="text-xs text-muted-foreground">
          Kira, abonelik ve telefon gibi sabit giderlerini ekleyerek bütçe planlamanı yapabilirsin.
        </p>
      </div>
    );
  }

  // Prefer DB-calculated total (from monthly_fixed_expenses) over client-side reduce
  // This ensures consistency with the database trigger and avoids potential race conditions
  const total = dbTotal ?? expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <div className="space-y-2">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
          >
            <div className="flex-1">
              <div className="font-medium text-foreground">{expense.name}</div>
              <div className="text-sm text-muted-foreground">{formatTRY(expense.amount)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(expense);
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
                onClick={() => setDeleteId(expense.id)}
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
          <span className="font-medium text-foreground">Toplam</span>
          <span className="font-semibold text-foreground">{formatTRY(total)}</span>
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sabit gideri sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sabit gideri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
            <DialogTitle>Sabit gideri düzenle</DialogTitle>
            <DialogDescription>Ad ve tutarı güncelle, sonra kaydet.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={form.handleSubmit(handleEditSubmit)}>
            <input type="hidden" {...form.register("id")} />

            <div className="grid gap-2">
              <Label htmlFor="edit-fixed-name">Gider adı</Label>
              <Input id="edit-fixed-name" placeholder="Örn: Kira" {...form.register("name")} />
              {form.formState.errors.name?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fixed-amount">Tutar (₺)</Label>
              <Input
                id="edit-fixed-amount"
                inputMode="decimal"
                placeholder="Örn: 2500"
                {...form.register("amount")}
              />
              {form.formState.errors.amount?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
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

