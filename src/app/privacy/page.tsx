import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { PublicHeader } from "@/components/layout/public-header";
import { generateMetadata } from "@/lib/seo/metadata";

export const metadata = generateMetadata({
  title: "Gizlilik Politikası",
  description:
    "UniCebim gizlilik politikası: Kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgiler. KVKK ve GDPR uyumlu.",
});

export default function PrivacyPage() {
  const lastUpdated = "2025-01-01";

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main id="main-content" className="flex-1" role="main">
        <article className="mx-auto w-full max-w-3xl px-6 py-12">
          {/* Header */}
          <header className="mb-12">
            <h1 className="mb-4 text-4xl font-semibold tracking-tight">Gizlilik Politikası</h1>
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
              UniCebim olarak, kullanıcılarımızın gizliliğine büyük önem veriyoruz. Bu Gizlilik
              Politikası, UniCebim hizmetlerini kullanırken topladığımız bilgileri, bu bilgileri
              nasıl kullandığımızı ve paylaştığımızı açıklamaktadır. Bu politikayı okumak, verileriniz
              hakkında bilinçli kararlar vermenize yardımcı olacaktır.
            </p>
          </section>

          {/* Data Collection */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Topladığımız Bilgiler</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Hesap Bilgileri</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>E-posta adresi (kimlik doğrulama için)</li>
              <li>İsim ve profil bilgileri (isteğe bağlı)</li>
              <li>Hesap oluşturma tarihi</li>
            </ul>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Finansal Veriler</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>İşlem kayıtları (gelir ve giderler)</li>
              <li>Kategori bilgileri</li>
              <li>Bütçe hedefleri ve ayarları</li>
              <li>Cüzdan bilgileri</li>
            </ul>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Teknik Veriler</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>IP adresi (güvenlik için)</li>
              <li>Tarayıcı türü ve versiyonu</li>
              <li>Cihaz bilgileri</li>
              <li>Kullanım istatistikleri (anonim)</li>
            </ul>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Güvenlik Verileri</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>Oturum bilgileri (JWT token)</li>
              <li>Giriş geçmişi</li>
              <li>Güvenlik olayları (şüpheli aktivite)</li>
            </ul>
          </section>

          {/* Data Usage */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Verilerinizi Nasıl Kullanıyoruz?</h2>
            <p className="mb-4 text-muted-foreground">
              Topladığımız veriler yalnızca aşağıdaki amaçlar için kullanılır:
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Hizmet Sağlama</h3>
            <p className="mb-4 text-muted-foreground">
              Finansal verilerinizi işleyerek bütçe takibi, raporlama ve analiz özelliklerini
              sunmak. Hesap bilgilerinizi kullanarak güvenli oturum yönetimi sağlamak.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Güvenlik ve Güvenilirlik</h3>
            <p className="mb-4 text-muted-foreground">
              Hesabınızı yetkisiz erişimlere karşı korumak, şüpheli aktiviteleri tespit etmek
              ve hizmetlerimizin güvenliğini sağlamak.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Hizmet İyileştirme</h3>
            <p className="mb-4 text-muted-foreground">
              Anonim kullanım istatistiklerini analiz ederek uygulamanın performansını
              artırmak ve yeni özellikler geliştirmek.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">İletişim</h3>
            <p className="mb-4 text-muted-foreground">
              Önemli hizmet güncellemeleri, güvenlik uyarıları veya hesap bilgilerinizle
              ilgili bildirimler göndermek (yalnızca gerekli durumlarda).
            </p>
          </section>

          {/* Data Protection */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Verilerinizin Korunması</h2>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Şifreleme</h3>
            <p className="mb-4 text-muted-foreground">
              Tüm verileriniz Supabase altyapısı üzerinden şifrelenmiş bağlantılar (TLS/SSL)
              ile iletilir. Parolalar bcrypt ile hashlenerek saklanır.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Row Level Security (RLS)</h3>
            <p className="mb-4 text-muted-foreground">
              Veritabanı seviyesinde Row Level Security politikaları ile verileriniz yalnızca
              sizin erişebileceğiniz şekilde korunur. Başka kullanıcılar sizin verilerinize
              erişemez.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Güvenli Altyapı</h3>
            <p className="mb-4 text-muted-foreground">
              Verileriniz Supabase&apos;in güvenli ve uyumlu (SOC 2, ISO 27001) altyapısında
              saklanır. Düzenli yedeklemeler ve felaket kurtarma planları mevcuttur.
            </p>
          </section>

          {/* Data Sharing */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Veri Paylaşımı</h2>
            <p className="mb-4 text-muted-foreground">
              Verilerinizi üçüncü taraflarla paylaşmıyoruz. İstisnalar:
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Hizmet Sağlayıcılar</h3>
            <p className="mb-4 text-muted-foreground">
              Supabase (veritabanı ve kimlik doğrulama), Vercel (hosting) gibi güvenilir
              hizmet sağlayıcılar yalnızca hizmet sağlama amacıyla verilerinize erişir. Bu
              şirketler kendi gizlilik politikalarına uygun olarak çalışır.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Yasal Zorunluluklar</h3>
            <p className="mb-4 text-muted-foreground">
              Yasal bir zorunluluk, mahkeme kararı veya yetkili makam talebi durumunda
              bilgiler paylaşılabilir. Bu durumda mümkün olduğunca sınırlı bilgi paylaşılır.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Asla Paylaşmadığımız Veriler</h3>
            <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
              <li>Finansal verileriniz üçüncü taraflara satılmaz</li>
              <li>Reklam amaçlı veri paylaşımı yapılmaz</li>
              <li>Kişisel bilgileriniz pazarlama şirketleriyle paylaşılmaz</li>
            </ul>
          </section>

          {/* User Rights */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Haklarınız (KVKK ve GDPR)</h2>
            <p className="mb-4 text-muted-foreground">
              Kişisel verileriniz üzerinde aşağıdaki haklara sahipsiniz:
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Erişim Hakkı</h3>
            <p className="mb-4 text-muted-foreground">
              Hangi kişisel verilerinizin işlendiğini öğrenme ve bu verilere erişim talep etme
              hakkı.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Düzeltme Hakkı</h3>
            <p className="mb-4 text-muted-foreground">
              Yanlış veya eksik verilerinizin düzeltilmesini talep etme hakkı. Profil
              sayfanızdan bu işlemi yapabilirsiniz.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Silme Hakkı</h3>
            <p className="mb-4 text-muted-foreground">
              Hesabınızı silme hakkı. Hesap silindiğinde tüm kişisel verileriniz kalıcı olarak
              silinir.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Veri Taşınabilirliği</h3>
            <p className="mb-4 text-muted-foreground">
              Verilerinizi makine okunabilir formatta (JSON/CSV) indirme ve başka bir
              platforma aktarma hakkı.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">İtiraz Hakkı</h3>
            <p className="mb-4 text-muted-foreground">
              Kişisel verilerinizin işlenmesine itiraz etme hakkı. Bu durumda verileriniz
              işlenmeye devam edilmez.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Şikayet Hakkı</h3>
            <p className="mb-4 text-muted-foreground">
              KVKK&apos;ya (Türkiye) veya ilgili veri koruma otoritesine (AB) şikayet başvurusu
              yapma hakkı.
            </p>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Çerezler (Cookies)</h2>
            <p className="mb-4 text-muted-foreground">
              UniCebim, yalnızca zorunlu çerezler kullanır:
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Oturum Çerezleri</h3>
            <p className="mb-4 text-muted-foreground">
              Güvenli oturum yönetimi için kullanılır. Tarayıcı kapatıldığında otomatik olarak
              silinir.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Tercih Çerezleri</h3>
            <p className="mb-4 text-muted-foreground">
              Tema tercihi (açık/koyu mod) gibi kullanıcı ayarlarını hatırlamak için kullanılır.
            </p>

            <h3 className="mb-2 mt-6 text-xl font-semibold">Üçüncü Taraf Çerezler</h3>
            <p className="mb-4 text-muted-foreground">
              Reklam veya izleme amaçlı çerezler kullanılmaz. Analitik için yalnızca anonim
              veriler toplanır.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12 border-t pt-8">
            <h2 className="mb-4 text-2xl font-semibold">Sorularınız mı var?</h2>
            <p className="mb-6 text-muted-foreground">
              Gizlilik politikamız hakkında sorularınız varsa veya haklarınızı kullanmak
              istiyorsanız, lütfen bizimle iletişime geçin.
            </p>
            <div className="flex flex-wrap gap-3">
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
