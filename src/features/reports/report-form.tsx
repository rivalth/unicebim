"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateReportAction, type GenerateReportResult } from "@/app/actions/reports";
import type { ReportFilterOptions, ReportSectionOptions } from "@/services/report.service";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/features/transactions/categories";

const reportFormSchema = z.object({
  // Filters
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categories: z.array(z.string()).optional(),
  types: z.array(z.enum(["income", "expense"])).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  // Sections
  includeProfile: z.boolean(),
  includeTransactions: z.boolean(),
  includeWallets: z.boolean(),
  includeFixedExpenses: z.boolean(),
  includeStatistics: z.boolean(),
  includeCategoryBreakdown: z.boolean(),
  includeDailyBreakdown: z.boolean(),
  includeMonthlyTrends: z.boolean(),
});

type ReportFormInput = z.infer<typeof reportFormSchema>;

type Props = {
  onReportGenerated: (data: GenerateReportResult) => void;
};

export function ReportForm({ onReportGenerated }: Props) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Set default date range (current month)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const form = useForm<ReportFormInput>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      startDate: monthStart.toISOString().split("T")[0],
      endDate: monthEnd.toISOString().split("T")[0],
      categories: undefined,
      types: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      includeProfile: true,
      includeTransactions: true,
      includeWallets: true,
      includeFixedExpenses: true,
      includeStatistics: true,
      includeCategoryBreakdown: true,
      includeDailyBreakdown: false,
      includeMonthlyTrends: false,
    },
  });

  const onSubmit = async (values: ReportFormInput) => {
    setIsGenerating(true);
    setError(null);

    try {
      const filters: ReportFilterOptions = {
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        categories: values.categories && values.categories.length > 0 ? values.categories : undefined,
        types: values.types && values.types.length > 0 ? values.types : undefined,
        minAmount: values.minAmount,
        maxAmount: values.maxAmount,
      };

      const sections: ReportSectionOptions = {
        includeProfile: values.includeProfile,
        includeTransactions: values.includeTransactions,
        includeWallets: values.includeWallets,
        includeFixedExpenses: values.includeFixedExpenses,
        includeStatistics: values.includeStatistics,
        includeCategoryBreakdown: values.includeCategoryBreakdown,
        includeDailyBreakdown: values.includeDailyBreakdown,
        includeMonthlyTrends: values.includeMonthlyTrends,
      };

      const result = await generateReportAction({ filters, sections });
      onReportGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Date Range */}
      <Card>
        <CardHeader>
          <CardTitle>Tarih Aralığı</CardTitle>
          <CardDescription>Raporun kapsayacağı tarih aralığını belirleyin</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="startDate">Başlangıç Tarihi</Label>
            <Input id="startDate" type="date" {...form.register("startDate")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">Bitiş Tarihi</Label>
            <Input id="endDate" type="date" {...form.register("endDate")} />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Rapor verilerini filtreleyin (isteğe bağlı)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>İşlem Türü</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.watch("types")?.includes("income") || false}
                  onChange={(e) => {
                    const current = form.getValues("types") || [];
                    const newValue = e.target.checked
                      ? [...current.filter((t) => t !== "income"), "income"]
                      : current.filter((t) => t !== "income");
                    form.setValue("types", newValue.length > 0 ? newValue : undefined);
                  }}
                  className="rounded"
                />
                <span className="text-sm">Gelir</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.watch("types")?.includes("expense") || false}
                  onChange={(e) => {
                    const current = form.getValues("types") || [];
                    const newValue = e.target.checked
                      ? [...current.filter((t) => t !== "expense"), "expense"]
                      : current.filter((t) => t !== "expense");
                    form.setValue("types", newValue.length > 0 ? newValue : undefined);
                  }}
                  className="rounded"
                />
                <span className="text-sm">Gider</span>
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Kategoriler</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border p-3">
              <div className="space-y-2">
                {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((category) => (
                  <label key={category} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.watch("categories")?.includes(category) || false}
                      onChange={(e) => {
                        const current = form.getValues("categories") || [];
                        const newValue = e.target.checked
                          ? [...current, category]
                          : current.filter((c) => c !== category);
                        form.setValue("categories", newValue.length > 0 ? newValue : undefined);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="minAmount">Minimum Tutar (₺)</Label>
              <Input
                id="minAmount"
                type="number"
                step="0.01"
                placeholder="Örn: 100"
                {...form.register("minAmount", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="maxAmount">Maksimum Tutar (₺)</Label>
              <Input
                id="maxAmount"
                type="number"
                step="0.01"
                placeholder="Örn: 1000"
                {...form.register("maxAmount", { valueAsNumber: true })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Rapor Bölümleri</CardTitle>
          <CardDescription>Rapora dahil edilecek bilgileri seçin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "includeProfile" as const, label: "Profil Bilgileri" },
            { key: "includeTransactions" as const, label: "İşlemler (Tüm Detaylar)" },
            { key: "includeWallets" as const, label: "Cüzdanlar" },
            { key: "includeFixedExpenses" as const, label: "Sabit Giderler" },
            { key: "includeStatistics" as const, label: "İstatistikler" },
            { key: "includeCategoryBreakdown" as const, label: "Kategori Dağılımı" },
            { key: "includeDailyBreakdown" as const, label: "Günlük Detaylar" },
            { key: "includeMonthlyTrends" as const, label: "Aylık Trendler" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" {...form.register(key)} className="rounded" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isGenerating} className="w-full sm:w-auto">
        {isGenerating ? "Rapor Oluşturuluyor..." : "Raporu Oluştur"}
      </Button>
    </form>
  );
}
