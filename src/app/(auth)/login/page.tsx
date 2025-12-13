import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import LoginForm from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const checkEmail = searchParams?.checkEmail === "1";

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <Link className="text-sm font-medium underline underline-offset-4" href="/">
          Ana sayfa
        </Link>
        <Button asChild size="sm" variant="ghost">
          <Link href="/register">Kayıt ol</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Giriş</CardTitle>
        </CardHeader>
        <CardContent>
          {checkEmail ? (
            <div className="mb-4 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
              Kayıt tamamlandı. Eğer e-posta doğrulaması açıksa, giriş yapmadan önce gelen
              kutundaki doğrulama linkine tıklaman gerekir.
            </div>
          ) : null}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}


