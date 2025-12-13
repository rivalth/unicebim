import Link from "next/link";
import { ArrowRight, PieChart, ShieldCheck, Wallet } from "lucide-react";

import { AnimatedContainer } from "./animated-container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Wallet className="size-5" aria-hidden="true" />
          <span>UniCebim</span>
        </div>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Giriş</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Kayıt ol</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-16 pt-10">
        <AnimatedContainer className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Öğrenci bütçeni yönet. Harcamalarını kontrol et.
            </h1>
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              UniCebim ile gelir ve giderlerini kategorilere ayır, aylık hedef bütçe
              belirle ve harcama alışkanlıklarını net bir şekilde gör.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/register">
                  Başla <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Giriş yap</Link>
              </Button>
            </div>
          </div>

          <AnimatedContainer className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="size-4" aria-hidden="true" />
                  Özet
                </CardTitle>
                <CardDescription>Gelir-gider dengen tek ekranda.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Aylık hedef bütçe ve gerçekleşen harcamayı karşılaştır.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Güvenli
                </CardTitle>
                <CardDescription>Supabase Auth ile oturum yönetimi.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Verilerin kullanıcı bazında izole; RLS ile korumaya uygun.
              </CardContent>
            </Card>
          </AnimatedContainer>
        </AnimatedContainer>
      </main>
    </div>
  );
}
