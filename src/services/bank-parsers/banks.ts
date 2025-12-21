/**
 * Client-side bank definitions.
 * This file is not marked with "use server" so it can be used in client components.
 */

import type { BankName } from "./types";

export const SUPPORTED_BANKS: Array<{ value: BankName; label: string }> = [
  { value: "ziraat", label: "Ziraat Bankası" },
  { value: "is-bank", label: "İş Bankası" },
];

/**
 * Get list of supported banks.
 * Client-side safe function (no "use server" directive).
 */
export function getSupportedBanks(): Array<{ value: BankName; label: string }> {
  return SUPPORTED_BANKS;
}

