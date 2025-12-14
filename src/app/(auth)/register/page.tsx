import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import RegisterForm from "./register-form";

export default function RegisterPage() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Hesap Oluştur</h1>
        <p className="text-sm text-muted-foreground">
          Ücretsiz hesap oluştur ve bütçe yönetimine başla.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kayıt</CardTitle>
          <CardDescription>Yeni hesap oluşturmak için bilgilerini gir</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Zaten hesabın var mı?{" "}
          <Button asChild variant="link" className="h-auto p-0">
            <Link href="/login">Giriş yap</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}


