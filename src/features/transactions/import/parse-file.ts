/**
 * File parsing utilities for bank statement imports (Excel/CSV).
 *
 * Supports:
 * - CSV files (via papaparse)
 * - Excel files (.xlsx, .xls via xlsx)
 *
 * Provides column mapping detection and data transformation.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedRow = Record<string, string | number | null>;

export type ColumnMapping = {
  date: string | null;
  amount: string | null;
  description: string | null;
};

export type ParsedFileData = {
  rows: ParsedRow[];
  headers: string[];
  mapping: ColumnMapping;
};

/**
 * Common column name patterns for auto-detection.
 */
const DATE_COLUMN_PATTERNS = [
  /tarih/i,
  /date/i,
  /tarih.*saat/i,
  /datetime/i,
  /işlem.*tarih/i,
  /işlem.*tarihi/i,
];

const AMOUNT_COLUMN_PATTERNS = [
  /tutar/i,
  /amount/i,
  /miktar/i,
  /fiyat/i,
  /price/i,
  /bakiye/i,
  /balance/i,
  /borç/i,
  /alacak/i,
  /debit/i,
  /credit/i,
];

const DESCRIPTION_COLUMN_PATTERNS = [
  /açıklama/i,
  /description/i,
  /desc/i,
  /detay/i,
  /detail/i,
  /işlem/i,
  /transaction/i,
  /not/i,
  /note/i,
  /açıklama/i,
  /memo/i,
];

/**
 * Auto-detect column mapping based on header names.
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    amount: null,
    description: null,
  };

  for (const header of headers) {
    const normalized = header.trim().toLowerCase();

    if (!mapping.date) {
      for (const pattern of DATE_COLUMN_PATTERNS) {
        if (pattern.test(normalized)) {
          mapping.date = header;
          break;
        }
      }
    }

    if (!mapping.amount) {
      for (const pattern of AMOUNT_COLUMN_PATTERNS) {
        if (pattern.test(normalized)) {
          mapping.amount = header;
          break;
        }
      }
    }

    if (!mapping.description) {
      for (const pattern of DESCRIPTION_COLUMN_PATTERNS) {
        if (pattern.test(normalized)) {
          mapping.description = header;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Parse CSV file content.
 */
export async function parseCSV(file: File): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error("CSV dosyası okunamadı. Lütfen geçerli bir CSV dosyası yükleyin."));
          return;
        }

        const rows = results.data as ParsedRow[];
        const headers = results.meta.fields ?? [];

        if (headers.length === 0) {
          reject(new Error("CSV dosyasında başlık satırı bulunamadı."));
          return;
        }

        const mapping = detectColumnMapping(headers);

        resolve({
          rows,
          headers,
          mapping,
        });
      },
      error: (error: Error) => {
        reject(new Error(`CSV dosyası okunurken hata oluştu: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Excel file content (.xlsx, .xls).
 */
export async function parseExcel(file: File): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Excel dosyası okunamadı."));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error("Excel dosyasında sayfa bulunamadı."));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        }) as unknown[][];

        if (jsonData.length === 0) {
          reject(new Error("Excel dosyası boş."));
          return;
        }

        // First row is headers
        const headers = (jsonData[0] as unknown[]).map((h) => String(h ?? "")).filter((h) => h.length > 0);

        if (headers.length === 0) {
          reject(new Error("Excel dosyasında başlık satırı bulunamadı."));
          return;
        }

        // Convert rows to objects
        const rows: ParsedRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const rowObj: ParsedRow = {};
          for (let j = 0; j < headers.length; j++) {
            const value = row[j];
            if (value == null) {
              rowObj[headers[j]!] = null;
            } else if (typeof value === "number") {
              rowObj[headers[j]!] = value;
            } else {
              rowObj[headers[j]!] = String(value);
            }
          }
          rows.push(rowObj);
        }

        const mapping = detectColumnMapping(headers);

        resolve({
          rows,
          headers,
          mapping,
        });
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Excel dosyası işlenirken beklenmeyen bir hata oluştu."),
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Excel dosyası okunurken hata oluştu."));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Parse file based on extension.
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCSV(file);
  }

  if (extension === "xlsx" || extension === "xls") {
    return parseExcel(file);
  }

  throw new Error("Desteklenmeyen dosya formatı. Lütfen CSV, XLSX veya XLS dosyası yükleyin.");
}

