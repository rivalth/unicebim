# UniCebim Dokümantasyonu

UniCebim projesinin teknik detayları ve kullanım rehberleri burada yer almaktadır.

## 🚀 Başlangıç
- **[Başlangıç Rehberi](GETTING_STARTED.md)**: Projeyi sıfırdan kurmak için adım adım rehber.

## 🛠 Teknik Detaylar
- **[Veritabanı Şeması (Supabase)](supabase.sql)**: PostgreSQL tabloları, RLS politikaları ve trigger'lar.
- **[API Dokümantasyonu (OpenAPI)](openapi.yaml)**: REST API endpoint'leri ve veri yapıları.
- **[Zaman Dilimi Stratejisi](timezone-strategy.md)**: Uygulamanın tarih ve saat yönetim politikası.

## 📈 Geliştirme Süreci
- **[Geliştirme Önerileri (Backlog)](gelistirme-onerileri.md)**: Gelecek özellikler ve teknik iyileştirmeler.
- **[Eksik Kalan Maddeler](eksik-kalan-maddeler.md)**: Mevcut sürümdeki bilinen eksikler.
- **[Profil Sayfası Önerileri](profil-sayfasi-onerileri.md)**: Kullanıcı profili için planlanan geliştirmeler.

## 🏗 Mimari Notlar
- Bu proje **Next.js 15 (App Router)** ve **Supabase SSR** mimarisi üzerine inşa edilmiştir.
- Tip güvenliği için **TypeScript** ve **Zod** kullanılmaktadır.
- UI bileşenleri **shadcn/ui** tabanlıdır ve **Tailwind CSS** ile özelleştirilmiştir.

---

### Supabase Tipleri (TypeScript)

Projede `src/lib/supabase/types.ts` altında temel tipler bulunmaktadır. Kendi Supabase projenizden güncel tipleri üretmek için:

```bash
yarn supabase:types
```

**Gereksinimler:**
- Supabase CLI yüklü olmalı (`supabase`)
- `SUPABASE_PROJECT_ID` env ayarlı olmalı veya `supabase link` yapılmış olmalı.

### RLS Entegrasyon Testleri

RLS izolasyonunu doğrulamak için bir test süiti bulunmaktadır. Bu testler varsayılan olarak atlanır. Çalıştırmak için `.env.local` dosyasına aşağıdaki bilgileri ekleyin:

- `SUPABASE_TEST_URL`
- `SUPABASE_TEST_ANON_KEY`
- `SUPABASE_TEST_SERVICE_ROLE_KEY`

Ardından:
```bash
yarn test:run
```
