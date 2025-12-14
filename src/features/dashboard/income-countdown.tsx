"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { formatTRY } from "@/lib/money";

type Props = {
  currentBalance: number;
  nextIncomeDate: string | null; // ISO date string (YYYY-MM-DD)
};

/**
 * Burs Günü Geri Sayımı: Kullanıcıya bir sonraki gelir gününe kadar
 * kaç gün kaldığını ve günlük güvenli harcama limitini gösterir.
 */
export function IncomeCountdown({ currentBalance, nextIncomeDate }: Props) {
  // Eğer next_income_date ayarlanmamışsa gösterilmez
  if (!nextIncomeDate) {
    return null;
  }

  const now = new Date();
  const incomeDate = new Date(nextIncomeDate);
  incomeDate.setHours(0, 0, 0, 0); // Reset to start of day for accurate day calculation

  // Calculate days remaining
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysRemaining = Math.ceil((incomeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // If the date has passed or is today, don't show countdown
  if (daysRemaining <= 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Gelir günün geçmiş görünüyor. Lütfen yeni gelir tarihini ayarlar sayfasından güncelle.
        </p>
      </div>
    );
  }

  // Calculate daily safe spending limit
  const dailyLimit = daysRemaining > 0 ? currentBalance / daysRemaining : 0;
  const dailyLimitRounded = Math.round(dailyLimit);

  // Progress calculation: Use daysRemaining out of a max 31 days for visualization
  const maxDays = 31;
  const progressPercent = Math.min((daysRemaining / maxDays) * 100, 100);

  // Warning colors based on daily limit
  const isCritical = dailyLimit < 0;
  const isLow = dailyLimit >= 0 && dailyLimit < 50;
  const isMedium = dailyLimit >= 50 && dailyLimit < 100;

  const statusColor = isCritical
    ? "text-destructive"
    : isLow
      ? "text-amber-600"
      : isMedium
        ? "text-yellow-600"
        : "text-emerald-600";

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Burs Günü Geri Sayımı</h3>
          <span className="text-xs text-muted-foreground">{daysRemaining} gün kaldı</span>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Günlük güvenli harcama limiti</span>
            <span className={`text-lg font-semibold ${statusColor}`}>
              {isCritical ? "Borçlu" : formatTRY(dailyLimitRounded)}
            </span>
          </div>

          {isCritical ? (
            <p className="text-xs text-destructive">
              ⚠️ Bakiye negatif. Gelir gününe kadar borçlanma riski var.
            </p>
          ) : isLow ? (
            <p className="text-xs text-amber-600">
              ⚠️ Günde maksimum {formatTRY(dailyLimitRounded)} harcarsan borç almadan günü kurtarırsın.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Günde maksimum {formatTRY(dailyLimitRounded)} harcarsan borç almadan günü kurtarırsın.
            </p>
          )}

          <div className="pt-2 text-xs text-muted-foreground">
            <p>
              Kalan bakiye: <span className="font-medium text-foreground">{formatTRY(currentBalance)}</span>
            </p>
            <p>
              Gelir tarihi:{" "}
              <span className="font-medium text-foreground">
                {incomeDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
