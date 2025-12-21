"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  uploadBankStatementAction,
  type BankStatementUploadResult,
} from "@/app/actions/transactions";
import { toast } from "sonner";
import { getSupportedBanks } from "@/services/bank-parsers/banks";
import type { BankName } from "@/services/bank-parsers";
import { getWallets } from "@/services/wallet.service";
import { logger } from "@/lib/logger";

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
  const [step, setStep] = React.useState<"upload" | "importing" | "results">("upload");
  const [selectedBank, setSelectedBank] = React.useState<BankName | "">("");
  const [selectedWalletId, setSelectedWalletId] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [wallets, setWallets] = React.useState<WalletOption[]>([]);
  const [isLoadingWallets, setIsLoadingWallets] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
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

    setIsImporting(true);
    setStep("importing");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bank", selectedBank);
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
    setIsImporting(false);
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
  const canImport = selectedFile && selectedBank && selectedWalletId && !isImporting;

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
              <Label htmlFor="wallet-select">Cüzdan *</Label>
              {isLoadingWallets ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cüzdanlar yükleniyor...</span>
                </div>
              ) : (
                <select
                  id="wallet-select"
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
              {wallets.length === 0 && !isLoadingWallets && (
                <p className="text-xs text-muted-foreground">
                  Önce bir cüzdan oluşturmanız gerekiyor.
                </p>
              )}
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
              <Button onClick={handleImport} disabled={!canImport}>
                İçe Aktar
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


