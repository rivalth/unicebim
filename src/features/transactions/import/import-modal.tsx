"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  parseBankStatementAction,
  uploadBankStatementAction,
  type BankStatementUploadResult,
  type ParsedTransactionPreview,
} from "@/app/actions/transactions";
import { toast } from "sonner";
import { getSupportedBanks } from "@/services/bank-parsers/banks";
import type { BankName } from "@/services/bank-parsers";
import { getWallets } from "@/services/wallet.service";
import { logger } from "@/lib/logger";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from "@/features/transactions/categories";

type WalletOption = {
  id: string;
  name: string;
  is_default: boolean;
};

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

/**
 * Modal component for importing bank statements (Excel).
 *
 * Features:
 * - Bank selection (Ziraat, İş Bankası)
 * - Wallet selection
 * - Drag & drop file upload
 * - Automatic parsing based on bank
 * - Duplicate detection
 * - Bulk import to database
 */
export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [step, setStep] = React.useState<"upload" | "parsing" | "preview" | "importing" | "results">("upload");
  const [selectedBank, setSelectedBank] = React.useState<BankName | "">("");
  const [selectedWalletId, setSelectedWalletId] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [wallets, setWallets] = React.useState<WalletOption[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [previewTransactions, setPreviewTransactions] = React.useState<ParsedTransactionPreview[]>([]);
  const [parseErrors, setParseErrors] = React.useState<string[]>([]);
  const [uploadResult, setUploadResult] = React.useState<BankStatementUploadResult | null>(null);

  // Load wallets on mount
  React.useEffect(() => {
    if (open && wallets.length === 0 && !isLoadingWallets) {
      setIsLoadingWallets(true);
      getWallets()
        .then((walletList) => {
          setWallets(
            walletList.map((w) => ({
              id: w.id,
              name: w.name,
              is_default: w.is_default,
            })),
          );
          // Set default wallet if available
          const defaultWallet = walletList.find((w) => w.is_default);
          if (defaultWallet) {
            setSelectedWalletId(defaultWallet.id);
          } else if (walletList.length > 0) {
            setSelectedWalletId(walletList[0]!.id);
          }
        })
        .catch((error) => {
          toast.error("Cüzdanlar yüklenemedi.");
          logger.error("ImportModal.getWallets failed", { error });
        })
        .finally(() => {
          setIsLoadingWallets(false);
        });
    }
  }, [open, wallets.length, isLoadingWallets]);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0]!;
      setSelectedFile(file);
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: step !== "upload",
  });

  const handleParse = async () => {
    if (!selectedFile) {
      toast.error("Lütfen bir dosya seçin.");
      return;
    }

    if (!selectedBank) {
      toast.error("Lütfen bir banka seçin.");
      return;
    }

    setIsParsing(true);
    setStep("parsing");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bank", selectedBank);

      const result = await parseBankStatementAction(formData);

      if (result.ok) {
        setPreviewTransactions(result.transactions);
        setParseErrors(result.errors);
        setStep("preview");
        if (result.transactions.length > 0) {
          toast.success(`${result.transactions.length} işlem bulundu. Lütfen kontrol edin.`);
        }
        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} hata bulundu.`);
        }
      } else {
        toast.error(result.message || "Dosya parse edilemedi.");
        setStep("upload");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.");
      setStep("upload");
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpdateTransaction = (id: string, updates: Partial<ParsedTransactionPreview>) => {
    setPreviewTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id === id) {
          const updated = { ...tx, ...updates };
          // If type changed, ensure category matches type
          if (updates.type && updates.type !== tx.type) {
            const validCategories = updates.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
            const currentCategory = updated.category as TransactionCategory;
            const isValidCategory = (validCategories as readonly string[]).includes(currentCategory);
            if (!isValidCategory) {
              updated.category = updates.type === "income" ? "Diğer" : "Diğer";
            }
          }
          return updated;
        }
        return tx;
      }),
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setPreviewTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Lütfen bir dosya seçin.");
      return;
    }

    if (!selectedBank) {
      toast.error("Lütfen bir banka seçin.");
      return;
    }

    if (!selectedWalletId) {
      toast.error("Lütfen bir cüzdan seçin.");
      return;
    }

    if (previewTransactions.length === 0) {
      toast.error("İçe aktarılacak işlem bulunamadı.");
      return;
    }

    setIsImporting(true);
    setStep("importing");

    try {
      const formData = new FormData();
      formData.append("transactions", JSON.stringify(previewTransactions));
      formData.append("walletId", selectedWalletId);

      const result = await uploadBankStatementAction(formData);

      setUploadResult(result);

      if (result.ok) {
        setStep("results");
        if (result.successCount > 0) {
          toast.success(`${result.successCount} işlem başarıyla içe aktarıldı.`);
        }
        if (result.failedCount > 0) {
          toast.warning(`${result.failedCount} işlem eklenemedi.`);
        }
        if (result.skippedCount > 0) {
          toast.info(`${result.skippedCount} işlem duplicate olduğu için atlandı.`);
        }
      } else {
        toast.error(result.message || "İçe aktarma başarısız oldu.");
        setStep("upload");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.");
      setStep("upload");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setSelectedBank("");
    setSelectedWalletId("");
    setSelectedFile(null);
    setIsParsing(false);
    setIsImporting(false);
    setPreviewTransactions([]);
    setParseErrors([]);
    setUploadResult(null);
    onOpenChange(false);
  };

  const handleFinish = () => {
    if (uploadResult?.ok) {
      onSuccess?.();
    }
    handleClose();
  };

  const supportedBanks = getSupportedBanks();
  const canParse = selectedFile && selectedBank && !isParsing;
  const canImport = previewTransactions.length > 0 && selectedWalletId && !isImporting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Banka Dökümü İçe Aktar</DialogTitle>
          <DialogDescription>
            Excel veya CSV dosyanızı yükleyin ve işlemlerinizi toplu olarak ekleyin.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank-select">Banka *</Label>
              <select
                id="bank-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value as BankName | "")}
              >
                <option value="">Seçiniz...</option>
                {supportedBanks.map((bank) => (
                  <option key={bank.value} value={bank.value}>
                    {bank.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Dosya *</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">
                  {isDragActive ? "Dosyayı buraya bırakın" : "Dosyayı sürükleyip bırakın veya tıklayın"}
                </p>
                <p className="text-xs text-muted-foreground">XLSX veya XLS formatları desteklenir</p>
                {selectedFile && (
                  <p className="text-xs text-primary mt-2 font-medium">{selectedFile.name}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "parsing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Dosya parse ediliyor...</p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {previewTransactions.length} işlem bulundu. Lütfen kontrol edin ve düzenleyin.
              </p>
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                Geri
              </Button>
            </div>

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Parse Hataları:</p>
                    <ul className="list-disc list-inside text-xs max-h-32 overflow-y-auto">
                      {parseErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="wallet-select-preview">Cüzdan *</Label>
              {isLoadingWallets ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cüzdanlar yükleniyor...</span>
                </div>
              ) : (
                <select
                  id="wallet-select-preview"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  disabled={wallets.length === 0}
                >
                  <option value="">Seçiniz...</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name} {wallet.is_default ? "(Varsayılan)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Tarih</th>
                      <th className="px-3 py-2 text-left font-medium">Tutar</th>
                      <th className="px-3 py-2 text-left font-medium">Açıklama</th>
                      <th className="px-3 py-2 text-left font-medium">Tip</th>
                      <th className="px-3 py-2 text-left font-medium">Kategori</th>
                      <th className="px-3 py-2 text-left font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTransactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2">
                          <Input
                            type="datetime-local"
                            value={new Date(tx.date).toISOString().slice(0, 16)}
                            onChange={(e) => {
                              const newDate = new Date(e.target.value);
                              handleUpdateTransaction(tx.id, { date: newDate.toISOString() });
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={tx.amount}
                            onChange={(e) => {
                              handleUpdateTransaction(tx.id, {
                                amount: parseFloat(e.target.value) || 0,
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={tx.description}
                            onChange={(e) => {
                              handleUpdateTransaction(tx.id, { description: e.target.value });
                            }}
                            className="h-8 text-xs"
                            placeholder="Açıklama"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={tx.type}
                            onChange={(e) => {
                              handleUpdateTransaction(tx.id, {
                                type: e.target.value as "income" | "expense",
                              });
                            }}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            <option value="expense">Gider</option>
                            <option value="income">Gelir</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={tx.category}
                            onChange={(e) => {
                              handleUpdateTransaction(tx.id, { category: e.target.value });
                            }}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {(tx.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleDeleteTransaction(tx.id)}
                          >
                            <X className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {previewTransactions.length === 0 && (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>Düzenlenebilir işlem bulunmuyor.</AlertDescription>
              </Alert>
            )}
          </div>
        )}


        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">İşlemler içe aktarılıyor...</p>
          </div>
        )}

        {step === "results" && uploadResult && (
          <div className="space-y-4">
            {uploadResult.ok ? (
              <>
                <Alert>
                  <CheckCircle2 className="size-4" />
                  <AlertDescription>
                    {uploadResult.successCount} işlem başarıyla eklendi.
                    {uploadResult.failedCount > 0 && ` ${uploadResult.failedCount} işlem eklenemedi.`}
                    {uploadResult.skippedCount > 0 && ` ${uploadResult.skippedCount} işlem duplicate olduğu için atlandı.`}
                  </AlertDescription>
                </Alert>

                {uploadResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Hatalar:</p>
                        <ul className="list-disc list-inside text-xs">
                          {uploadResult.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{uploadResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button onClick={handleParse} disabled={!canParse}>
                Parse Et ve Önizle
              </Button>
            </>
          )}
          {step === "parsing" && (
            <Button variant="outline" onClick={handleClose} disabled>
              İptal
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Geri
              </Button>
              <Button onClick={handleImport} disabled={!canImport}>
                İçe Aktar ({previewTransactions.length} işlem)
              </Button>
            </>
          )}
          {step === "importing" && (
            <Button variant="outline" onClick={handleClose} disabled>
              İptal
            </Button>
          )}
          {step === "results" && (
            <Button onClick={handleFinish}>
              {uploadResult?.ok ? "Tamamla" : "Kapat"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


