"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Trash2, Pencil, Wallet, ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  deleteWalletAction,
  updateWalletAction,
  transferBetweenWalletsAction,
} from "@/app/actions/wallets";
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
import { toLocalYmd } from "@/lib/date";
import {
  type UpdateWalletFormInput,
  type TransferBetweenWalletsFormInput,
  updateWalletSchema,
  transferBetweenWalletsSchema,
} from "@/features/wallets/schemas";

type Wallet = {
  id: string;
  name: string;
  balance: number;
  is_default: boolean;
};

type Props = {
  wallets: Wallet[];
};

export default function WalletsList({ wallets: initialWallets }: Props) {
  const router = useRouter();
  const [wallets, setWallets] = React.useState<Wallet[]>(initialWallets);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState<Wallet | null>(null);
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isTransferOpen, setTransferOpen] = React.useState(false);
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [transferError, setTransferError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setWallets(initialWallets);
  }, [initialWallets]);

  const editForm = useForm<UpdateWalletFormInput>({
    resolver: zodResolver(updateWalletSchema),
    defaultValues: {
      id: "",
      name: "",
      balance: "",
      isDefault: false,
    },
  });

  const transferForm = useForm<TransferBetweenWalletsFormInput>({
    resolver: zodResolver(transferBetweenWalletsSchema),
    defaultValues: {
      fromWalletId: "",
      toWalletId: "",
      amount: "",
      date: toLocalYmd(),
    },
  });

  React.useEffect(() => {
    if (!editing) return;
    setEditError(null);
    editForm.reset({
      id: editing.id,
      name: editing.name,
      balance: String(editing.balance),
      isDefault: editing.is_default,
    });
  }, [editing, editForm]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteWalletAction({ id: deleteId });
    setIsDeleting(false);

    if (result.ok) {
      setDeleteId(null);
      toast.success("Cüzdan silindi.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleEditSubmit = async (values: UpdateWalletFormInput) => {
    setEditError(null);
    editForm.clearErrors();
    setIsSaving(true);

    try {
      const result = await updateWalletAction(values);
      if (!result.ok) {
        setEditError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          editForm.setError(field as keyof UpdateWalletFormInput, { message: messages[0] });
        }
        return;
      }

      toast.success("Cüzdan güncellendi.");
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransferSubmit = async (values: TransferBetweenWalletsFormInput) => {
    setTransferError(null);
    transferForm.clearErrors();
    setIsTransferring(true);

    try {
      const result = await transferBetweenWalletsAction(values);
      if (!result.ok) {
        setTransferError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          transferForm.setError(field as keyof TransferBetweenWalletsFormInput, { message: messages[0] });
        }
        return;
      }

      toast.success("Transfer başarıyla tamamlandı.");
      setTransferOpen(false);
      transferForm.reset({
        fromWalletId: "",
        toWalletId: "",
        amount: "",
        date: toLocalYmd(),
      });
      router.refresh();
    } finally {
      setIsTransferring(false);
    }
  };

  if (wallets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Henüz cüzdan eklenmemiş.</p>
        <p className="text-xs text-muted-foreground">
          Varsayılan olarak &quot;Nakit&quot; ve &quot;Banka&quot; cüzdanları oluşturulmuştur.
        </p>
      </div>
    );
  }

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <>
      <div className="space-y-2">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
                <div className="font-medium text-foreground">
                  {wallet.name}
                  {wallet.is_default && (
                    <span className="ml-2 text-xs text-muted-foreground">(Varsayılan)</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">{formatTRY(wallet.balance)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(wallet);
                  setEditOpen(true);
                }}
                aria-label="Düzenle"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              {!wallet.is_default && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(wallet.id)}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Toplam Bakiye</span>
          <span className="font-semibold text-foreground">{formatTRY(totalBalance)}</span>
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setTransferOpen(true)}
        >
          <ArrowRightLeft className="size-4 mr-2" aria-hidden="true" />
          Cüzdanlar Arası Transfer
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cüzdanı düzenle</DialogTitle>
            <DialogDescription>Ad ve bakiyeyi güncelle, sonra kaydet.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={editForm.handleSubmit(handleEditSubmit)}>
            <input type="hidden" {...editForm.register("id")} />

            <div className="grid gap-2">
              <Label htmlFor="edit-wallet-name">Cüzdan adı</Label>
              <Input id="edit-wallet-name" placeholder="Örn: Yemekhane Kartı" {...editForm.register("name")} />
              {editForm.formState.errors.name?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {editForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-wallet-balance">Bakiye (₺)</Label>
              <Input
                id="edit-wallet-balance"
                inputMode="decimal"
                placeholder="Örn: 500"
                {...editForm.register("balance")}
              />
              {editForm.formState.errors.balance?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {editForm.formState.errors.balance.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-wallet-is-default"
                {...editForm.register("isDefault")}
                className="rounded border-input"
              />
              <Label htmlFor="edit-wallet-is-default" className="cursor-pointer text-sm">
                Varsayılan cüzdan yap
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

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cüzdanlar arası transfer</DialogTitle>
            <DialogDescription>
              Bir cüzdandan diğerine para transfer et. Transfer işlemi otomatik olarak kaydedilir.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={transferForm.handleSubmit(handleTransferSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="transfer-from">Gönderen cüzdan</Label>
              <select
                id="transfer-from"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...transferForm.register("fromWalletId")}
              >
                <option value="">Seçin...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatTRY(w.balance)})
                  </option>
                ))}
              </select>
              {transferForm.formState.errors.fromWalletId?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {transferForm.formState.errors.fromWalletId.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-to">Alıcı cüzdan</Label>
              <select
                id="transfer-to"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...transferForm.register("toWalletId")}
              >
                <option value="">Seçin...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {transferForm.formState.errors.toWalletId?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {transferForm.formState.errors.toWalletId.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-amount">Tutar (₺)</Label>
              <Input
                id="transfer-amount"
                inputMode="decimal"
                placeholder="Örn: 500"
                {...transferForm.register("amount")}
              />
              {transferForm.formState.errors.amount?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {transferForm.formState.errors.amount.message}
                </p>
              ) : null}
            </div>

            <input type="hidden" {...transferForm.register("date")} />

            {transferError ? (
              <p className="text-sm text-destructive" role="alert">
                {transferError}
              </p>
            ) : null}

            <Button type="submit" disabled={isTransferring}>
              {isTransferring ? "Transfer ediliyor..." : "Transfer Et"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cüzdanı sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu cüzdanı silmek istediğinizden emin misiniz? Bakiye sıfır olmalıdır. Bu işlem geri alınamaz.
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
