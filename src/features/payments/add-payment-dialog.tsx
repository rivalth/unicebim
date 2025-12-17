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
import AddPaymentForm from "./add-payment-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddPaymentDialog({ open, onOpenChange }: Props) {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <>
      {/* Mobile: Sheet (bottom) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="md:hidden">
          <SheetHeader>
            <SheetTitle>Yeni Ödeme Ekle</SheetTitle>
            <SheetDescription>
              Gelecekteki ödemenizi ekleyerek bütçe planlamanızı yapabilirsiniz.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <AddPaymentForm onSuccess={handleSuccess} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: Dialog (centered) */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg md:block hidden">
          <DialogHeader>
            <DialogTitle>Yeni Ödeme Ekle</DialogTitle>
            <DialogDescription>
              Gelecekteki ödemenizi ekleyerek bütçe planlamanızı yapabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <AddPaymentForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}

