import type { LucideIcon } from "lucide-react";
import { BookOpen, Bus, Coffee, GraduationCap, HandCoins, Home, Laptop, Utensils } from "lucide-react";

import type { TransactionCategory } from "@/features/transactions/categories";

export type CategoryMeta = {
  label: string;
  Icon: LucideIcon;
};

export const CATEGORY_META: Record<TransactionCategory, CategoryMeta> = {
  "KYK/Burs": { label: "KYK/Burs", Icon: GraduationCap },
  "Aile Harçlığı": { label: "Aile Harçlığı", Icon: HandCoins },
  "Freelance/Ek İş": { label: "Freelance/Ek İş", Icon: Laptop },

  "Sosyal/Keyif": { label: "Sosyal/Keyif", Icon: Coffee },
  Beslenme: { label: "Beslenme", Icon: Utensils },
  Ulaşım: { label: "Ulaşım", Icon: Bus },
  Sabitler: { label: "Sabitler", Icon: Home },
  Okul: { label: "Okul", Icon: BookOpen },
};

export function getCategoryMeta(category: TransactionCategory): CategoryMeta {
  return CATEGORY_META[category];
}


