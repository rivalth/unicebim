import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  PieChart,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AnimatedContainer } from "./animated-container";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/layout/footer";
import { PublicHeader } from "@/components/layout/public-header";
import { FAQAccordion } from "@/components/features/faq-accordion";
import { ScrollReveal, FadeIn } from "@/components/animations";
import {
  StructuredData,
  generateOrganizationSchema,
  generateWebApplicationSchema,
  generateFAQPageSchema,
} from "@/components/seo/structured-data";
import { getCachedUser } from "@/lib/supabase/server";
import Image from "next/image";
import { HERO_URL } from "@/components/brand/logo";

const faqItems = [
  {
    question: "UniCebim ücretsiz mi?",
    answer:
      "Evet, UniCebim tamamen ücretsizdir. Üniversite öğrencilerinin bütçe yönetimini kolaylaştırmak için geliştirilmiştir.",
  },
  {
    question: "Verilerim güvende mi?",
    answer:
      "Evet. UniCebim Supabase Auth ile güvenli oturum yönetimi sağlar ve verileriniz Row Level Security (RLS) ile korunur. Tüm verileriniz yalnızca size aittir.",
  },
  {
    question: "Hangi cihazlarda kullanabilirim?",
    answer:
      "UniCebim web tabanlı bir uygulamadır ve tüm modern tarayıcılarda çalışır. Mobil, tablet ve masaüstü cihazlarda kullanabilirsiniz.",
  },
  {
    question: "Verilerimi nasıl yedekleyebilirim?",
    answer:
      "Raporlar sayfasından CSV veya JSON formatında verilerinizi dışa aktarabilirsiniz.",
  },
  {
    question: "Birden fazla cüzdan ekleyebilir miyim?",
    answer:
      "Evet, istediğiniz kadar cüzdan veya hesap ekleyebilir ve her birini ayrı ayrı yönetebilirsiniz.",
  },
  {
    question: "Sabit giderlerimi nasıl eklerim?",
    answer:
      "Dashboard sayfasından 'Sabit Giderler' bölümüne giderek kira, abonelik gibi düzenli giderlerinizi ekleyebilirsiniz.",
  },
];

export default async function Home() {
  const user = await getCachedUser();
  const isAuthenticated = !!user;

  const organizationSchema = generateOrganizationSchema();
  const webApplicationSchema = generateWebApplicationSchema();
  const faqPageSchema = generateFAQPageSchema(faqItems);

  return (
    <div className="min-h-screen flex flex-col">
      <StructuredData data={organizationSchema} />
      <StructuredData data={webApplicationSchema} />
      <StructuredData data={faqPageSchema} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Ana içeriğe geç
      </a>
      <PublicHeader isAuthenticated={isAuthenticated} />

      <main id="main-content" className="flex-1" role="main">
        {/* Hero Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <AnimatedContainer className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Öğrenci bütçeni yönet. Harcamalarını kontrol et.
                </h1>
                <p className="text-pretty text-base text-muted-foreground sm:text-lg lg:text-xl">
                  UniCebim ile gelir ve giderlerini kategorilere ayır, aylık hedef bütçe belirle
                  ve harcama alışkanlıklarını net bir şekilde gör.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Ücretsiz Başla <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Giriş yap</Link>
                </Button>
              </div>
              <FadeIn delay={0.4}>
                <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                    <span>Güvenli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-primary" aria-hidden="true" />
                    <span>Ücretsiz</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PieChart className="size-4 text-primary" aria-hidden="true" />
                    <span>Kolay Kullanım</span>
                  </div>
                </div>
              </FadeIn>
            </div>

            <div className="relative flex items-center justify-center lg:order-last">
              <FadeIn delay={0.3}>
                <div className="animate-float">
                  <Image
                    src={HERO_URL}
                    alt="UniCebim Dashboard Mockup"
                    width={1000}
                    height={1000}
                    className="w-full h-auto scale-[1.25] max-w-lg drop-shadow-none"
                    style={{ filter: 'none' }}
                    priority
                  />
                </div>
              </FadeIn>
            </div>
          </AnimatedContainer>
        </section>
        <Separator />

        {/* Benefits Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Neden UniCebim?
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Öğrenci hayatının finansal zorluklarını kolaylaştırmak için tasarlandı.
            </p>
          </ScrollReveal>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <ScrollReveal delay={0.1}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">Öğrenci Odaklı</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Üniversite öğrencilerinin gerçek ihtiyaçlarına göre tasarlandı. Yemekhane endeksi
                  gibi öğrenciye özel özellikler içerir.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">Görsel Raporlar</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Harcamalarını grafikler ve istatistiklerle görselleştir. Hangi kategoride ne kadar
                  harcadığını net bir şekilde gör.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">Güvenli ve Özel</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Verileriniz yalnızca size aittir. Supabase RLS ile korunur ve hiçbir üçüncü taraf
                  ile paylaşılmaz.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">Akıllı Analiz</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sosyal skor ve bütçe analizi ile harcama alışkanlıklarını öğren ve daha iyi
                  kararlar ver.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.5}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">Kolay Takip</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hızlı işlem ekleme, kategorilere ayırma ve sabit gider takibi ile bütçe yönetimi
                  çok kolay.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.6}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Wallet className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">Tamamen Ücretsiz</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hiçbir gizli ücret yok. Tüm özellikler tamamen ücretsizdir ve her zaman öyle
                  kalacak.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator />

        {/* FAQ Section */}
        <section id="faq" className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Sık Sorulan Sorular
            </h2>
            <p className="text-muted-foreground">
              UniCebim hakkında merak ettikleriniz için yanıtlar.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <FAQAccordion items={faqItems} />
          </ScrollReveal>
        </section>

        <Separator />

        {/* CTA Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal>
            <div className="rounded-lg border bg-card p-8 text-center shadow-sm sm:p-12">
              <FadeIn delay={0.2}>
                <h2 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Hemen Başla
                </h2>
              </FadeIn>
              <FadeIn delay={0.3}>
                <p className="mb-8 mx-auto max-w-2xl text-muted-foreground">
                  Bütçe yönetimini kolaylaştır, harcamalarını kontrol altına al. Ücretsiz hesap
                  oluştur ve bugün başla.
                </p>
              </FadeIn>
              <FadeIn delay={0.4}>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button asChild size="lg">
                    <Link href="/register">
                      Ücretsiz Kayıt Ol <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Zaten hesabın var mı?</Link>
                  </Button>
                </div>
              </FadeIn>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
