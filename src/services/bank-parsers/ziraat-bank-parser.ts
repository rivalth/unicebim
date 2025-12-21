"use server";

import * as XLSX from "xlsx";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ParseResult, ParsedTransaction, BankParserOptions } from "./types";

/**
 * Parse Ziraat Bankası Excel file format.
 *
 * Expected format:
 * - Header row contains "Hesap Hareketleri"
 * - Transaction rows start 2 rows after header
 * - Date format: dd.MM.yyyy
 * - Columns: Date(1), Description(3), Amount(4), Balance(5)
 */
export async function parseZiraatBankFile(
  filePath: string,
  options: BankParserOptions,
): Promise<ParseResult> {
  const { walletId, userId } = options;
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  try {
    // Read Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (readError) {
      logger.error("ziraatBankParser.readFile failed", {
        error: readError instanceof Error ? readError.message : String(readError),
        filePath,
        walletId,
        userId,
      });
      return {
        transactions: [],
        errors: [
          `Dosya okunamadı: ${readError instanceof Error ? readError.message : "Bilinmeyen hata"}`,
        ],
      };
    }
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

    // Find header row containing "Hesap Hareketleri"
    let headerRow = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row) continue;
      const firstCell = String(row[0] ?? "").trim();
      if (firstCell.includes("Hesap Hareketleri")) {
        headerRow = i;
        break;
      }
    }

    if (headerRow === -1) {
      return {
        transactions: [],
        errors: ['"Hesap Hareketleri" başlığı bulunamadı. Lütfen geçerli bir Ziraat Bankası dökümü yükleyin.'],
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

    // Parse transactions starting from headerRow + 2
    const transactionStartRow = headerRow + 2;
    let order = 0;
    let previousDate: Date | null = null;

    for (let i = transactionStartRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      // Check if first cell is empty (end of transactions)
      const firstCell = String(row[0] ?? "").trim();
      if (!firstCell) break;

      // Parse date (column 1, index 0 in 0-based)
      const dateStr = String(row[0] ?? "").trim();
      if (!dateStr) continue;

      // Parse date: dd.MM.yyyy
      const dateMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (!dateMatch) {
        errors.push(`Satır ${i + 1}: Geçersiz tarih formatı: ${dateStr}`);
        continue;
      }

      const [, day, month, year] = dateMatch;
      // Create date in Turkey timezone (UTC+3), then convert to UTC
      // We assume the date string represents a date in Turkey timezone
      // To convert to UTC, we subtract 3 hours
      const localDate = new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          12, // Use noon to avoid timezone edge cases
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

      // Parse amount (column 4, index 3 in 0-based)
      const amountStr = String(row[3] ?? "").trim().replace(/[^\d.,-]/g, "").replace(",", ".");
      const amount = parseFloat(amountStr);
      if (!Number.isFinite(amount) || amount === 0) {
        errors.push(`Satır ${i + 1}: Geçersiz tutar: ${amountStr}`);
        continue;
      }

      // Parse description (column 3, index 2 in 0-based)
      const description = String(row[2] ?? "").trim();

      // Parse balance (column 5, index 4 in 0-based)
      const balanceStr = String(row[4] ?? "").trim().replace(/[^\d.,-]/g, "").replace(",", ".");
      const balance = parseFloat(balanceStr);
      if (!Number.isFinite(balance)) {
        errors.push(`Satır ${i + 1}: Geçersiz bakiye: ${balanceStr}`);
        continue;
      }

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
    logger.error("ziraatBankParser.parse failed", {
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

