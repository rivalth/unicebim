"use client";

import {
  BarChart3,
  Calendar,
  CreditCard,
  PieChart,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FeatureData {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const features: FeatureData[] = [
  {
    icon: PieChart,
    title: "Kategorilere Ayırma",
    description:
      "Harcamalarını Beslenme, Ulaşım, Sosyal/Keyif, Sabitler ve Okul kategorilerine ayır.",
  },
  {
    icon: Target,
    title: "Bütçe Takibi",
    description: "Aylık hedef bütçe belirle ve gerçekleşen harcamalarını karşılaştır.",
  },
  {
    icon: BarChart3,
    title: "Detaylı Raporlar",
    description: "Günlük, haftalık ve aylık harcama raporlarını görselleştir.",
  },
  {
    icon: Calendar,
    title: "Sabit Giderler",
    description: "Kira, abonelik gibi sabit giderlerini takip et ve bütçene dahil et.",
  },
  {
    icon: CreditCard,
    title: "Cüzdan Yönetimi",
    description: "Birden fazla cüzdan veya hesap yönet, bakiyelerini takip et.",
  },
  {
    icon: TrendingUp,
    title: "Gelir Takibi",
    description: "Aylık gelirlerini kaydet ve bir sonraki gelir tarihini belirle.",
  },
  {
    icon: Wallet,
    title: "Sosyal Skor",
    description: "Zorunlu ve keyfi harcamalarını karşılaştır, bütçe dengeni gör.",
  },
  {
    icon: Target,
    title: "Yemekhane Endeksi",
    description: "Bakiyeni 'kaç öğün yemek' olarak gör, gerçek alım gücünü anla.",
  },
];

