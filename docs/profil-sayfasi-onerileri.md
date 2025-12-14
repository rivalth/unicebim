# Profil Düzenleme Sayfası - Özellik Önerileri

## Genel Bakış
Bu dokümantasyon, `/profile` sayfasında yer alacak özellikleri ve bölümleri detaylandırmaktadır. Sayfa, kullanıcının hesap bilgilerini, bütçe ayarlarını ve tercihlerini yönetmesine olanak sağlayacaktır.

---

## 1. Hesap Bilgileri Bölümü

### 1.1. Kişisel Bilgiler
- **Tam Ad (full_name)**
  - Input: Text
  - Validasyon: Min 2 karakter, max 100 karakter
  - Açıklama: "Görünen adın. Dashboard'da 'Merhaba, {ad}' şeklinde gösterilir."
  - Zorunlu mu: Hayır

- **E-posta Adresi**
  - Input: Read-only (Supabase Auth'tan gelir)
  - Gösterim: `user.email`
  - Not: "E-posta değişikliği için lütfen Supabase Dashboard'dan iletişime geçin." şeklinde bilgilendirme

### 1.2. Hesap Durumu
- **Üyelik Tarihi**
  - Gösterim: `user.created_at` (sadece okuma)
  - Format: "DD MMMM YYYY" (örn: "15 Ocak 2024")

- **Hesap Durumu**
  - Badge: Aktif / Email Doğrulanmamış
  - Durum: `user.email_confirmed_at` kontrolü

---

## 2. Bütçe Ayarları Bölümü

Bu bölüm, mevcut `BudgetSettingsForm` bileşeninin daha düzenli bir şekilde profil sayfasına entegre edilmesidir.

### 2.1. Aylık Bütçe Hedefi
- **Aylık Hedef Bütçe (monthly_budget_goal)**
  - Input: Number (decimal)
  - Validasyon: Pozitif sayı, min 0, max 1.000.000
  - Placeholder: "Örn: 5000"
  - Açıklama: "Her ay için hedeflediğin toplam harcama limiti (₺)"

### 2.2. Gelir Planlaması
- **Bir Sonraki Gelir/Burs Tarihi (next_income_date)**
  - Input: Date picker
  - Validasyon: Bugünden sonraki bir tarih
  - Açıklama: "Burs veya gelir gününü seç. Dashboard'da günlük harcama limiti hesaplanır."
  - İlişkili: `IncomeCountdown` bileşeni

### 2.3. Yemekhane Ayarları
- **Yemekhane Öğün Fiyatı (meal_price)**
  - Input: Number (decimal)
  - Validasyon: Pozitif sayı, min 0
  - Placeholder: "Örn: 15"
  - Açıklama: "Okulda bir öğün yemeğin fiyatı. Dashboard'da bakiyeni 'kaç öğün yemek' olarak görebilirsin."
  - İlişkili: `MealIndex` bileşeni

### 2.4. Sabit Giderler
- **Aylık Sabit Giderler Toplamı**
  - Gösterim: Read-only (hesaplanan değer)
  - Format: `{monthly_fixed_expenses ?? 0} ₺`
  - Açıklama: "Aşağıdaki listeden sabit giderlerini yönetebilirsin."

- **Sabit Gider Listesi**
  - Component: `FixedExpensesList` (mevcut)
  - Component: `AddFixedExpenseForm` (mevcut)
  - İşlev: Ekle, düzenle, sil

---

## 3. Cüzdan Yönetimi Bölümü

### 3.1. Cüzdanlar
- **Cüzdan Listesi**
  - Component: `WalletsList` (mevcut)
  - Component: `AddWalletForm` (mevcut)
  - İşlevler:
    - Cüzdan ekle
    - Cüzdan düzenle (isim, bakiye, varsayılan durumu)
    - Cüzdan sil
    - Cüzdanlar arası transfer

### 3.2. Varsayılan Cüzdan
- **Açıklama**: "Yeni işlemlerde varsayılan olarak kullanılacak cüzdan. Tek bir cüzdan varsayılan olarak işaretlenebilir."

---

## 4. Bildirim Tercihleri (Gelecek Özellik - Şimdilik Opsiyonel)

### 4.1. E-posta Bildirimleri
- **Bütçe Uyarıları**
  - Toggle: Açık / Kapalı
  - Açıklama: "Aylık harcamaların bütçe hedefinin %80'ine ulaştığında e-posta bildirimi al"

- **Gelir Günü Hatırlatıcıları**
  - Toggle: Açık / Kapalı
  - Açıklama: "Gelir/burs gününden 3 gün önce hatırlatıcı e-posta al"

### 4.2. Uygulama İçi Bildirimler
- **Günlük Harcama Limit Uyarıları**
  - Toggle: Açık / Kapalı
  - Açıklama: "Günlük harcanabilir limitin %50'sinin altına düştüğünde uyarı göster"

---

## 5. Veri Yönetimi Bölümü

### 5.1. Veri Dışa Aktarma
- **Export İşlemleri**
  - Button: "İşlemleri CSV olarak indir"
  - Fonksiyon: Mevcut ay veya seçilen tarih aralığındaki tüm işlemleri CSV formatında indir
  - Format: `transactions_YYYY-MM-DD.csv`
  - Kolonlar: Tarih, Tip, Kategori, Tutar, Cüzdan, Not

### 5.2. Veri İçe Aktarma (Gelecek Özellik - Şimdilik Opsiyonel)
- **CSV İçe Aktarma**
  - Input: File upload
  - Validasyon: CSV formatı, uygun kolon yapısı
  - Açıklama: "CSV dosyasından toplu işlem yükleyebilirsin"

### 5.3. Veri Temizleme
- **Hesabı Sıfırla**
  - Button: Danger variant
  - Onay Dialog: "Bu işlem geri alınamaz. Tüm işlemler, cüzdanlar ve ayarlar silinecek. Devam etmek istediğine emin misin?"
  - İşlev: Tüm kullanıcı verilerini sil (RLS politikaları gereği sadece kendi verileri)

---

## 6. Güvenlik Bölümü

### 6.1. Parola Değiştirme
- **Mevcut Parola**
  - Input: Password
  - Validasyon: Zorunlu

- **Yeni Parola**
  - Input: Password
  - Validasyon: Min 8 karakter, en az bir büyük harf, bir küçük harf, bir rakam

- **Yeni Parola (Tekrar)**
  - Input: Password
  - Validasyon: Yeni parola ile eşleşmeli

- **İşlev**: Supabase Auth `updateUser` API kullanılacak

### 6.2. Oturum Yönetimi
- **Aktif Oturumlar**
  - Liste: Cihaz, IP adresi, son aktivite zamanı
  - İşlev: "Tüm oturumları sonlandır" butonu (diğer cihazlardan çıkış yap)

---

## 7. Sayfa Düzeni ve Navigasyon

### 7.1. Genel Yapı
```
┌─────────────────────────────────────┐
│  [Geri]  Profil                     │ (Mobil header)
├─────────────────────────────────────┤
│                                     │
│  [Profil Resmi/Avatar]              │
│  {Kullanıcı Adı}                    │
│  {E-posta}                          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 1. Hesap Bilgileri          │   │
│  │    - Tam Ad                 │   │
│  │    - E-posta (read-only)    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 2. Bütçe Ayarları           │   │
│  │    - Aylık hedef bütçe      │   │
│  │    - Gelir tarihi           │   │
│  │    - Öğün fiyatı            │   │
│  │    - Sabit giderler         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 3. Cüzdan Yönetimi          │   │
│  │    - Cüzdan listesi         │   │
│  │    - Cüzdan ekle/düzenle    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 4. Veri Yönetimi            │   │
│  │    - CSV dışa aktarma       │   │
│  │    - Hesabı sıfırla         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 5. Güvenlik                 │   │
│  │    - Parola değiştir        │   │
│  │    - Oturum yönetimi        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Çıkış Yap]                        │
│                                     │
└─────────────────────────────────────┘
```

### 7.2. Responsive Tasarım
- **Mobil**: Tek sütun, kartlar alt alta
- **Tablet/Desktop**: Daha geniş kartlar, iki sütunlu düzen (opsiyonel)

### 7.3. Form Validasyonu
- Tüm form alanları için Zod schema kullanılacak
- Client-side ve server-side validasyon
- Hata mesajları Türkçe ve açıklayıcı

### 7.4. Loading States
- Form gönderiminde: Loading spinner + disabled inputs
- Veri yükleme: Skeleton loaders

### 7.5. Success/Error Feedback
- Başarılı kayıt: Toast bildirimi ("Ayarlar başarıyla kaydedildi")
- Hata: Toast bildirimi + form alanlarında hata mesajları

---

## 8. Teknik Gereksinimler

### 8.1. Server Actions
- `updateProfileAction`: Profil bilgilerini güncelle (full_name, vb.)
- `updatePasswordAction`: Parola değiştir
- `exportTransactionsAction`: CSV export
- `deleteAccountAction`: Hesap silme (tehlikeli işlem, onay gerekli)

### 8.2. API Endpoints
- Mevcut `/api/profile` endpoint'i kullanılacak (GET, PATCH)

### 8.3. Database Queries
- `profiles` tablosu: `full_name`, `monthly_budget_goal`, `meal_price`, `next_income_date`, `monthly_fixed_expenses`
- `wallets` tablosu: Cüzdan listesi
- `fixed_expenses` tablosu: Sabit giderler
- `transactions` tablosu: Export için

### 8.4. Mevcut Component'ler
- `BudgetSettingsForm`: Bütçe ayarları için (profil sayfasına taşınacak veya yeniden kullanılacak)
- `WalletsList`: Cüzdan listesi
- `AddWalletForm`: Cüzdan ekleme
- `FixedExpensesList`: Sabit giderler listesi
- `AddFixedExpenseForm`: Sabit gider ekleme

---

## 9. Öncelik Sıralaması

### Faz 1: Temel Özellikler (P0 - Zorunlu)
1. ✅ Hesap Bilgileri (Tam ad, e-posta gösterimi)
2. ✅ Bütçe Ayarları (mevcut `BudgetSettingsForm` entegrasyonu)
3. ✅ Cüzdan Yönetimi (mevcut component'ler)

### Faz 2: Güvenlik ve Veri (P1 - Önemli)
4. ⏳ Parola değiştirme
5. ⏳ Veri dışa aktarma (CSV)

### Faz 3: Gelişmiş Özellikler (P2 - İsteğe Bağlı)
6. ⏳ Bildirim tercihleri
7. ⏳ Oturum yönetimi
8. ⏳ Veri içe aktarma
9. ⏳ Hesap silme

---

## 10. Kullanıcı Deneyimi Notları

- Tüm form alanları için açıklayıcı placeholder ve helper text
- Kritik işlemler (hesap silme, parola değiştirme) için onay dialog'ları
- Responsive tasarım: Mobil öncelikli, desktop'ta daha geniş görünüm
- Erişilebilirlik: ARIA label'lar, keyboard navigasyonu
- Performans: Lazy loading, code splitting

---

## Notlar
- Bu öneri dokümantasyonu, kullanıcı geri bildirimlerine göre revize edilebilir
- Bazı özellikler (bildirimler, içe aktarma) gelecek sürümlerde eklenebilir
- Mevcut component'ler (`BudgetSettingsForm`, `WalletsList`, vb.) profil sayfasına entegre edilecek veya refactor edilecek
