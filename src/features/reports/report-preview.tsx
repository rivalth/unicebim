"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileJson, FileSpreadsheet } from "lucide-react";
import { formatTRY } from "@/lib/money";
import { exportToJSON } from "@/lib/export/json";
import { exportToCSV, flattenForCSV } from "@/lib/export/csv";
import type { ReportData } from "@/services/report.service";

type Props = {
  data: ReportData;
};

export function ReportPreview({ data }: Props) {
  const handleExportJSON = () => {
    exportToJSON(data, `rapor-${new Date().toISOString().split("T")[0]}.json`);
  };

  const handleExportTransactionsCSV = () => {
    if (!data.transactions || data.transactions.length === 0) return;
    const flattened = flattenForCSV(data.transactions);
    exportToCSV(flattened, `islemler-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleExportStatisticsCSV = () => {
    if (!data.statistics) return;
    const statsRows = [
      { Metrik: "Toplam Gelir", Değer: formatTRY(data.statistics.totalIncome) },
      { Metrik: "Toplam Gider", Değer: formatTRY(data.statistics.totalExpense) },
      { Metrik: "Net Bakiye", Değer: formatTRY(data.statistics.netBalance) },
      { Metrik: "İşlem Sayısı", Değer: data.statistics.transactionCount },
      {
        Metrik: "Ortalama İşlem Tutarı",
        Değer: formatTRY(data.statistics.averageTransactionAmount),
      },
      { Metrik: "En Büyük Gelir", Değer: formatTRY(data.statistics.largestIncome) },
      { Metrik: "En Büyük Gider", Değer: formatTRY(data.statistics.largestExpense) },
    ];
    exportToCSV(statsRows, `istatistikler-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleExportHTML = () => {
    const html = generateHTMLReport(data);
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapor-${new Date().toISOString().split("T")[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Çıktı Al</CardTitle>
          <CardDescription>Raporu farklı formatlarda indirin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportJSON} variant="outline" size="sm">
              <FileJson className="mr-2 size-4" />
              JSON
            </Button>
            {data.transactions && data.transactions.length > 0 && (
              <Button onClick={handleExportTransactionsCSV} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 size-4" />
                İşlemler CSV
              </Button>
            )}
            {data.statistics && (
              <Button onClick={handleExportStatisticsCSV} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 size-4" />
                İstatistikler CSV
              </Button>
            )}
            <Button onClick={handleExportHTML} variant="outline" size="sm">
              <FileText className="mr-2 size-4" />
              HTML
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>Rapor Özeti</CardTitle>
            <CardDescription>
              Oluşturulma: {new Date(data.generatedAt).toLocaleString("tr-TR")}
              <br />
              Dönem: {new Date(data.period.start).toLocaleDateString("tr-TR")} -{" "}
              {new Date(data.period.end).toLocaleDateString("tr-TR")}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Profile */}
        {data.profile && (
          <Card>
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Ad Soyad:</span>{" "}
                <span className="font-medium">{data.profile.full_name || "Belirtilmemiş"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Aylık Bütçe Hedefi:</span>{" "}
                <span className="font-medium">
                  {data.profile.monthly_budget_goal ? formatTRY(data.profile.monthly_budget_goal) : "Belirtilmemiş"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Sabit Giderler:</span>{" "}
                <span className="font-medium">
                  {data.profile.monthly_fixed_expenses
                    ? formatTRY(data.profile.monthly_fixed_expenses)
                    : "Belirtilmemiş"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Yemek Fiyatı:</span>{" "}
                <span className="font-medium">
                  {data.profile.meal_price ? formatTRY(data.profile.meal_price) : "Belirtilmemiş"}
                </span>
              </div>
              {data.profile.next_income_date && (
                <div>
                  <span className="text-muted-foreground">Sonraki Gelir Tarihi:</span>{" "}
                  <span className="font-medium">
                    {new Date(data.profile.next_income_date).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {data.statistics && (
          <Card>
            <CardHeader>
              <CardTitle>İstatistikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">Toplam Gelir</div>
                  <div className="text-lg font-semibold text-emerald-600">
                    {formatTRY(data.statistics.totalIncome)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Toplam Gider</div>
                  <div className="text-lg font-semibold text-destructive">
                    {formatTRY(data.statistics.totalExpense)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Net Bakiye</div>
                  <div
                    className={`text-lg font-semibold ${data.statistics.netBalance >= 0 ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {formatTRY(data.statistics.netBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">İşlem Sayısı</div>
                  <div className="text-lg font-semibold">{data.statistics.transactionCount}</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-muted-foreground">Ortalama İşlem</div>
                  <div className="text-base font-medium">{formatTRY(data.statistics.averageTransactionAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">En Büyük Gelir</div>
                  <div className="text-base font-medium text-emerald-600">
                    {formatTRY(data.statistics.largestIncome)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">En Büyük Gider</div>
                  <div className="text-base font-medium text-destructive">
                    {formatTRY(data.statistics.largestExpense)}
                  </div>
                </div>
              </div>

              {data.statistics.categoryTotals.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium">Kategori Dağılımı</div>
                  <div className="space-y-2">
                    {data.statistics.categoryTotals.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <span>{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">({cat.count} işlem)</span>
                          <span className="font-medium">{formatTRY(cat.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transactions */}
        {data.transactions && data.transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>İşlemler ({data.transactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-2 py-2 text-left text-muted-foreground">Tarih</th>
                      <th className="px-2 py-2 text-left text-muted-foreground">Tür</th>
                      <th className="px-2 py-2 text-left text-muted-foreground">Kategori</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b">
                        <td className="px-2 py-2">
                          {new Date(tx.date).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${tx.type === "income" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}
                          >
                            {tx.type === "income" ? "Gelir" : "Gider"}
                          </span>
                        </td>
                        <td className="px-2 py-2">{tx.category}</td>
                        <td className="px-2 py-2 text-right font-medium">{formatTRY(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wallets */}
        {data.wallets && data.wallets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cüzdanlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.wallets.map((wallet) => (
                  <div key={wallet.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{wallet.name}</span>
                      {wallet.is_default && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">Varsayılan</span>
                      )}
                    </div>
                    <span className="font-semibold">{formatTRY(wallet.balance)}</span>
                  </div>
                ))}
                <div className="pt-2 font-semibold">
                  Toplam:{" "}
                  {formatTRY(data.wallets.reduce((sum, w) => sum + w.balance, 0))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fixed Expenses */}
        {data.fixedExpenses && data.fixedExpenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sabit Giderler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.fixedExpenses.map((fe) => (
                  <div key={fe.id} className="flex items-center justify-between border-b pb-2 text-sm">
                    <span>{fe.name}</span>
                    <span className="font-medium">{formatTRY(fe.amount)}</span>
                  </div>
                ))}
                <div className="pt-2 font-semibold">
                  Toplam: {formatTRY(data.fixedExpenses.reduce((sum, fe) => sum + fe.amount, 0))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Breakdown */}
        {data.dailyBreakdown && data.dailyBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Günlük Detaylar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-2 py-2 text-left text-muted-foreground">Tarih</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">Gelir</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">Gider</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">Net</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyBreakdown.map((day) => (
                      <tr key={day.date} className="border-b">
                        <td className="px-2 py-2">
                          {new Date(day.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-2 py-2 text-right text-emerald-600">
                          {formatTRY(day.income)}
                        </td>
                        <td className="px-2 py-2 text-right text-destructive">
                          {formatTRY(day.expense)}
                        </td>
                        <td
                          className={`px-2 py-2 text-right font-medium ${day.net >= 0 ? "text-emerald-600" : "text-destructive"}`}
                        >
                          {formatTRY(day.net)}
                        </td>
                        <td className="px-2 py-2 text-right">{day.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function generateHTMLReport(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniCebim Raporu - ${new Date(data.generatedAt).toLocaleDateString("tr-TR")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f4f4f4; font-weight: bold; }
    .income { color: #22c55e; }
    .expense { color: #ef4444; }
    .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>UniCebim Finansal Raporu</h1>
  <div class="summary">
    <p><strong>Oluşturulma Tarihi:</strong> ${new Date(data.generatedAt).toLocaleString("tr-TR")}</p>
    <p><strong>Dönem:</strong> ${new Date(data.period.start).toLocaleDateString("tr-TR")} - ${new Date(data.period.end).toLocaleDateString("tr-TR")}</p>
  </div>
  
  ${data.profile ? `<h2>Profil Bilgileri</h2><p><strong>Ad Soyad:</strong> ${data.profile.full_name || "Belirtilmemiş"}</p>` : ""}
  
  ${data.statistics ? `
  <h2>İstatistikler</h2>
  <div class="summary">
    <p><strong>Toplam Gelir:</strong> <span class="income">${formatTRY(data.statistics.totalIncome)}</span></p>
    <p><strong>Toplam Gider:</strong> <span class="expense">${formatTRY(data.statistics.totalExpense)}</span></p>
    <p><strong>Net Bakiye:</strong> <span class="${data.statistics.netBalance >= 0 ? "income" : "expense"}">${formatTRY(data.statistics.netBalance)}</span></p>
    <p><strong>İşlem Sayısı:</strong> ${data.statistics.transactionCount}</p>
  </div>
  ` : ""}
  
  ${data.transactions && data.transactions.length > 0 ? `
  <h2>İşlemler</h2>
  <table>
    <thead><tr><th>Tarih</th><th>Tür</th><th>Kategori</th><th>Tutar</th></tr></thead>
    <tbody>
      ${data.transactions.map(tx => `
        <tr>
          <td>${new Date(tx.date).toLocaleDateString("tr-TR")}</td>
          <td>${tx.type === "income" ? "Gelir" : "Gider"}</td>
          <td>${tx.category}</td>
          <td class="${tx.type === "income" ? "income" : "expense"}">${formatTRY(tx.amount)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  ` : ""}
  
  ${data.wallets && data.wallets.length > 0 ? `
  <h2>Cüzdanlar</h2>
  <table>
    <thead><tr><th>İsim</th><th>Bakiye</th></tr></thead>
    <tbody>
      ${data.wallets.map(w => `
        <tr>
          <td>${w.name} ${w.is_default ? "(Varsayılan)" : ""}</td>
          <td>${formatTRY(w.balance)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  ` : ""}
  
  ${data.fixedExpenses && data.fixedExpenses.length > 0 ? `
  <h2>Sabit Giderler</h2>
  <table>
    <thead><tr><th>İsim</th><th>Tutar</th></tr></thead>
    <tbody>
      ${data.fixedExpenses.map(fe => `
        <tr>
          <td>${fe.name}</td>
          <td>${formatTRY(fe.amount)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  ` : ""}
</body>
</html>`;
}
