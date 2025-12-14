import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Code,
  Coffee,
  GraduationCap,
  Heart,
  Lightbulb,
  Rocket,
  Target,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Footer } from "@/components/layout/footer";
import { PublicHeader } from "@/components/layout/public-header";
import { ScrollReveal, FadeIn } from "@/components/animations";
import { generateMetadata } from "@/lib/seo/metadata";

export const metadata = generateMetadata({
  title: "Hakkımızda",
  description:
    "UniCebim'in hikayesi: Bir üniversite öğrencisinin bütçe takip sorununu çözme yolculuğu. Öğrenciler için öğrenciler tarafından yapıldı.",
});

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main id="main-content" className="flex-1" role="main">
        {/* Hero Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-2 text-sm">
              <Heart className="size-4 text-primary" aria-hidden="true" />
              <span>Öğrenciler için, öğrenciler tarafından</span>
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Bir Öğrencinin Hikayesi
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Bütçe takibinde yaşadığım zorluklar, beni bu uygulamayı yapmaya itti. Şimdi dünyadaki
              tüm öğrencilerle paylaşıyorum.
            </p>
          </ScrollReveal>
        </section>

        <Separator />

        {/* Problem Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-destructive/10 px-4 py-2 text-sm text-destructive">
              <Coffee className="size-4" aria-hidden="true" />
              <span>Gerçek Bir Problem</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ay Sonu Geldiğinde...
        </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Her ay aynı sorun: Nereye gitti bu para?
            </p>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ScrollReveal delay={0.1}>
              <div className="flex h-full flex-col rounded-lg border bg-card p-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-destructive/10">
                  <Wallet className="size-6 text-destructive" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Bütçe Karmaşası</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Gelir ve giderlerimi takip edemiyordum. Hangi kategoride ne kadar harcadığımı
                  bilmiyordum. Ay sonu geldiğinde cüzdanım boştu ama nereye gittiğini anlamıyordum.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="flex h-full flex-col rounded-lg border bg-card p-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-destructive/10">
                  <GraduationCap className="size-6 text-destructive" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Öğrenci Hayatı Zor</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Kısıtlı bütçeyle yaşamak zorundaydım. Kira, yemek, ulaşım, okul masrafları...
                  Hepsi birbirine karışıyordu. Hangi harcamalarım zorunlu, hangileri gereksizdi?
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex h-full flex-col rounded-lg border bg-card p-6">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-destructive/10">
                  <Target className="size-6 text-destructive" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Hedefsiz Harcama</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Aylık bir hedefim yoktu. Ne kadar harcayabileceğimi bilmiyordum. Sonuç? Plansız
                  harcamalar ve sürekli bütçe aşımı. Bir şeyler değişmeliydi.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator />

        {/* Solution Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-4 py-2 text-sm text-primary">
              <Lightbulb className="size-4" aria-hidden="true" />
              <span>Çözüm Buldum</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ve Bir Gün Karar Verdım
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Kendi sorunumu çözmek için bir uygulama yapmaya başladım.
            </p>
          </ScrollReveal>

          <div className="space-y-8">
            <ScrollReveal>
              <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary">
                    <Code className="size-6 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Kod Yazmaya Başladım</h3>
                    <p className="text-sm text-muted-foreground">2025 - Hackathon Zamanı</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Kendi çapımda bir hackathon düzenledim ve 24 saatten daha kısa sürede bu projeyi
                  hazırladım. Gece gündüz çalıştım, uyumadım. Next.js, TypeScript, Supabase
                  öğrendim. Her özelliği kendi ihtiyacıma göre tasarladım. Kategorilere ayırma,
                  bütçe takibi, raporlar... Hepsi benim gerçek ihtiyaçlarımdan doğdu ve o 24 saat
                  içinde hayata geçti.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="rounded-lg border bg-card p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <Rocket className="size-6 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">İlk Versiyon Hazırdı</h3>
                    <p className="text-sm text-muted-foreground">MVP Tamamlandı</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Kendi bütçemi takip etmeye başladım. İşe yaradı! Ay sonu geldiğinde artık
                  nereye gittiğini biliyordum. Harcamalarımı kategorilere ayırdım, aylık hedef
                  belirledim ve bütçeme uydum. Bu kadar basit bir çözüm neden daha önce
                  düşünmedim?
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary">
                    <Users className="size-6 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Dünyaya Yaydım</h3>
                    <p className="text-sm text-muted-foreground">Paylaşma Zamanı</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Bu uygulama sadece benim için değildi. Dünyadaki milyonlarca üniversite
                  öğrencisi aynı sorunları yaşıyordu. Onlara da yardımcı olmak istedim. Ücretsiz,
                  açık kaynak, güvenli ve öğrenci odaklı bir çözüm sunmak istedim. İşte UniCebim
                  böyle doğdu.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator />

        {/* Mission Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Misyonumuz ve Vizyonumuz
            </h2>
          </ScrollReveal>

          <div className="grid gap-8 md:grid-cols-2">
            <ScrollReveal>
              <div className="flex h-full flex-col space-y-4 rounded-lg border bg-card p-8">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="size-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold">Misyonumuz</h3>
                <p className="flex-1 text-muted-foreground">
                  Üniversite öğrencilerinin finansal özgürlüğünü desteklemek. Bütçe yönetimini
                  kolaylaştırarak, öğrencilerin eğitimlerine odaklanmalarını sağlamak. Her
                  öğrencinin kendi bütçesini kontrol edebilmesi, bilinçli harcama yapabilmesi ve
                  geleceğe yatırım yapabilmesi için araçlar sunmak.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="flex h-full flex-col space-y-4 rounded-lg border bg-card p-8">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <Rocket className="size-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold">Vizyonumuz</h3>
                <p className="flex-1 text-muted-foreground">
                  Dünyadaki tüm üniversite öğrencilerinin bütçe yönetiminde ilk tercihi olmak.
                  Öğrenci odaklı, ücretsiz ve güvenli bir platform sunarak finansal okuryazarlığı
                  artırmak. Her öğrencinin kendi finansal geleceğini şekillendirebilmesi için
                  güçlü araçlar sağlamak.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator />

        {/* Values Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Değerlerimiz
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              UniCebim&apos;i oluştururken rehber aldığımız prensipler.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <ScrollReveal delay={0.1}>
              <div className="flex h-full flex-col text-center">
                <div className="mb-4 mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="size-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-semibold">Öğrenci Odaklı</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Her özellik, gerçek öğrenci ihtiyaçlarından doğdu. Yemekhane endeksi gibi
                  öğrenciye özel çözümler.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="flex h-full flex-col text-center">
                <div className="mb-4 mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Wallet className="size-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-semibold">Tamamen Ücretsiz</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Hiçbir gizli ücret yok. Tüm özellikler her zaman ücretsiz kalacak. Öğrenciler
                  için, öğrencilerle.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex h-full flex-col text-center">
                <div className="mb-4 mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="size-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-semibold">Şeffaflık</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Açık kaynak kod, şeffaf veri kullanımı. Verileriniz yalnızca size aittir ve
                  korunur.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <div className="flex h-full flex-col text-center">
                <div className="mb-4 mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="size-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-semibold">Topluluk</h3>
                <p className="flex-1 text-sm text-muted-foreground">
                  Öğrencilerden öğrencilere. Geri bildirimlerinizle birlikte büyüyoruz ve
                  gelişiyoruz.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator />

        {/* Tech Stack Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal className="mb-12 space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Teknoloji Yığını
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Modern, güvenli ve performanslı teknolojiler kullanıyoruz.
            </p>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Next.js", desc: "React framework" },
              { name: "TypeScript", desc: "Type-safe JavaScript" },
              { name: "Supabase", desc: "Backend & Auth" },
              { name: "Tailwind CSS", desc: "Styling" },
              { name: "shadcn/ui", desc: "UI Components" },
              { name: "Motion", desc: "Animations" },
              ].map((tech, index) => (
                <ScrollReveal key={tech.name} delay={index * 0.1}>
                  <div className="flex h-full flex-col rounded-lg border bg-card p-4 text-center">
                  <h3 className="font-semibold">{tech.name}</h3>
                  <p className="text-sm text-muted-foreground">{tech.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <Separator />

        {/* CTA Section */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <ScrollReveal>
            <div className="rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 p-12 text-center">
              <FadeIn delay={0.2}>
                <h2 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Bize Katıl
                </h2>
              </FadeIn>
              <FadeIn delay={0.3}>
                <p className="mb-8 mx-auto max-w-2xl text-muted-foreground">
                  Bu yolculukta bize katıl. Bütçeni yönet, harcamalarını kontrol et ve finansal
                  özgürlüğüne kavuş. Ücretsiz hesap oluştur ve bugün başla.
                </p>
              </FadeIn>
              <FadeIn delay={0.4}>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button asChild size="lg">
                    <Link href="/register">
                      Ücretsiz Başla <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/">Ana Sayfaya Dön</Link>
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

