# UniCebim - Başlangıç Rehberi

Bu rehber, UniCebim'i kendi yerel ortamınızda nasıl kuracağınızı ve geliştirmeye başlayacağınızı detaylı olarak anlatmaktadır.

## 📋 Ön Gereksinimler

- **Node.js**: v18.x veya üzeri
- **Yarn**: v1.x (önerilen) veya npm
- **Supabase Hesabı**: Ücretsiz bir [Supabase](https://supabase.com/) hesabı

## 🛠 Adım 1: Projeyi Yerelleştirin

Öncelikle depoyu kendi bilgisayarınıza klonlayın ve bağımlılıkları yükleyin:

```bash
git clone https://github.com/rivalth/unicebim.git
cd unicebim
yarn install
```

## ☁️ Adım 2: Supabase Kurulumu

1.  [Supabase Dashboard](https://app.supabase.com/)'a gidin ve yeni bir proje oluşturun.
2.  **SQL Editor**'e gidin.
3.  `docs/supabase.sql` dosyasının içeriğini kopyalayıp SQL Editor'e yapıştırın ve **Run** butonuna basın.
    *   Bu işlem; tabloları, RLS politikalarını, trigger'ları ve gerekli fonksiyonları oluşturacaktır.
4.  **Storage** kısmına gidin:
    *   `avatars` isminde **public** bir bucket oluşturun.
    *   `docs/supabase.sql` içindeki "STEP 2" altındaki adımları izleyerek RLS politikalarını manuel olarak ekleyin.

## 🔑 Adım 3: Çevresel Değişkenler

`.env.local` dosyasını oluşturun:

```bash
cp env.example .env.local
```

Aşağıdaki bilgileri Supabase Dashboard -> Project Settings -> API kısmından alarak doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`: Proje URL'niz
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/public key

## 🚀 Adım 4: Uygulamayı Çalıştırın

Geliştirme sunucusunu başlatın:

```bash
yarn dev
```

Artık `http://localhost:3000` adresinden uygulamaya erişebilirsiniz.

## 🧪 Adım 5: Testleri Çalıştırın

Projenin düzgün çalıştığından emin olmak için testleri çalıştırabilirsiniz:

```bash
yarn test:run
```

## 📖 Sonraki Adımlar

- Proje yapısını anlamak için `README.md` dosyasını okuyun.
- Katkıda bulunmak için `CONTRIBUTING.md` dosyasını inceleyin.
- Herhangi bir sorunda [GitHub Issues](https://github.com/rivalth/unicebim/issues) üzerinden bize ulaşın.

---
Keyifli geliştirmeler! 🚀

