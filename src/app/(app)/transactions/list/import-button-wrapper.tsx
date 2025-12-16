"use client";

import { useRouter } from "next/navigation";

import { ImportButton } from "@/features/transactions/import/import-button";

/**
 * Client component wrapper for ImportButton (needs router for refresh).
 */
export function ImportButtonWrapper() {
  const router = useRouter();
  return <ImportButton onSuccess={() => router.refresh()} />;
}

