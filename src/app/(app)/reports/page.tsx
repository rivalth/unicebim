"use client";

import * as React from "react";
import { AnimatedContainer } from "@/app/animated-container";
import { ReportForm } from "@/features/reports/report-form";
import { ReportPreview } from "@/features/reports/report-preview";
import { Card, CardContent } from "@/components/ui/card";
import type { GenerateReportResult } from "@/app/actions/reports";

export default function ReportsPage() {
  const [reportResult, setReportResult] = React.useState<GenerateReportResult | null>(null);

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Detaylı Rapor Oluştur</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Sistemdeki tüm hareketlerinizi detaylı bir şekilde raporlayın ve çıktı alın
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportForm onReportGenerated={setReportResult} />
        </CardContent>
      </Card>

      {reportResult?.ok && reportResult.data && <ReportPreview data={reportResult.data} />}

      {reportResult && !reportResult.ok && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {reportResult.message}
            </div>
          </CardContent>
        </Card>
      )}
    </AnimatedContainer>
  );
}
