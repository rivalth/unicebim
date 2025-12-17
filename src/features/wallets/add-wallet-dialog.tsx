"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddWalletForm from "./add-wallet-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddWalletDialog({ open, onOpenChange }: Props) {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <>
      {/* Mobile: Sheet (bottom) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="md:hidden">
          <SheetHeader>
            <SheetTitle>Yeni Cüzdan Ekle</SheetTitle>
            <SheetDescription>
              Yeni bir cüzdan ekleyerek bütçe yönetiminizi organize edebilirsiniz.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <AddWalletForm onSuccess={handleSuccess} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Dialog (centered) */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg md:block hidden">
          <DialogHeader>
            <DialogTitle>Yeni Cüzdan Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir cüzdan ekleyerek bütçe yönetiminizi organize edebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <AddWalletForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}

