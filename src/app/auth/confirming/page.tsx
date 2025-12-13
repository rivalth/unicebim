import Link from "next/link";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/url";

import RedirectClient from "./redirect-client";

export const dynamic = "force-dynamic";

export default async function ConfirmingPage({
  searchParams,
}: {
  // Next.js 16+ may provide `searchParams` as a Promise.
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await Promise.resolve(searchParams);
  const next = safeRedirectPath(typeof sp?.next === "string" ? sp.next : null);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.message !== "Auth session missing!") {
    logger.warn("Confirming.getUser failed", { message: error.message });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {user ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  E-posta adresiniz doğrulanıyor...
                </>
              ) : (
                <>
                  <TriangleAlert className="size-5 text-destructive" aria-hidden="true" />
                  Doğrulama tamamlanamadı
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <>
                <p className="text-sm text-muted-foreground">
                  İşlem tamamlandı. Birazdan panele yönlendirileceksin.
                </p>
                <RedirectClient to={next} />
                <Button asChild className="w-full">
                  <Link href={next}>
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Devam et
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Doğrulama linki geçersiz olabilir veya süresi dolmuş olabilir. Lütfen
                  doğrulama e-postasını tekrar gönderip yeniden dene.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild>
                    <Link href="/auth/check-email">E-postayı tekrar gönder</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/login">Giriş sayfasına dön</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


