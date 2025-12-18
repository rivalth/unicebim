# UniCebim (Üniversite Bütçe Takipçisi)

UniCebim, üniversite öğrencilerinin bütçelerini kolayca yönetebilmeleri, harcamalarını takip edebilmeleri ve finansal durumlarını analiz edebilmeleri için tasarlanmış modern bir web uygulamasıdır.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)](https://supabase.com/)

## 🚀 Özellikler

- **Akıllı Bakiye Yönetimi**: Mevcut bakiyenizi farklı cüzdanlar (Nakit, Banka, vb.) üzerinden takip edin.
- **Yemekhane Endeksi**: Bakiyenizin kaç okul yemeğine karşılık geldiğini anında görün.
- **Harca & Takip Et**: Gelir ve giderlerinizi kategorize ederek kaydedin.
- **Gelecek Ödemeler**: Kira, yurt ücreti veya faturalar gibi gelecek ödemelerinizi planlayın.
- **Abonelik Takibi**: Netflix, Spotify gibi düzenli ödemelerinizi tek yerden yönetin.
- **Görsel Analizler**: Harcama trendlerinizi ve kategori dağılımlarınızı grafiklerle inceleyin.
- **Sosyal Skor**: Finansal alışkanlıklarınıza göre sosyal skorunuzu takip edin.
- **Dışa Aktarma**: Verilerinizi CSV veya Excel formatında yedekleyin.

## 🛠 Teknoloji Yığını

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **State Management**: Zustand
- **Formlar**: React Hook Form + Zod
- **Bileşen Kütüphanesi**: shadcn/ui
- **Backend & Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Grafikler**: Recharts
- **Test**: Vitest + Testing Library

## 📦 Kurulum

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

1.  **Depoyu kopyalayın**:
    ```bash
    git clone https://github.com/rivalth/unicebim.git
    cd unicebim
    ```

2.  **Bağımlılıkları yükleyin**:
    ```bash
    yarn
    ```

3.  **Çevresel Değişkenleri Yapılandırın**:
    `env.example` dosyasını `.env.local` olarak kopyalayın ve Supabase bilgilerinizi girin:
    ```bash
    cp env.example .env.local
    ```

4.  **Veritabanı Kurulumu**:
    `docs/supabase.sql` dosyasındaki SQL komutlarını Supabase SQL Editor üzerinden çalıştırın.

5.  **Geliştirme Sunucusunu Başlatın**:
    ```bash
    yarn dev
    ```

Tarayıcınızda `http://localhost:3000` adresine giderek uygulamayı kullanmaya başlayabilirsiniz.

## 📄 Dokümantasyon

Daha fazla detay için `docs` klasörünü inceleyebilirsiniz:
- [Veritabanı Şeması](docs/supabase.sql)
- [API Dokümantasyonu (OpenAPI)](docs/openapi.yaml)
- [Zaman Dilimi Stratejisi](docs/timezone-strategy.md)

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını inceleyin.

## 🛡 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakabilirsiniz.

---
*Geliştiren: [Can](https://github.com/rivalth)*
