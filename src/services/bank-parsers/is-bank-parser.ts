"use server";

import * as XLSX from "xlsx";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ParseResult, ParsedTransaction, BankParserOptions } from "./types";

/**
 * Parse İş Bankası Excel file format.
 *
 * Expected format:
 * - Header row contains "Tarih/Saat"
 * - Transaction rows start 1 row after header
 * - Date format: dd/MM/yyyy-HH:mm:ss
 * - Columns: Date(0), Amount(3), Balance(4), Description(8)
 */
export async function parseIsBankFile(
  filePath: string,
  options: BankParserOptions,
): Promise<ParseResult> {
  const { walletId, userId } = options;
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        transactions: [],
        errors: ["Excel dosyasında sayfa bulunamadı."],
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as unknown[][];

    if (jsonData.length === 0) {
      return {
        transactions: [],
        errors: ["Excel dosyası boş."],
      };
    }

    // Find header row containing "Tarih/Saat"
    let headerRow = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row) continue;
      const firstCell = String(row[0] ?? "").trim();
      if (firstCell === "Tarih/Saat") {
        headerRow = i;
        break;
      }
    }

    if (headerRow === -1) {
      return {
        transactions: [],
        errors: ['"Tarih/Saat" başlığı bulunamadı. Lütfen geçerli bir İş Bankası dökümü yükleyin.'],
      };
    }

    // Get existing transaction date range for duplicate check
    const supabase = await createSupabaseServerClient();
    const { data: existingTransactions } = await supabase
      .from("transactions")
      .select("date")
      .eq("wallet_id", walletId)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1);

    const newestTransactionDate =
      existingTransactions && existingTransactions.length > 0
        ? new Date(existingTransactions[0]!.date)
        : null;

    const { data: oldestTransactions } = await supabase
      .from("transactions")
      .select("date")
      .eq("wallet_id", walletId)
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .limit(1);

    const oldestTransactionDate =
      oldestTransactions && oldestTransactions.length > 0
        ? new Date(oldestTransactions[0]!.date)
        : null;

    // Parse transactions starting from headerRow + 1
    const transactionStartRow = headerRow + 1;
    let order = 0;
    let previousDate: Date | null = null;

    for (let i = transactionStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      // Check if first cell is empty (end of transactions)
      const dateCell = row[0];
      if (!dateCell) break;

      const dateStr = String(dateCell).trim();
      if (!dateStr) break;

      // Parse date: dd/MM/yyyy-HH:mm:ss
      const dateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})-(\d{2}):(\d{2}):(\d{2})$/);
      if (!dateMatch) {
        errors.push(`Satır ${i + 1}: Geçersiz tarih formatı: ${dateStr}`);
        continue;
      }

      const [, day, month, year, hour, minute, second] = dateMatch;

      // Create date in UTC (assuming the date string is in Turkey timezone UTC+3)
      // Convert to UTC by subtracting 3 hours
      const localDate = new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        ),
      );

      // Turkey is UTC+3, so subtract 3 hours to get UTC
      const turkeyOffset = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
      const date = new Date(localDate.getTime() - turkeyOffset);

      // Duplicate check
      if (newestTransactionDate && oldestTransactionDate) {
        if (date <= newestTransactionDate && date >= oldestTransactionDate) {
          continue; // Skip duplicate date range
        }
      }

      // Calculate order
      if (previousDate && date.getTime() === previousDate.getTime()) {
        order++;
      } else {
        order = 0;
        previousDate = date;
      }

      // Parse amount (column 3, index 3 in 0-based)
      const amountStr = String(row[3] ?? "").trim().replace(/[^\d.,-]/g, "").replace(",", ".");
      const amount = parseFloat(amountStr);
      if (!Number.isFinite(amount) || amount === 0) {
        errors.push(`Satır ${i + 1}: Geçersiz tutar: ${amountStr}`);
        continue;
      }

      // Parse balance (column 4, index 4 in 0-based)
      const balanceStr = String(row[4] ?? "").trim().replace(/[^\d.,-]/g, "").replace(",", ".");
      const balance = parseFloat(balanceStr);
      if (!Number.isFinite(balance)) {
        errors.push(`Satır ${i + 1}: Geçersiz bakiye: ${balanceStr}`);
        continue;
      }

      // Parse description (column 8, index 8 in 0-based)
      const description = String(row[8] ?? "").trim();

      transactions.push({
        date,
        amount: Math.abs(amount),
        description,
        balance,
        order,
      });
    }

    return {
      transactions,
      errors,
    };
  } catch (error) {
    logger.error("isBankParser.parse failed", {
      error: error instanceof Error ? error.message : String(error),
      filePath,
      walletId,
      userId,
    });

    return {
      transactions: [],
      errors: [
        error instanceof Error
          ? `Dosya parse edilemedi: ${error.message}`
          : "Dosya parse edilemedi: Bilinmeyen hata",
      ],
    };
  }
}

