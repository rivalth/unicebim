"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getCachedUser } from "@/lib/supabase/server";
import { generateReportData, type ReportFilterOptions, type ReportSectionOptions } from "@/services/report.service";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
import { checkRateLimit, buildRateLimitKey, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const reportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categories: z.array(z.string()).optional(),
  types: z.array(z.enum(["income", "expense"])).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
});

const reportSectionsSchema = z.object({
  includeProfile: z.boolean(),
  includeTransactions: z.boolean(),
  includeWallets: z.boolean(),
  includeFixedExpenses: z.boolean(),
  includeStatistics: z.boolean(),
  includeCategoryBreakdown: z.boolean(),
  includeDailyBreakdown: z.boolean(),
  includeMonthlyTrends: z.boolean(),
});

const generateReportSchema = z.object({
  filters: reportFilterSchema,
  sections: reportSectionsSchema,
});

export type GenerateReportResult =
  | { ok: true; data: Awaited<ReturnType<typeof generateReportData>> }
  | { ok: false; message: string };

/**
 * Server action to generate comprehensive user report.
 * Includes security checks, rate limiting, and validation.
 */
export async function generateReportAction(
  input: z.infer<typeof generateReportSchema>,
): Promise<GenerateReportResult> {
  const originCheck = await enforceSameOriginForServerAction("generateReportAction");
  if (!originCheck.ok) {
    return { ok: false, message: "Geçersiz istek." };
  }

  const parsed = generateReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Geçersiz parametreler. Lütfen alanları kontrol edin.",
    };
  }

  const user = await getCachedUser();
  if (!user) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  // Rate limiting for report generation (expensive operation)
  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "report.generate", ip, userId: user.id }),
    policy: rateLimitPolicies["report.generate"] || {
      limit: 10,
      windowSeconds: 3600, // 1 hour
    },
    requestId: originCheck.requestId,
    context: { action: "generateReportAction", userId: user.id },
  });
  if (!rl.ok) {
    return {
      ok: false,
      message: "Çok fazla rapor isteği. Lütfen bir saat sonra tekrar deneyin.",
    };
  }

  try {
    // Validate date range
    if (parsed.data.filters.startDate && parsed.data.filters.endDate) {
      const start = new Date(parsed.data.filters.startDate);
      const end = new Date(parsed.data.filters.endDate);
      if (start > end) {
        return { ok: false, message: "Başlangıç tarihi bitiş tarihinden sonra olamaz." };
      }
      // Limit date range to max 2 years
      const maxRange = 365 * 2 * 24 * 60 * 60 * 1000; // 2 years in ms
      if (end.getTime() - start.getTime() > maxRange) {
        return {
          ok: false,
          message: "Rapor dönemi en fazla 2 yıl olabilir. Lütfen tarih aralığını daraltın.",
        };
      }
    }

    // At least one section must be selected
    const sections = parsed.data.sections;
    const hasAnySection =
      sections.includeProfile ||
      sections.includeTransactions ||
      sections.includeWallets ||
      sections.includeFixedExpenses ||
      sections.includeStatistics ||
      sections.includeCategoryBreakdown ||
      sections.includeDailyBreakdown ||
      sections.includeMonthlyTrends;

    if (!hasAnySection) {
      return {
        ok: false,
        message: "Lütfen rapora dahil edilecek en az bir bölüm seçin.",
      };
    }

    const reportData = await generateReportData(user.id, parsed.data.filters, parsed.data.sections);

    logger.info("Report generated successfully", {
      requestId: originCheck.requestId,
      userId: user.id,
      sections: Object.keys(sections).filter((k) => sections[k as keyof ReportSectionOptions]),
      transactionCount: reportData.transactions?.length || 0,
    });

    return { ok: true, data: reportData };
  } catch (error) {
    logger.error("Report generation failed", {
      requestId: originCheck.requestId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      message: "Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }
}
