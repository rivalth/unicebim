import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Hesabına Giriş Yap</h1>
        <p className="text-sm text-muted-foreground">
          UniCebim hesabınla giriş yaparak bütçe yönetimine devam et.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Giriş</CardTitle>
          <CardDescription>E-posta ve parolan ile giriş yap</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Hesabın yok mu?{" "}
          <Button asChild variant="link" className="h-auto p-0">
            <Link href="/register">Kayıt ol</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}


