export type FormatTryOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

/**
 * Format a number as Turkish Lira (TRY).
 */
export function formatTRY(amount: number, options: FormatTryOptions = {}): string {
  const maximumFractionDigits = options.maximumFractionDigits ?? 0;
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(amount);
}


