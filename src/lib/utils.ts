import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely.
 *
 * - `clsx` handles conditional/class-array inputs
 * - `tailwind-merge` resolves conflicting Tailwind utilities deterministically
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


