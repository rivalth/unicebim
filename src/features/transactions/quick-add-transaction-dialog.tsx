"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { Plus, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

import { createTransactionAction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toLocalYmd } from "@/lib/date";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionCategory,
} from "@/features/transactions/categories";
import TransactionCategoryPicker from "@/features/transactions/category-picker";
import { createTransactionSchema, type CreateTransactionFormInput } from "@/features/transactions/schemas";

const DEFAULT_EXPENSE_CATEGORY: TransactionCategory = "Beslenme";
const DEFAULT_INCOME_CATEGORY: TransactionCategory = "KYK/Burs";

type WalletOption = {
  id: string;
  name: string;
  is_default: boolean;
};

type Props = {
  wallets?: WalletOption[];
  defaultWalletId?: string | null;
};

export default function QuickAddTransactionDialog({ wallets = [], defaultWalletId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Determine default wallet: use provided defaultWalletId, or find default wallet, or first wallet
  const getDefaultWalletId = () => {
    if (defaultWalletId) return defaultWalletId;
    const defaultWallet = wallets.find((w) => w.is_default);
    if (defaultWallet) return defaultWallet.id;
    if (wallets.length > 0) return wallets[0]!.id;
    return null;
  };

  const form = useForm<CreateTransactionFormInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: "",
      type: "expense",
      category: DEFAULT_EXPENSE_CATEGORY,
      date: toLocalYmd(),
      description: "",
      wallet_id: getDefaultWalletId(),
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });

  React.useEffect(() => {
    if (!open) return;
    // Refresh "today" each time the dialog opens.
    form.setValue("date", toLocalYmd(), { shouldValidate: true });
  }, [form, open]);

  React.useEffect(() => {
    const current = form.getValues("category");
    if (type === "income") {
      const isValid = (INCOME_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) form.setValue("category", DEFAULT_INCOME_CATEGORY, { shouldValidate: true });
    } else {
      const isValid = (EXPENSE_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) form.setValue("category", DEFAULT_EXPENSE_CATEGORY, { shouldValidate: true });
    }
  }, [form, type]);

  const onSubmit = (values: CreateTransactionFormInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createTransactionAction(values);
      if (!result.ok) {
        setServerError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof CreateTransactionFormInput, { message: messages[0] });
        }
        return;
      }

      setOpen(false);
      form.reset({
        amount: "",
        type: "expense",
        category: DEFAULT_EXPENSE_CATEGORY,
        date: toLocalYmd(),
        description: "",
        wallet_id: getDefaultWalletId(),
      });
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Hızlı Ekle
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Hızlı Ekle</DialogTitle>
          <DialogDescription>
            Tutarı gir, kategoriyi seç, kaydet. Tarih varsayılan olarak bugündür.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="amount">Tutar</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="Örn: 120"
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
            <Label htmlFor="category">Kategori</Label>
            <input id="category" type="hidden" {...form.register("category")} />

            <TransactionCategoryPicker
              type={type}
              value={(selectedCategory as TransactionCategory) ?? DEFAULT_EXPENSE_CATEGORY}
              onChange={(category) =>
                form.setValue("category", category as TransactionCategory, { shouldValidate: true })
              }
            />
            {form.formState.errors.category?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.category.message}
              </p>
            ) : null}
          </div>

          {wallets.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="wallet_id">Cüzdan</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <select
                  id="wallet_id"
                  className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm"
                  {...form.register("wallet_id")}
                >
                  <option value="">Cüzdan seçin (Opsiyonel)</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} {wallet.is_default && "(Varsayılan)"}
                    </option>
                  ))}
                </select>
              </div>
              {form.formState.errors.wallet_id?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.wallet_id.message}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Bu işlem hangi cüzdandan yapılacak?
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="İşlem hakkında not ekleyin..."
              maxLength={500}
              {...form.register("description")}
            />
            {form.formState.errors.description?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          {/* Hidden fields (still validated server-side) */}
          <input type="hidden" {...form.register("date")} />

          {serverError ? (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


