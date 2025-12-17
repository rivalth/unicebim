"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * ThemeProvider - Next.js App Router için tema yönetimi sağlar
 * 
 * next-themes kütüphanesini kullanarak sistem teması, açık mod ve koyu mod
 * arasında geçiş yapılmasını sağlar. Tema tercihi localStorage'da saklanır.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

