"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
import AddTransactionForm from "@/app/(app)/transactions/add-transaction-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddTransactionModal({ open, onOpenChange }: Props) {
  // Default to mobile (will be corrected on mount for desktop)
  // This prevents SSR mismatch and ensures mobile-first approach
  const [isMobile, setIsMobile] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  // Get today's date in YYYY-MM-DD format
  // MUST be called before any conditional returns to follow Rules of Hooks
  const todayDate = React.useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }, []);

  const handleSuccess = React.useCallback(() => {
    // Close modal/sheet on successful transaction creation
    onOpenChange(false);
  }, [onOpenChange]);

  // Detect mobile on mount and window resize
  React.useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  // This must come AFTER all hooks to follow Rules of Hooks
  if (!mounted) {
    return null;
  }

  // Mobile: Show as bottom sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="relative max-h-[90vh] rounded-t-2xl rounded-b-none p-0 pb-safe-area-inset-bottom [&>button:first-of-type]:hidden"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
          
          {/* Custom close button for bottom sheet */}
          <SheetClose className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="size-4" />
            <span className="sr-only">Kapat</span>
          </SheetClose>
          
          <div className="px-6 pb-4">
            <SheetHeader>
              <SheetTitle className="pr-8">Yeni İşlem Ekle</SheetTitle>
              <SheetDescription>
                Gelir veya gider işleminizi ekleyin. İşlemler otomatik olarak seçili aya kaydedilir.
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 pb-6">
            <AddTransactionForm defaultDate={todayDate} onSuccess={handleSuccess} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Show as modal
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni İşlem Ekle</DialogTitle>
          <DialogDescription>
            Gelir veya gider işleminizi ekleyin. İşlemler otomatik olarak seçili aya kaydedilir.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto -mx-6 px-6">
          <AddTransactionForm defaultDate={todayDate} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
