"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTRY } from "@/lib/money";
import AddPaymentDialog from "./add-payment-dialog";
import PaymentsList from "./payments-list";
import type { PaymentWithAnalysis } from "@/services/payment.service";
import type { PaymentAnalysisInput } from "./payment-analysis";

type WalletOption = {
  id: string;
  name: string;
  is_default: boolean;
};

type Props = {
  payments: PaymentWithAnalysis[];
  analysisInput?: PaymentAnalysisInput;
  unpaidPaymentsTotal: number;
  wallets?: WalletOption[];
};

export default function PaymentsCard({ payments, analysisInput, unpaidPaymentsTotal, wallets = [] }: Props) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Gelecek Ödemelerim</CardTitle>
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            className="h-8 gap-1.5 text-xs sm:text-sm"
          >
            <Plus className="size-3.5 sm:size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Ödeme Ekle</span>
            <span className="sm:hidden">Ekle</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentsList payments={payments} analysisInput={analysisInput} wallets={wallets} />
          {unpaidPaymentsTotal > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Toplam Ödenmemiş</span>
                <span className="font-semibold text-foreground">{formatTRY(unpaidPaymentsTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bu tutar bütçenizden düşülmüştür.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddPaymentDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}

