import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { PublicHeader } from "@/components/layout/public-header";
import { generateMetadata } from "@/lib/seo/metadata";

export const metadata = generateMetadata({
  title: "Kullanım Şartları",
  description:
    "UniCebim kullanım şartları: Hizmetlerimizi kullanırken uymanız gereken kurallar ve sorumluluklarınız hakkında bilgiler.",
});

export default function TermsPage() {
  const lastUpdated = "2025-01-01";

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main id="main-content" className="flex-1" role="main">
        <article className="mx-auto w-full max-w-3xl px-6 py-12">
          {/* Header */}
          <header className="mb-12">
            <h1 className="mb-4 text-4xl font-semibold tracking-tight">Kullanım Şartları</h1>
            <p className="text-muted-foreground">
              Son Güncelleme: {new Date(lastUpdated).toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </header>

          {/* Introduction */}
          <section className="mb-12">
            <p className="text-muted-foreground">
              Bu Kullanım Şartları (&quot;Şartlar&quot;), UniCebim web sitesi ve uygulamasını
              (&quot;Hizmet&quot;) kullanımınızı yönetir. Hizmeti kullanarak, bu şartları kabul
              etmiş sayılırsınız. Eğer bu şartları kabul etmiyorsanız, lütfen hizmeti
              kullanmayın.
            </p>
          </section>

          {/* Acceptance */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Şartları Kabul Etme</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Yaş Şartı</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim&apos;i kullanmak için en az 18 yaşında olmalısınız veya yasal
              vasinizin izniyle kullanmalısınız. 18 yaşın altındaysanız, bir ebeveyn veya
              vasiniz bu şartları sizin adınıza kabul etmelidir.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Hesap Sorumluluğu</h3>
            <p className="mb-4 text-muted-foreground">
              Hesabınızın güvenliğinden ve hesabınız altında yapılan tüm aktivitelerden
              sorumlusunuz. Şifrenizi gizli tutmalı ve yetkisiz erişimlere karşı korumalısınız.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Doğru Bilgi</h3>
            <p className="mb-4 text-muted-foreground">
              Hesap oluştururken ve kullanırken doğru, güncel ve eksiksiz bilgiler
              sağlamalısınız. Yanlış bilgi vermek, hizmet şartlarını ihlal eder.
            </p>
          </section>

          {/* Service Usage */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Hizmet Kullanımı</h2>
            <p className="mb-4 text-muted-foreground">
              Hizmeti kullanırken uymanız gereken kurallar:
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">İzin Verilen Kullanım</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>Kişisel bütçe takibi</li>
              <li>Finansal verilerinizi yönetme</li>
              <li>Raporlama ve analiz özelliklerini kullanma</li>
              <li>Yasal ve etik amaçlarla kullanım</li>
            </ul>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Yasaklanan Kullanım</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>Yasadışı faaliyetler</li>
              <li>Hizmeti bozma veya engelleme</li>
              <li>Başkalarının hesaplarına erişim</li>
              <li>Otomatik bot veya script kullanımı</li>
              <li>Spam veya zararlı içerik paylaşımı</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Telif Hakları ve Lisans</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">UniCebim&apos;in Hakları</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim web sitesi, uygulaması ve tüm içeriği (kod, tasarım, logo, metinler)
              telif hakkı ve diğer fikri mülkiyet yasaları ile korunmaktadır. Bu içerikleri
              izinsiz kopyalama, dağıtma veya kullanma yasaktır.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Kullanıcı İçeriği</h3>
            <p className="mb-4 text-muted-foreground">
              Hizmete yüklediğiniz veriler (işlemler, notlar vb.) size aittir. Bu verileri
              istediğiniz zaman silebilir veya dışa aktarabilirsiniz. UniCebim, bu verileri
              yalnızca hizmeti sağlamak için kullanır.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Açık Kaynak</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim açık kaynak bir projedir. Kaynak koduna erişim ve katkıda bulunma
              hakkınız vardır, ancak bu kullanım şartlarına uygun olmalıdır.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Sorumluluk ve Garantiler</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Hizmet &quot;Olduğu Gibi&quot; Sunulur</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim, hizmeti &quot;olduğu gibi&quot; ve &quot;mümkün olduğunca&quot; sunar.
              Hizmetin kesintisiz, hatasız veya güvenli olacağına dair garanti vermiyoruz.
              Hizmetteki hatalar veya eksikliklerden sorumlu değiliz.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Finansal Tavsiye Değildir</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim, finansal tavsiye, yatırım önerisi veya mali danışmanlık hizmeti
              sağlamaz. Hizmet, yalnızca bütçe takibi ve finansal veri yönetimi için bir
              araçtır. Finansal kararlarınızı kendi sorumluluğunuzda almalısınız.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Veri Kaybı</h3>
            <p className="mb-4 text-muted-foreground">
              Verilerinizin yedeklenmesinden kullanıcı sorumludur. Teknik sorunlar, doğal
              afetler veya beklenmedik durumlar nedeniyle veri kaybı yaşanması durumunda
              UniCebim sorumlu tutulamaz. Düzenli yedekleme yapmanızı öneririz.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Üçüncü Taraf Hizmetler</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim, Supabase, Vercel gibi üçüncü taraf hizmet sağlayıcılar kullanır. Bu
              hizmetlerin kesintileri veya sorunlarından UniCebim sorumlu değildir.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Hesap Sonlandırma</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Kullanıcı Tarafından</h3>
            <p className="mb-4 text-muted-foreground">
              Hesabınızı istediğiniz zaman silebilirsiniz. Hesap silindiğinde, tüm verileriniz
              kalıcı olarak silinir ve geri alınamaz.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">UniCebim Tarafından</h3>
            <p className="mb-4 text-muted-foreground">
              Bu kullanım şartlarını ihlal etmeniz durumunda, hesabınız uyarı verilmeden
              sonlandırılabilir. Yasadışı faaliyetlerde bulunmanız durumunda yasal işlem
              başlatılabilir.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Şartlarda Değişiklik</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Güncellemeler</h3>
            <p className="mb-4 text-muted-foreground">
              UniCebim, bu kullanım şartlarını zaman zaman güncelleyebilir. Önemli
              değişiklikler yapıldığında, kullanıcılar e-posta veya uygulama içi bildirim ile
              bilgilendirilir. Değişiklikler yayınlandıktan sonra hizmeti kullanmaya devam
              etmeniz, güncellenmiş şartları kabul ettiğiniz anlamına gelir.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Geri Bildirim</h3>
            <p className="mb-4 text-muted-foreground">
              Şartlarla ilgili sorularınız veya önerileriniz varsa, lütfen bizimle iletişime
              geçin. Kullanıcı geri bildirimlerini ciddiye alıyoruz.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Uygulanacak Hukuk</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Türk Hukuku</h3>
            <p className="mb-4 text-muted-foreground">
              Bu kullanım şartları, Türkiye Cumhuriyeti yasalarına tabidir. Bu şartlardan
              kaynaklanan herhangi bir uyuşmazlık, Türkiye mahkemelerinde çözülecektir.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Uyuşmazlık Çözümü</h3>
            <p className="mb-4 text-muted-foreground">
              Herhangi bir uyuşmazlık durumunda, öncelikle dostane bir çözüm bulmaya
              çalışılacaktır. Gerekirse, Türkiye&apos;deki ilgili mahkemeler yetkili olacaktır.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12 border-t pt-8">
            <h2 className="mb-4 text-2xl font-semibold">Sorularınız mı var?</h2>
            <p className="mb-6 text-muted-foreground">
              Kullanım şartları hakkında sorularınız varsa veya daha fazla bilgi almak
              istiyorsanız, lütfen bizimle iletişime geçin.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/privacy">Gizlilik Politikası</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/about">Hakkımızda</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Hesap Oluştur</Link>
              </Button>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
