/**
 * Category auto-detection based on transaction description.
 *
 * Uses keyword matching to suggest appropriate categories for imported transactions.
 */

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionCategory } from "@/features/transactions/categories";

type CategoryKeywords = {
  [K in TransactionCategory]: readonly string[];
};

/**
 * Keywords for each category (case-insensitive matching).
 */
const CATEGORY_KEYWORDS: CategoryKeywords = {
  // Income categories
  "KYK/Burs": ["kyk", "burs", "bursu", "scholarship", "grant"],
  "Aile Harçlığı": ["aile", "harçlık", "harçlığı", "allowance", "pocket money", "aile desteği"],
  "Freelance/Ek İş": ["freelance", "ek iş", "part time", "part-time", "proje", "project", "gig"],

  // Expense categories
  "Sosyal/Keyif": [
    "starbucks",
    "kahve",
    "coffee",
    "sinema",
    "cinema",
    "film",
    "movie",
    "konser",
    "concert",
    "eğlence",
    "entertainment",
    "oyun",
    "game",
    "netflix",
    "spotify",
    "cafe",
    "kafe",
    "restoran",
    "restaurant",
    "bar",
    "pub",
  ],
  Beslenme: [
    "yemek",
    "food",
    "market",
    "migros",
    "bim",
    "a101",
    "şok",
    "carrefour",
    "yemekhane",
    "cafeteria",
    "mcdonald",
    "burger",
    "pizza",
    "dominos",
    "yemek sepeti",
    "getir",
    "trendyol yemek",
  ],
  Ulaşım: [
    "otobüs",
    "bus",
    "metro",
    "metrobüs",
    "tramvay",
    "tram",
    "taksi",
    "taxi",
    "uber",
    "bitaksi",
    "akbil",
    "istanbulkart",
    "istanbul kart",
    "bilet",
    "ticket",
    "yol",
    "transport",
    "ulaşım",
  ],
  Sabitler: [
    "kira",
    "rent",
    "fatura",
    "bill",
    "elektrik",
    "electricity",
    "su",
    "water",
    "doğalgaz",
    "gas",
    "internet",
    "telefon",
    "phone",
    "abonelik",
    "subscription",
    "yurt",
    "dormitory",
    "dorm",
  ],
  Okul: [
    "okul",
    "school",
    "üniversite",
    "university",
    "kayıt",
    "registration",
    "harç",
    "tuition",
    "kitap",
    "book",
    "kırtasiye",
    "stationery",
    "ders",
    "course",
    "sınav",
    "exam",
  ],
};

/**
 * Detect category from description text.
 *
 * Returns the first matching category, or null if no match found.
 */
export function detectCategory(description: string | null | undefined): TransactionCategory | null {
  if (!description || typeof description !== "string") {
    return null;
  }

  const normalized = description.toLowerCase().trim();

  // Check expense categories first (more common)
  for (const category of EXPENSE_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Then check income categories
  for (const category of INCOME_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Determine transaction type based on amount and description.
 *
 * If amount is negative, it's likely an expense.
 * If amount is positive and description suggests income, it's income.
 * Otherwise, defaults to expense (more common).
 */
export function detectTransactionType(
  amount: number | string | null | undefined,
  description: string | null | undefined,
): "income" | "expense" {
  const numAmount = typeof amount === "string" ? parseFloat(amount.replace(",", ".")) : Number(amount);

  // Negative amounts are typically expenses
  if (numAmount < 0) {
    return "expense";
  }

  // Check if description suggests income
  const detectedCategory = detectCategory(description);
  if (detectedCategory && (INCOME_CATEGORIES as readonly string[]).includes(detectedCategory)) {
    return "income";
  }

  // Default to expense (more common in bank statements)
  return "expense";
}

