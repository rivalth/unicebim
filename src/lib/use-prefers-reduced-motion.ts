"use client";

import * as React from "react";

/**
 * React hook for the user's `prefers-reduced-motion` setting.
 * Safe for SSR: returns false during SSR and initial render.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    onChange();

    // Modern browsers
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    // Safari < 14 fallback
    const legacy = media as unknown as {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    legacy.addListener?.(onChange);
    return () => legacy.removeListener?.(onChange);
  }, []);

  return reduced;
}


