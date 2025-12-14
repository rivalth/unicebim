"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTRY } from "@/lib/money";
import { type ExpenseCategory } from "@/features/transactions/categories";

type Props = {
  expenseBreakdown: Array<{ category: string; amount: number }>;
};

/**
 * Sosyal Skor vs. Açlık Sınırı: Harcamaları zorunlu (essential) ve keyfi (non-essential) olarak ayırır.
 * Eğer keyfi giderler zorunlu giderleri geçerse "Tehlike Modu" aktif olur.
 */

// Kategorilerin essential/non-essential sınıflandırması
const ESSENTIAL_CATEGORIES: readonly ExpenseCategory[] = ["Beslenme", "Ulaşım", "Sabitler", "Okul"] as const;
const NON_ESSENTIAL_CATEGORIES: readonly ExpenseCategory[] = ["Sosyal/Keyif"] as const;

function isEssentialCategory(category: string): boolean {
  return (ESSENTIAL_CATEGORIES as readonly string[]).includes(category);
}

function isNonEssentialCategory(category: string): boolean {
  return (NON_ESSENTIAL_CATEGORIES as readonly string[]).includes(category);
}

export function SocialScore({ expenseBreakdown }: Props) {
  let essentialTotal = 0;
  let nonEssentialTotal = 0;

  for (const expense of expenseBreakdown) {
    const amount = typeof expense.amount === "number" ? expense.amount : Number(expense.amount);
    if (isEssentialCategory(expense.category)) {
      essentialTotal += amount;
    } else if (isNonEssentialCategory(expense.category)) {
      nonEssentialTotal += amount;
    }
    // Diğer kategoriler (varsa) sayılmaz
  }

  // Eğer hiç harcama yoksa gösterilmez
  if (essentialTotal === 0 && nonEssentialTotal === 0) {
    return null;
  }

  // Eğer zorunlu gider yok ama sosyal harcama varsa, bu açıkça tehlike modu
  const isDangerMode = 
    (essentialTotal === 0 && nonEssentialTotal > 0) || 
    (essentialTotal > 0 && nonEssentialTotal / essentialTotal > 1.0);
  
  // Oranı hesapla (zorunlu gider 0 ise Infinity olarak kabul edilir)
  const socialRatio = essentialTotal > 0 
    ? nonEssentialTotal / essentialTotal 
    : nonEssentialTotal > 0 
      ? Infinity 
      : 0;

  const totalExpenses = essentialTotal + nonEssentialTotal;

  return (
    <Card className={isDangerMode ? "border-destructive bg-destructive/5" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isDangerMode && <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />}
          <span>Sosyal Skor vs. Hayatta Kalma</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Hayatta Kalma (Zorunlu)</div>
            <div className="text-2xl font-semibold text-emerald-600">
              {formatTRY(essentialTotal)}
            </div>
            <div className="text-xs text-muted-foreground">
              {essentialTotal > 0
                ? `${Math.round((essentialTotal / totalExpenses) * 100)}%`
                : "0%"} toplam harcamaların
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Sosyal Skor (Keyfi)</div>
            <div className={`text-2xl font-semibold ${isDangerMode ? "text-destructive" : "text-orange-600"}`}>
              {formatTRY(nonEssentialTotal)}
            </div>
            <div className="text-xs text-muted-foreground">
              {nonEssentialTotal > 0
                ? `${Math.round((nonEssentialTotal / totalExpenses) * 100)}%`
                : "0%"} toplam harcamaların
            </div>
          </div>
        </div>

        {isDangerMode ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Tehlike Modu Aktif
            </p>
            {essentialTotal === 0 ? (
              <p className="text-xs text-destructive/90 mt-1">
                Hiç zorunlu giderin yok ama sosyal harcama yapıyorsun. Önce temel ihtiyaçlarını karşılamalısın.
              </p>
            ) : (
              <>
                <p className="text-xs text-destructive/90 mt-1">
                  Sosyal hayatın harika ama ay sonunda makarna yiyeceksin. Keyfi giderlerini kontrol altına al.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Sosyal harcamalar zorunlu harcamalardan{" "}
                  <span className="font-medium text-foreground">
                    {Math.round((socialRatio - 1) * 100)}% daha fazla
                  </span>
                  .
                </p>
              </>
            )}
          </div>
        ) : socialRatio > 0.5 ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-700">
              💡 Uyarı
            </p>
            <p className="text-xs text-amber-700/90 mt-1">
              Sosyal harcamaların zorunlu harcamalara yaklaşıyor. Dikkatli ol.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3">
            <p className="text-sm font-medium text-emerald-700">
              ✅ İyi Gidiyor
            </p>
            <p className="text-xs text-emerald-700/90 mt-1">
              {essentialTotal > nonEssentialTotal
                ? "Zorunlu giderlerin sosyal harcamalardan daha fazla. Dengeli bir bütçe yönetimi yapıyorsun."
                : "Bütçe dengen uygun görünüyor."}
            </p>
          </div>
        )}

        {essentialTotal > 0 && nonEssentialTotal > 0 && (
          <div className="pt-2 text-xs text-muted-foreground border-t">
            <p>
              Oran: <span className="font-medium text-foreground">
                {Number.isFinite(socialRatio) ? `${socialRatio.toFixed(2)}x` : "Sonsuz"}
              </span> (Keyfi / Zorunlu)
            </p>
            <p className="mt-1">
              {socialRatio > 1.0
                ? "Keyfi harcamalar zorunlu harcamaları geçmiş durumda."
                : socialRatio === 0
                  ? "Sadece zorunlu harcamalar var, keyfi harcama yok."
                  : "Zorunlu harcamalar keyfi harcamalardan daha yüksek."}
            </p>
          </div>
        )}
        {essentialTotal === 0 && nonEssentialTotal > 0 && (
          <div className="pt-2 text-xs text-muted-foreground border-t">
            <p className="font-medium text-destructive">
              Hiç zorunlu gider kaydı yok. Önce Beslenme, Ulaşım, Sabitler veya Okul kategorilerinde harcama yapmalısın.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
