"use client";

import * as React from "react";
import { Trash2, Pencil, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
// Simple date formatting function (no external dependency)
function formatDate(date: Date): string {
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

import {
  deletePaymentAction,
  updatePaymentAction,
  markPaymentPaidAction,
} from "@/app/actions/payments";
import { createTransactionAction } from "@/app/actions/transactions";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTRY } from "@/lib/money";
import {
  type UpdatePaymentFormInput,
  updatePaymentSchema,
} from "@/features/payments/schemas";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PaymentWithAnalysis } from "@/services/payment.service";
import { analyzePaymentFeasibility, type PaymentAnalysisInput } from "@/features/payments/payment-analysis";
import { createTransactionSchema, type CreateTransactionFormInput } from "@/features/transactions/schemas";
import TransactionCategoryPicker from "@/features/transactions/category-picker";
import { EXPENSE_CATEGORIES, type TransactionCategory } from "@/features/transactions/categories";
import { Wallet } from "lucide-react";
import { toLocalYmd } from "@/lib/date";

type Payment = PaymentWithAnalysis;

type WalletOption = {
  id: string;
  name: string;
  is_default: boolean;
};

type Props = {
  payments: Payment[];
  analysisInput?: PaymentAnalysisInput;
  wallets?: WalletOption[];
};

const DEFAULT_EXPENSE_CATEGORY: TransactionCategory = "Sabitler";

type PaymentTransactionFormProps = {
  payment: Payment;
  wallets: WalletOption[];
  onSuccess: () => void;
};

function PaymentTransactionForm({ payment, wallets, onSuccess }: PaymentTransactionFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Determine default wallet: find default wallet, or first wallet
  const getDefaultWalletId = () => {
    const defaultWallet = wallets.find((w) => w.is_default);
    if (defaultWallet) return defaultWallet.id;
    if (wallets.length > 0) return wallets[0]!.id;
    return null;
  };

  const paymentDate = toLocalYmd(new Date(payment.due_date));

  const form = useForm<CreateTransactionFormInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: String(payment.amount),
      type: "expense",
      category: DEFAULT_EXPENSE_CATEGORY,
      date: paymentDate,
      description: payment.name,
      wallet_id: getDefaultWalletId(),
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });

  React.useEffect(() => {
    const current = form.getValues("category");
    if (type === "expense") {
      const isValid = (EXPENSE_CATEGORIES as readonly string[]).includes(current);
      if (!isValid) {
        form.setValue("category", DEFAULT_EXPENSE_CATEGORY, { shouldValidate: true });
      }
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

      form.reset();
      router.refresh();
      onSuccess();
    });
  };

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="amount">Tutar</Label>
        <Input
          id="amount"
          inputMode="decimal"
          placeholder="Örn: 120"
          disabled
          className="opacity-60 pointer-events-none"
          {...form.register("amount")}
        />
        {form.formState.errors.amount?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.amount.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Bu değer ödeme bilgisinden otomatik olarak alınmıştır.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Kategori</Label>
        <input id="category" type="hidden" {...form.register("category")} />
        <TransactionCategoryPicker
          type="expense"
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
        <Label htmlFor="date">Tarih</Label>
        <Input
          id="date"
          type="date"
          disabled
          className="opacity-60 pointer-events-none"
          {...form.register("date")}
        />
        {form.formState.errors.date?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.date.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Bu değer ödeme vade tarihinden otomatik olarak alınmıştır.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Açıklama</Label>
        <textarea
          id="description"
          rows={3}
          disabled
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 resize-none pointer-events-none"
          placeholder="İşlem hakkında not ekleyin..."
          maxLength={500}
          {...form.register("description")}
        />
        {form.formState.errors.description?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.description.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Bu değer ödeme adından otomatik olarak alınmıştır.
        </p>
      </div>

      {serverError ? (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor..." : "Kaydet ve Ödendi Olarak İşaretle"}
      </Button>
    </form>
  );
}

export default function PaymentsList({ payments, analysisInput, wallets = [] }: Props) {
  const router = useRouter();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editing, setEditing] = React.useState<Payment | null>(null);
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [paymentToMarkPaid, setPaymentToMarkPaid] = React.useState<Payment | null>(null);
  const [isMarkPaidSheetOpen, setIsMarkPaidSheetOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile vs desktop
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const form = useForm<UpdatePaymentFormInput>({
    resolver: zodResolver(updatePaymentSchema),
    defaultValues: {
      id: "",
      name: "",
      amount: "",
      due_date: "",
    },
  });

  React.useEffect(() => {
    if (!editing) return;
    setEditError(null);
    form.reset({
      id: editing.id,
      name: editing.name,
      amount: String(editing.amount),
      due_date: editing.due_date,
    });
  }, [editing, form]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deletePaymentAction({ id: deleteId });
    setIsDeleting(false);

    if (result.ok) {
      setDeleteId(null);
      toast.success("Ödeme silindi.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleEditSubmit = async (values: UpdatePaymentFormInput) => {
    setEditError(null);
    form.clearErrors();
    setIsSaving(true);

    try {
      const result = await updatePaymentAction(values);
      if (!result.ok) {
        setEditError(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (!messages?.length) continue;
          form.setError(field as keyof UpdatePaymentFormInput, { message: messages[0] });
        }
        return;
      }

      toast.success("Ödeme güncellendi.");
      setEditOpen(false);
      setEditing(null);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaidClick = (payment: Payment) => {
    if (payment.is_paid) {
      // If already paid, just toggle it off
      handleMarkPaid(payment.id, false);
    } else {
      // If not paid, open the sheet to create transaction
      setPaymentToMarkPaid(payment);
      setIsMarkPaidSheetOpen(true);
    }
  };

  const handleMarkPaid = async (paymentId: string, isPaid: boolean) => {
    const result = await markPaymentPaidAction({ id: paymentId, is_paid: isPaid });
    if (result.ok) {
      toast.success(isPaid ? "Ödeme ödendi olarak işaretlendi." : "Ödeme ödenmedi olarak işaretlendi.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleTransactionFormSuccess = async () => {
    if (!paymentToMarkPaid) return;

    // Mark payment as paid after transaction is created
    const result = await markPaymentPaidAction({ id: paymentToMarkPaid.id, is_paid: true });
    if (result.ok) {
      toast.success("Gider kaydı oluşturuldu ve ödeme ödendi olarak işaretlendi.");
      setIsMarkPaidSheetOpen(false);
      setPaymentToMarkPaid(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  // Filter unpaid payments for warnings
  const unpaidPayments = payments.filter((p) => !p.is_paid);
  const analyses = analysisInput
    ? unpaidPayments.map((payment) => ({
        payment,
        analysis: analyzePaymentFeasibility(
          { amount: payment.amount, due_date: new Date(payment.due_date) },
          analysisInput,
        ),
      }))
    : [];

  const criticalWarnings = analyses.filter((a) => a.analysis.warningLevel === "critical");
  const highWarnings = analyses.filter((a) => a.analysis.warningLevel === "high");

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Henüz ödeme eklenmemiş.</p>
        <p className="text-xs text-muted-foreground">
          Gelecekteki ödemelerinizi (yurt, kira, fatura vb.) ekleyerek bütçe planlamanı yapabilirsin.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Warnings */}
      {criticalWarnings.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="size-4" />
          <AlertTitle>Kritik Uyarı</AlertTitle>
          <AlertDescription>
            {criticalWarnings[0].analysis.warningMessage}
            {criticalWarnings.length > 1 && ` (${criticalWarnings.length} ödeme risk altında)`}
          </AlertDescription>
        </Alert>
      )}

      {highWarnings.length > 0 && criticalWarnings.length === 0 && (
        <Alert variant="default" className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">Yüksek Risk</AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            {highWarnings[0].analysis.warningMessage}
            {highWarnings.length > 1 && ` (${highWarnings.length} ödeme risk altında)`}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {payments.map((payment) => {
          const analysis = analyses.find((a) => a.payment.id === payment.id)?.analysis;
          const dueDate = new Date(payment.due_date);
          const isOverdue = !payment.is_paid && dueDate < new Date() && dueDate.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

          return (
            <div
              key={payment.id}
              className={`flex items-center justify-between rounded-lg border bg-card p-3 ${
                isOverdue ? "border-destructive bg-destructive/5" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-foreground">{payment.name}</div>
                  {payment.is_paid ? (
                    <Badge variant="outline" className="text-xs">
                      Ödendi
                    </Badge>
                  ) : isOverdue ? (
                    <Badge variant="destructive" className="text-xs">
                      Gecikmiş
                    </Badge>
                  ) : payment.days_until_due <= 3 ? (
                    <Badge variant="destructive" className="text-xs">
                      {payment.days_until_due} gün kaldı
                    </Badge>
                  ) : payment.days_until_due <= 7 ? (
                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400">
                      {payment.days_until_due} gün kaldı
                    </Badge>
                  ) : null}
                  {analysis && analysis.warningLevel !== "none" && (
                    <Badge
                      variant={
                        analysis.warningLevel === "critical" || analysis.warningLevel === "high"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {analysis.warningLevel === "critical"
                        ? "Kritik"
                        : analysis.warningLevel === "high"
                          ? "Yüksek"
                          : analysis.warningLevel === "medium"
                            ? "Orta"
                            : "Düşük"}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatTRY(payment.amount)} • {formatDate(dueDate)}
                </div>
                {analysis && analysis.warningMessage && (
                  <div className="mt-1 text-xs text-muted-foreground">{analysis.warningMessage}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMarkPaidClick(payment)}
                  aria-label={payment.is_paid ? "Ödenmedi olarak işaretle" : "Ödendi olarak işaretle"}
                >
                  {payment.is_paid ? (
                    <CheckCircle2 className="size-4 text-green-600" aria-hidden="true" />
                  ) : (
                    <Circle className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(payment);
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
                  onClick={() => setDeleteId(payment.id)}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ödemeyi sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ödemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
            <DialogTitle>Ödemeyi düzenle</DialogTitle>
            <DialogDescription>Ad, tutar ve vade tarihini güncelle, sonra kaydet.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={form.handleSubmit(handleEditSubmit)}>
            <input type="hidden" {...form.register("id")} />

            <div className="grid gap-2">
              <Label htmlFor="edit-payment-name">Ödeme adı</Label>
              <Input id="edit-payment-name" placeholder="Örn: Yurt ödemesi" {...form.register("name")} />
              {form.formState.errors.name?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-payment-amount">Tutar (₺)</Label>
              <Input
                id="edit-payment-amount"
                inputMode="decimal"
                placeholder="Örn: 1500"
                {...form.register("amount")}
              />
              {form.formState.errors.amount?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-payment-due-date">Vade tarihi</Label>
              <Input id="edit-payment-due-date" type="date" {...form.register("due_date")} />
              {form.formState.errors.due_date?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.due_date.message}
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

      {/* Sheet for mobile - marking payment as paid and creating transaction */}
      <Sheet open={isMarkPaidSheetOpen && isMobile} onOpenChange={setIsMarkPaidSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gider Kaydı Oluştur</SheetTitle>
            <SheetDescription>
              {paymentToMarkPaid && (
                <>
                  <strong>{paymentToMarkPaid.name}</strong> ödemesi için gider kaydı oluşturun. 
                  Kayıt oluşturulduğunda ödeme otomatik olarak ödendi olarak işaretlenecektir.
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          {paymentToMarkPaid && (
            <PaymentTransactionForm
              payment={paymentToMarkPaid}
              wallets={wallets}
              onSuccess={handleTransactionFormSuccess}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog for desktop - marking payment as paid and creating transaction */}
      <Dialog open={isMarkPaidSheetOpen && !isMobile} onOpenChange={setIsMarkPaidSheetOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gider Kaydı Oluştur</DialogTitle>
            <DialogDescription>
              {paymentToMarkPaid && (
                <>
                  <strong>{paymentToMarkPaid.name}</strong> ödemesi için gider kaydı oluşturun. 
                  Kayıt oluşturulduğunda ödeme otomatik olarak ödendi olarak işaretlenecektir.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {paymentToMarkPaid && (
            <PaymentTransactionForm
              payment={paymentToMarkPaid}
              wallets={wallets}
              onSuccess={handleTransactionFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

