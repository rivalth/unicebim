# Zaman Dilimi Stratejisi (Timezone Strategy)

## Genel Yaklaşım

UniCebim, **UTC (Coordinated Universal Time)** tabanlı bir zaman dilimi stratejisi kullanır. Tüm tarih/saat işlemleri UTC'de yapılır ve veritabanında UTC timestamp'ler olarak saklanır.

## Neden UTC?

1. **Tutarlılık**: Farklı zaman dilimlerindeki kullanıcılar için aynı veri seti
2. **Basitlik**: Zaman dilimi dönüşümleri sadece görüntüleme katmanında gerekli
3. **Veritabanı Performansı**: UTC tabanlı sorgular daha hızlı ve öngörülebilir
4. **Yaz Saati (DST) Sorunları**: UTC, yaz saati geçişlerinden etkilenmez

## Uygulama Detayları

### 1. Transaction Tarihleri

- **Kullanıcı Girişi**: `<input type="date" />` ile YYYY-MM-DD formatında alınır
- **Veritabanı**: UTC `timestamptz` olarak saklanır
- **Sorgular**: UTC ay sınırları kullanılır (`gte` ve `lt` ile)

**Örnek:**
```typescript
// Kullanıcı "2024-01-15" seçer
// Veritabanına: "2024-01-15T00:00:00.000Z" (UTC) olarak kaydedilir
// Sorgu: date >= "2024-01-01T00:00:00.000Z" AND date < "2024-02-01T00:00:00.000Z"
```

### 2. Ay Bazlı Sorgular

Ay bazlı sorgular için `src/lib/month.ts` modülü kullanılır:

```typescript
import { getUtcMonthRange, getUtcMonthRangeStrict } from "@/lib/month";

// Mevcut ay (UTC)
const currentMonth = getUtcMonthRange(null);

// Belirli bir ay (YYYY-MM formatında)
const january2024 = getUtcMonthRangeStrict("2024-01");
```

**Önemli Notlar:**
- Ay sınırları **UTC'de** hesaplanır
- `start`: Ayın ilk günü 00:00:00 UTC (inclusive)
- `end`: Bir sonraki ayın ilk günü 00:00:00 UTC (exclusive)
- API endpoint'leri `month` parametresini YYYY-MM formatında kabul eder

### 3. Görüntüleme (Display)

Kullanıcıya gösterilen tarihler, tarayıcının yerel zaman dilimine göre formatlanır:

```typescript
// UTC timestamp'i yerel tarih formatına çevir
const date = new Date(transaction.date); // UTC'den parse edilir
const formatted = date.toLocaleDateString("tr-TR"); // Türkçe format
```

### 4. API Endpoint'leri

Tüm API endpoint'leri UTC tabanlı çalışır:

- `/api/transactions?month=2024-01`: 2024 Ocak ayı (UTC sınırları)
- Tarih parametreleri ISO 8601 formatında (UTC)

### 5. Veritabanı Şeması

Supabase'de tüm tarih alanları `timestamptz` (timestamp with time zone) tipinde:

```sql
CREATE TABLE transactions (
  date timestamptz NOT NULL,
  -- ...
);
```

PostgreSQL, `timestamptz` değerlerini otomatik olarak UTC'ye normalize eder.

## Örnek Senaryolar

### Senaryo 1: Kullanıcı Türkiye'de (UTC+3)

1. Kullanıcı "2024-01-15" seçer (yerel tarih)
2. Sistem bunu "2024-01-15T00:00:00.000Z" (UTC) olarak kaydeder
3. Sorgu: `date >= "2024-01-01T00:00:00.000Z" AND date < "2024-02-01T00:00:00.000Z"`
4. Görüntüleme: UTC timestamp'i yerel zamana çevrilir

### Senaryo 2: Ay Bazlı Filtreleme

```typescript
// Kullanıcı "Ocak 2024" seçer
const month = getUtcMonthRangeStrict("2024-01");
// month.start = "2024-01-01T00:00:00.000Z"
// month.end = "2024-02-01T00:00:00.000Z"

// Veritabanı sorgusu
supabase
  .from("transactions")
  .gte("date", month.start.toISOString())
  .lt("date", month.end.toISOString());
```

## Best Practices

1. **Server-Side**: Her zaman UTC kullan
2. **Client-Side**: Görüntüleme için yerel zaman dilimine çevir
3. **API**: UTC timestamp'leri ISO 8601 formatında gönder/al
4. **Veritabanı**: `timestamptz` kullan, `timestamp` (timezone olmadan) kullanma

## İlgili Dosyalar

- `src/lib/month.ts`: UTC ay aralığı yardımcı fonksiyonları
- `src/app/api/transactions/route.ts`: API endpoint (UTC tabanlı sorgular)
- `src/app/(app)/transactions/page.tsx`: Transactions sayfası (UTC ay filtreleme)
- `docs/supabase.sql`: Veritabanı şeması (`timestamptz` kullanımı)

## Gelecek İyileştirmeler

- Kullanıcı tercihine göre zaman dilimi seçimi (opsiyonel)
- Daha detaylı tarih formatlama seçenekleri
- Zaman dilimi farkı gösterimi (örn: "2 saat önce")

