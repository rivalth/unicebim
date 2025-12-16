"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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
import { parseFile, type ParsedFileData, type ColumnMapping, type ParsedRow } from "./parse-file";
import { detectCategory, detectTransactionType } from "./detect-category";
import { enhanceDescriptionWithIBAN } from "./detect-iban";
import { ALL_CATEGORIES, type TransactionCategory } from "@/features/transactions/categories";
import { bulkImportTransactionsAction, type BulkImportResult } from "@/app/actions/transactions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTransactionAction } from "@/app/actions/transactions";

type ProcessedRow = {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  category: TransactionCategory;
  originalRow: ParsedRow;
  errors: string[];
};

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

/**
 * Modal component for importing bank statements (Excel/CSV).
 *
 * Features:
 * - Drag & drop file upload
 * - Column mapping UI
 * - Data preview and editing
 * - Category auto-detection
 * - Bulk import to database
 */
export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [step, setStep] = React.useState<"upload" | "mapping" | "preview" | "importing" | "results">("upload");
  const [fileData, setFileData] = React.useState<ParsedFileData | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping>({ date: null, amount: null, description: null });
  const [processedRows, setProcessedRows] = React.useState<ProcessedRow[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<BulkImportResult | null>(null);
  const [failedRows, setFailedRows] = React.useState<ProcessedRow[]>([]);
  const [successRows, setSuccessRows] = React.useState<ProcessedRow[]>([]);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0]!;
      try {
        const parsed = await parseFile(file);
        setFileData(parsed);
        setMapping(parsed.mapping);
        setStep("mapping");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Dosya okunamadı.");
      }
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: step !== "upload",
  });

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === "" ? null : value,
    }));
  };

  const handleProcessData = React.useCallback(() => {
    if (!fileData) return;

    const processed: ProcessedRow[] = [];
    let rowIndex = 0;

    for (const row of fileData.rows) {
      const errors: string[] = [];
      rowIndex++;

      // Extract values based on mapping
      const dateValue = mapping.date ? row[mapping.date] : null;
      const amountValue = mapping.amount ? row[mapping.amount] : null;
      const descriptionValue = mapping.description ? row[mapping.description] : null;

      // Validate date
      let dateStr = "";
      if (!dateValue) {
        errors.push("Tarih bulunamadı");
      } else {
        const date = parseDate(dateValue);
        if (!date) {
          errors.push("Geçersiz tarih formatı");
        } else {
          dateStr = date.toISOString().split("T")[0]!;
        }
      }

      // Validate amount
      let amount = 0;
      if (!amountValue) {
        errors.push("Tutar bulunamadı");
      } else {
        const numAmount =
          typeof amountValue === "number"
            ? amountValue
            : parseFloat(String(amountValue).replace(/[^\d.,-]/g, "").replace(",", "."));
        if (!Number.isFinite(numAmount) || numAmount === 0) {
          errors.push("Geçersiz tutar");
        } else {
          amount = Math.abs(numAmount);
        }
      }

      // Description (optional but recommended)
      let description = descriptionValue ? String(descriptionValue).trim() : "";
      
      // Enhance description with IBAN detection if found
      if (description) {
        description = enhanceDescriptionWithIBAN(description);
      }

      // Detect type and category
      const type = detectTransactionType(amountValue, description);
      let category = detectCategory(description);
      if (!category) {
        // Default category based on type
        category = type === "income" ? "KYK/Burs" : "Beslenme";
      }

      processed.push({
        id: `row-${rowIndex}`,
        date: dateStr,
        amount,
        description,
        type,
        category,
        originalRow: row,
        errors,
      });
    }

    setProcessedRows(processed);
    setStep("preview");
  }, [fileData, mapping]);

  const handleDeleteRow = (id: string) => {
    setProcessedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, updates: Partial<ProcessedRow>) => {
    setProcessedRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, ...updates };
        }
        return r;
      }),
    );
  };

  const handleImport = async () => {
    if (processedRows.length === 0) {
      toast.error("İçe aktarılacak veri bulunamadı.");
      return;
    }

    // Filter out rows with errors
    const validRows = processedRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("Tüm satırlarda hata var. Lütfen düzeltin.");
      return;
    }

    setIsImporting(true);
    setStep("importing");

    try {
      const result = await bulkImportTransactionsAction(
        validRows.map((r) => ({
          amount: r.amount,
          type: r.type,
          category: r.category,
          date: r.date,
          description: r.description || null,
        })),
      );

      if (result.ok) {
        setImportResult(result);
        
        // Get successful rows (rows that were sent but not in failed list)
        const failedIndices = new Set(result.failedTransactions.map((ft) => ft.index));
        const successful = validRows
          .map((r, idx) => ({ row: r, idx }))
          .filter(({ idx }) => !failedIndices.has(idx))
          .map(({ row }) => row);
        setSuccessRows(successful);

        // Convert failed transactions to ProcessedRow format for editing
        const failed = result.failedTransactions.map((ft, idx) => {
          // Find the original row from processedRows by matching transaction data
          const originalRow = validRows[ft.index]?.originalRow ?? {};
          const originalProcessedRow = validRows[ft.index];
          return {
            id: `failed-${idx}`,
            date: ft.transaction.date,
            amount: ft.transaction.amount,
            description: originalProcessedRow?.description ?? "",
            type: ft.transaction.type,
            category: ft.transaction.category as TransactionCategory,
            originalRow,
            errors: ft.errors,
          };
        });
        setFailedRows(failed);
        setStep("results");
        if (result.successCount > 0) {
          toast.success(`${result.successCount} işlem başarıyla içe aktarıldı.`);
        }
        if (result.failedCount > 0) {
          toast.warning(`${result.failedCount} işlem eklenemedi. Lütfen düzeltin.`);
        }
      } else {
        toast.error(result.message || "İçe aktarma başarısız oldu.");
        setStep("preview");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.");
      setStep("preview");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetryFailed = async (row: ProcessedRow) => {
    try {
      const result = await createTransactionAction({
        amount: row.amount,
        type: row.type,
        category: row.category,
        date: row.date,
        description: row.description || null,
      });

      if (result.ok) {
        setFailedRows((prev) => prev.filter((r) => r.id !== row.id));
        setSuccessRows((prev) => [...prev, row]);
        toast.success("İşlem başarıyla eklendi.");
        // Update import result
        if (importResult?.ok) {
          setImportResult({
            ...importResult,
            successCount: importResult.successCount + 1,
            failedCount: importResult.failedCount - 1,
            failedTransactions: importResult.failedTransactions.filter(
              (ft) => !(ft.transaction.date === row.date && ft.transaction.amount === row.amount),
            ),
          });
        }
      } else {
        toast.error(result.message || "İşlem eklenemedi.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFileData(null);
    setMapping({ date: null, amount: null, description: null });
    setProcessedRows([]);
    setIsImporting(false);
    setImportResult(null);
    setFailedRows([]);
    setSuccessRows([]);
    onOpenChange(false);
  };

  const handleFinish = () => {
    if (importResult?.ok && importResult.failedCount === 0) {
      onSuccess?.();
    }
    handleClose();
  };

  const validRowsCount = processedRows.filter((r) => r.errors.length === 0).length;

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
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-2">
                {isDragActive ? "Dosyayı buraya bırakın" : "Dosyayı sürükleyip bırakın veya tıklayın"}
              </p>
              <p className="text-xs text-muted-foreground">CSV, XLSX veya XLS formatları desteklenir</p>
            </div>
          </div>
        )}

        {step === "mapping" && fileData && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                Lütfen dosyanızdaki sütunları aşağıdaki alanlarla eşleştirin.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-column">Tarih Sütunu *</Label>
                <select
                  id="date-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={mapping.date ?? ""}
                  onChange={(e) => handleMappingChange("date", e.target.value)}
                >
                  <option value="">Seçiniz...</option>
                  {fileData.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount-column">Tutar Sütunu *</Label>
                <select
                  id="amount-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={mapping.amount ?? ""}
                  onChange={(e) => handleMappingChange("amount", e.target.value)}
                >
                  <option value="">Seçiniz...</option>
                  {fileData.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-column">Açıklama Sütunu</Label>
                <select
                  id="description-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={mapping.description ?? ""}
                  onChange={(e) => handleMappingChange("description", e.target.value)}
                >
                  <option value="">Seçiniz...</option>
                  {fileData.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleProcessData}
              disabled={!mapping.date || !mapping.amount}
              className="w-full"
            >
              Verileri İşle ve Önizle
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {validRowsCount} / {processedRows.length} satır geçerli
              </p>
              <Button variant="outline" size="sm" onClick={() => setStep("mapping")}>
                Eşleştirmeyi Değiştir
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
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
                    {processedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t ${row.errors.length > 0 ? "bg-destructive/10" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateRow(row.id, { date: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) =>
                              handleUpdateRow(row.id, { amount: parseFloat(e.target.value) || 0 })
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={row.description}
                            onChange={(e) => handleUpdateRow(row.id, { description: e.target.value })}
                            className="h-8 text-xs"
                            placeholder="Açıklama"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.type}
                            onChange={(e) =>
                              handleUpdateRow(row.id, { type: e.target.value as "income" | "expense" })
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            <option value="expense">Gider</option>
                            <option value="income">Gelir</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.category}
                            onChange={(e) =>
                              handleUpdateRow(row.id, { category: e.target.value as TransactionCategory })
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {ALL_CATEGORIES.map((cat) => (
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
                            onClick={() => handleDeleteRow(row.id)}
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

            {processedRows.some((r) => r.errors.length > 0) && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  Bazı satırlarda hata var. Lütfen düzeltin veya silin.
                </AlertDescription>
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

        {step === "results" && importResult?.ok && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertDescription>
                {importResult.successCount} işlem başarıyla eklendi.
                {importResult.failedCount > 0 && ` ${importResult.failedCount} işlem eklenemedi.`}
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="success" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="success">
                  Başarılı ({importResult.successCount})
                </TabsTrigger>
                <TabsTrigger value="failed">
                  Başarısız ({importResult.failedCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="success" className="space-y-4">
                {successRows.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Tarih</th>
                            <th className="px-3 py-2 text-left font-medium">Tutar</th>
                            <th className="px-3 py-2 text-left font-medium">Açıklama</th>
                            <th className="px-3 py-2 text-left font-medium">Tip</th>
                            <th className="px-3 py-2 text-left font-medium">Kategori</th>
                          </tr>
                        </thead>
                        <tbody>
                          {successRows.map((row, idx) => (
                            <tr key={`success-${idx}`} className="border-t">
                              <td className="px-3 py-2">{row.date}</td>
                              <td className="px-3 py-2">{row.amount.toFixed(2)} ₺</td>
                              <td className="px-3 py-2">{row.description || "-"}</td>
                              <td className="px-3 py-2">{row.type === "income" ? "Gelir" : "Gider"}</td>
                              <td className="px-3 py-2">{row.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Başarılı işlem bulunmuyor.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="failed" className="space-y-4">
                {failedRows.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Aşağıdaki işlemleri düzenleyip tekrar ekleyebilirsiniz.
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Tarih</th>
                              <th className="px-3 py-2 text-left font-medium">Tutar</th>
                              <th className="px-3 py-2 text-left font-medium">Açıklama</th>
                              <th className="px-3 py-2 text-left font-medium">Tip</th>
                              <th className="px-3 py-2 text-left font-medium">Kategori</th>
                              <th className="px-3 py-2 text-left font-medium">Hatalar</th>
                              <th className="px-3 py-2 text-left font-medium">İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {failedRows.map((row) => (
                              <tr key={row.id} className="border-t bg-destructive/5">
                                <td className="px-3 py-2">
                                  <Input
                                    type="date"
                                    value={row.date}
                                    onChange={(e) => {
                                      const updated = { ...row, date: e.target.value };
                                      setFailedRows((prev) =>
                                        prev.map((r) => (r.id === row.id ? updated : r)),
                                      );
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={row.amount}
                                    onChange={(e) => {
                                      const updated = { ...row, amount: parseFloat(e.target.value) || 0 };
                                      setFailedRows((prev) =>
                                        prev.map((r) => (r.id === row.id ? updated : r)),
                                      );
                                    }}
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    value={row.description}
                                    onChange={(e) => {
                                      const updated = { ...row, description: e.target.value };
                                      setFailedRows((prev) =>
                                        prev.map((r) => (r.id === row.id ? updated : r)),
                                      );
                                    }}
                                    className="h-8 text-xs"
                                    placeholder="Açıklama"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={row.type}
                                    onChange={(e) => {
                                      const updated = { ...row, type: e.target.value as "income" | "expense" };
                                      setFailedRows((prev) =>
                                        prev.map((r) => (r.id === row.id ? updated : r)),
                                      );
                                    }}
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                  >
                                    <option value="expense">Gider</option>
                                    <option value="income">Gelir</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={row.category}
                                    onChange={(e) => {
                                      const updated = {
                                        ...row,
                                        category: e.target.value as TransactionCategory,
                                      };
                                      setFailedRows((prev) =>
                                        prev.map((r) => (r.id === row.id ? updated : r)),
                                      );
                                    }}
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                  >
                                    {ALL_CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-xs text-destructive">
                                    {row.errors.map((err, idx) => (
                                      <div key={idx}>{err}</div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRetryFailed(row)}
                                    className="h-8 text-xs"
                                  >
                                    Tekrar Dene
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Başarısız işlem bulunmuyor.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              İptal
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Geri
              </Button>
              <Button variant="outline" onClick={handleClose}>
                İptal
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                İptal
              </Button>
              <Button onClick={handleImport} disabled={isImporting || validRowsCount === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    İçe Aktarılıyor...
                  </>
                ) : (
                  `İçe Aktar (${validRowsCount} işlem)`
                )}
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
              {importResult?.ok && importResult.failedCount === 0 ? "Tamamla" : "Kapat"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Parse date from various formats.
 * Supports: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, and Excel serial dates.
 */
function parseDate(value: string | number | null | undefined): Date | null {
  if (!value) return null;

  // If it's a number, might be Excel serial date
  if (typeof value === "number") {
    // Excel epoch is 1900-01-01, but JavaScript uses 1970-01-01
    // Excel incorrectly treats 1900 as a leap year, so we adjust
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (Number.isFinite(date.getTime())) {
      return date;
    }
  }

  const str = String(value).trim();
  if (!str) return null;

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isFinite(date.getTime())) {
      return date;
    }
  }

  // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const dateMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isFinite(date.getTime())) {
      return date;
    }
  }

  // Try native Date parsing as last resort
  const date = new Date(str);
  if (Number.isFinite(date.getTime()) && !isNaN(date.getTime())) {
    return date;
  }

  return null;
}

