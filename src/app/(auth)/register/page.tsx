import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import RegisterForm from "./register-form";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <Link className="text-sm font-medium underline underline-offset-4" href="/">
          Ana sayfa
        </Link>
        <Button asChild size="sm" variant="ghost">
          <Link href="/login">Giriş</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kayıt</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}


