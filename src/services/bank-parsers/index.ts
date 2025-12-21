"use server";

import { parseZiraatBankFile } from "./ziraat-bank-parser";
import { parseIsBankFile } from "./is-bank-parser";
import type { BankName, ParseResult, BankParserOptions } from "./types";

/**
 * Parse bank statement file based on bank name.
 *
 * @param fileBuffer - Buffer containing the Excel file data
 * @param bank - Bank name identifier
 * @param options - Parser options (walletId, userId)
 * @returns Parse result with transactions and errors
 */
export async function parseBankFile(
  fileBuffer: Buffer,
  bank: BankName,
  options: BankParserOptions,
): Promise<ParseResult> {
  switch (bank) {
    case "ziraat":
      return parseZiraatBankFile(fileBuffer, options);
    case "is-bank":
      return parseIsBankFile(fileBuffer, options);
    default:
      return {
        transactions: [],
        errors: [`Desteklenmeyen banka: ${bank}`],
      };
  }
}

export type { BankName, ParseResult, ParsedTransaction } from "./types";
export type { BankParserOptions } from "./types";

