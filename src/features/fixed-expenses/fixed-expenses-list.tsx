"use client";

import * as React from "react";
import { Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteFixedExpenseAction } from "@/app/actions/fixed-expenses";
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

type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

type Props = {
  expenses: FixedExpense[];
  onEdit?: (expense: FixedExpense) => void;
};

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FixedExpensesList({ expenses, onEdit }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteFixedExpenseAction({ id: deleteId });
    setIsDeleting(false);

    if (result.ok) {
      setDeleteId(null);
      router.refresh();
    } else {
      // TODO: Show error toast
      console.error("Delete failed:", result.message);
    }
  };

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Henüz sabit gider eklenmemiş.</p>
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

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
              {onEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(expense)}
                  aria-label="Düzenle"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
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
    </>
  );
}

