# Eksik Kalan Geliştirmeler

Plan dosyasındaki 50 maddeden **tamamlananlar: ~42**, **eksik kalanlar: ~8**

## Öncelikli (P0/P1) Eksikler

### 1. **Madde 7: Invalid redirect telemetrisi** — P1 / S
- **Durum**: `safeRedirectPath` var ama "invalid redirect" loglama yok
- **Etkilenen**: `src/lib/url.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/confirming/page.tsx`
- **Efor**: Küçük (1-2 saat)

### 2. **Madde 15: Kategori doğrulaması DB seviyesine** — P1 / M
- **Durum**: Uygulamada `ALL_CATEGORIES` var, DB'de constraint yok
- **Etkilenen**: `docs/supabase.sql`, `src/features/transactions/categories.ts`
- **Efor**: Orta (1 gün)

### 3. **Madde 20: Fixed expense toplamı için SUM** — P1 / S
- **Durum**: Hala uygulamada `reduce` kullanılıyor, DB'de `sum(amount)` yok
- **Etkilenen**: `src/app/actions/fixed-expenses.ts` (gerekirse)
- **Efor**: Küçük (1-2 saat)

### 4. **Madde 21: Zaman dilimi dokümantasyonu** — P1 / S
- **Durum**: UTC/local stratejisi kodda var ama dokümante edilmemiş
- **Etkilenen**: `docs/README.md` veya ayrı bir dokümantasyon dosyası
- **Efor**: Küçük (1-2 saat)

### 5. **Madde 22: RLS testleri** — P1 / M
- **Durum**: Placeholder test var ama tam implementasyon yok (env vars gerekiyor)
- **Etkilenen**: `src/test/rls.integration.test.ts`
- **Efor**: Orta (1 gün)

### 6. **Madde 29: Numeric mapping boundary** — P0 / S ⚠️
- **Durum**: `toFiniteNumber` var ama `mapProfileRow()` / `mapTransactionRow()` yok
- **Etkilenen**: `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/transactions/page.tsx`, `src/app/api/*`
- **Efor**: Küçük (2-3 saat) ama **P0 öncelikli**

## Nice-to-Have (P2) Eksikler

### 7. **Madde 28: Service layer** — P1 / M
- **Durum**: Route Handler ve Server Action'larda kod tekrarı var
- **Etkilenen**: `src/app/actions/*`, `src/app/api/*`, yeni `src/services/*` katmanı
- **Efor**: Büyük (2-3 gün) - refactor gerektirir

### 8. **Madde 38: Form UX placeholder/validasyon** — P2 / S
- **Durum**: "0" placeholder pozitif validasyona ters
- **Etkilenen**: Form bileşenleri
- **Efor**: Küçük (1-2 saat)

### 9. **Madde 41: Transactions filtreleme** — P2 / M
- **Durum**: Kategori/tür/arama filtresi yok
- **Etkilenen**: Transactions sayfası/API
- **Efor**: Orta (1-2 gün)

### 10. **Madde 42: Boş durumlar ve onboarding** — P2 / S
- **Durum**: "hiç işlem yok" ekranlarına CTA yok
- **Etkilenen**: `TransactionHistory`, dashboard
- **Efor**: Küçük (2-3 saat)

### 11. **Madde 47: DB çağrı sayısı optimizasyonu** — P2 / M
- **Durum**: `router.refresh()` / `revalidatePath()` kullanımı optimize edilebilir
- **Etkilenen**: `src/app/actions/*`, client bileşenler
- **Efor**: Orta (1 gün)

## Önerilen Öncelik Sırası

1. **Madde 29** (P0) - Numeric mapping boundary
2. **Madde 7** (P1/S) - Invalid redirect telemetrisi
3. **Madde 20** (P1/S) - Fixed expense SUM
4. **Madde 21** (P1/S) - Zaman dilimi dokümantasyonu
5. **Madde 15** (P1/M) - Kategori doğrulaması DB seviyesine
6. **Madde 22** (P1/M) - RLS testleri
7. P2 maddeler (opsiyonel, ürün zenginleştirme)

## Notlar

- **Madde 28 (Service layer)**: Büyük bir refactor gerektirir, şu an kod tekrarı tolere edilebilir seviyede
- **P2 maddeler**: Ürün zenginleştirme için, MVP için kritik değil
- **Test coverage**: RLS testleri için Supabase test environment gerekiyor

