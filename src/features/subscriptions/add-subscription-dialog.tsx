"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AddSubscriptionForm from "@/features/subscriptions/add-subscription-form";

export default function AddSubscriptionDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const handleSuccess = React.useCallback(() => {
    setOpen(false);
    router.refresh();
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Yeni Abonelik Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Abonelik Ekle</DialogTitle>
          <DialogDescription>
            Abonelik adını yazdığında otomatik olarak logo bulunacak.
          </DialogDescription>
        </DialogHeader>
        <AddSubscriptionForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}

