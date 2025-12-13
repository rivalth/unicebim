"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

export default function RedirectClient({
  to,
  delayMs = 1500,
}: {
  to: string;
  delayMs?: number;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      router.replace(to);
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [router, to, delayMs]);

  return null;
}


