/**
 * Type definitions for bank statement parsers.
 */

export type BankName = "ziraat" | "is-bank";

export type ParsedTransaction = {
  date: Date; // UTC
  amount: number;
  description: string;
  balance: number;
  order: number;
};

export type ParseResult = {
  transactions: ParsedTransaction[];
  errors: string[];
};

export type BankParserOptions = {
  walletId: string;
  userId: string;
};

