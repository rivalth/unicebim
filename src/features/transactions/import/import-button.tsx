"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImportModal } from "./import-modal";

type ImportButtonProps = {
  onSuccess?: () => void;
};

/**
 * Button component that opens the import modal.
 */
export function ImportButton({ onSuccess }: ImportButtonProps) {
  const [open, setOpen] = React.useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-2 size-4" />
        Dosya Yükle
      </Button>
      <ImportModal open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  );
}

