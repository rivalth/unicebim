import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background" role="contentinfo">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Section */}
          <div className="space-y-4">
            <Logo width={24} height={24} showText textClassName="text-lg" />
            <p className="text-sm text-muted-foreground">
              Üniversite öğrencileri için modern bütçe ve harcama takip uygulaması.
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Ürün</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/#features"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Özellikler
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sık Sorulan Sorular
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Yasal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Kullanım Şartları
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Destek</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Hakkımızda
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {currentYear} UniCebim. Tüm hakları saklıdır.</p>
          <p className="text-xs">
            Supabase Auth ile güvenli oturum yönetimi. Verileriniz RLS ile korunur.
          </p>
        </div>
      </div>
    </footer>
  );
}

