import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import CheckEmailForm from "./check-email-form";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const email = typeof searchParams?.email === "string" ? searchParams.email : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Girişe dön</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/">Ana sayfa</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="size-5" aria-hidden="true" />
              E-postanı kontrol et
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Kaydını tamamlamak için e-posta adresine gönderilen doğrulama linkine tıkla.
              Linke tıkladıktan sonra otomatik olarak panele yönlendirileceksin.
            </p>

            <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
              İpucu: E-posta gelmediyse spam/junk klasörünü kontrol et ve 1-2 dakika bekle.
            </div>

            <CheckEmailForm defaultEmail={email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


