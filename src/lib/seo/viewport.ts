import type { Viewport } from "next";

/**
 * Generates viewport configuration for pages.
 *
 * @returns Viewport configuration object
 */
export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    ],
  };
}

