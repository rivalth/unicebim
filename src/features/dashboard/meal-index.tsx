"use client";

import * as React from "react";

type Props = {
  balance: number;
  mealPrice: number | null;
};

/**
 * Yemekhane Endeksi: Bakiyeyi "kaç öğün yemek" olarak gösterir.
 * Öğrenciler parayı TL olarak değil, gerçek alım gücü (kaç öğün yemek) olarak düşünürler.
 */
export function MealIndex({ balance, mealPrice }: Props) {
  // Eğer meal_price ayarlanmamışsa gösterilmez
  if (!mealPrice || mealPrice <= 0) {
    return null;
  }

  const mealCount = Math.floor(balance / mealPrice);
  const remainder = balance % mealPrice;

  if (mealCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bu bakiye ile okulda yemek yiyemezsin. Kalan: <span className="font-medium text-foreground">{Math.round(remainder)} TL</span>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        Bu bakiye ile okulda{" "}
        <span className="font-medium text-foreground">{mealCount} öğün</span> yemek yiyebilirsin.
      </p>
      {remainder > 0 && (
        <p className="text-xs text-muted-foreground">
          Kalan: <span className="font-medium text-foreground">{Math.round(remainder)} TL</span>
        </p>
      )}
    </div>
  );
}
