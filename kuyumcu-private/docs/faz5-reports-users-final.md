# Kuyumcu Özel Cari Sistemi — Faz 5: Raporlama, Kullanıcı Yönetimi ve Son Dokunuşlar

## Ön Koşul

- Faz 4 tamamlanmış: tüm işlem formları çalışıyor
- Müşteri CRUD, bakiye takibi, işlem geçmişi fonksiyonel

---

## BÖLÜM A — Backend Ek Endpoint'leri

Raporlama ekranları için mevcut backend endpoint'leri yetersiz. Aşağıdaki endpoint'leri ekle.

### Adım 1 — Report Endpoint'leri

**`src/KuyumcuPrivate.API/Endpoints/ReportEndpoints.cs`**

```csharp
// Bu endpoint'leri oluştur ve Program.cs'ye app.MapReportEndpoints() ekle

// GET /api/reports/portfolio
// Tüm müşterilerin bakiyelerini varlık tipine göre gruplu döner.
// Dönüş:
// [
//   {
//     assetTypeId, assetTypeCode, assetTypeName, unitType,
//     totalPositive: decimal,    // tüm müşterilerin pozitif bakiye toplamı
//     totalNegative: decimal,    // tüm müşterilerin negatif bakiye toplamı (abs değer)
//     netAmount: decimal,        // totalPositive - totalNegative
//     customerCount: int         // bu varlıkta bakiyesi olan müşteri sayısı
//   }
// ]
// Sadece herhangi bir müşteride bakiyesi olan varlık tipleri döner.
// Sıralama: AssetType.SortOrder

// GET /api/reports/daily?date=2025-01-15
// Belirtilen günün işlem özetini döner.
// Dönüş:
// {
//   date: string,
//   totalTransactions: int,
//   deposits: [{ assetTypeCode, assetTypeName, totalAmount, count }],
//   withdrawals: [{ assetTypeCode, assetTypeName, totalAmount, count }],
//   conversions: [{ fromAssetCode, toAssetCode, totalFromAmount, totalToAmount, count }],
//   transactions: TransactionResponse[]  // o günün tüm işlemleri
// }

// GET /api/reports/customer-statement/{customerId}?from=2025-01-01&to=2025-01-31
// Müşteri ekstresi — tarih aralığında tüm işlemler + açılış/kapanış bakiyeleri.
// Dönüş:
// {
//   customer: CustomerResponse,
//   period: { from, to },
//   openingBalances: BalanceResponse[],   // dönem başı bakiyeleri
//   closingBalances: BalanceResponse[],   // dönem sonu bakiyeleri
//   transactions: TransactionResponse[]
// }

// GET /api/reports/asset-detail/{assetTypeId}
// Belirli bir varlık biriminde tüm müşterilerin bakiyelerini döner.
// Dönüş:
// [
//   {
//     customerId, customerFullName,
//     amount: decimal,   // pozitif = alacak, negatif = borç
//   }
// ]
// Sıralama: amount DESC (en çok alacaklı en üstte)
```

### Adım 2 — User Management Endpoint'leri

**`src/KuyumcuPrivate.API/Endpoints/UserEndpoints.cs`**

```csharp
// Bu endpoint'leri oluştur ve Program.cs'ye app.MapUserEndpoints() ekle
// Tüm endpoint'ler AdminOnly policy ile korunmalı

// GET /api/users
// Tüm kullanıcıları döner (şifre hariç)

// POST /api/users
// Yeni kullanıcı oluştur
// Body: { fullName, username, password, role }
// Şifreyi BCrypt ile hashle

// PUT /api/users/{id}
// Kullanıcı bilgilerini güncelle (şifre hariç)
// Body: { fullName, username, role, isActive }

// PUT /api/users/{id}/password
// Kullanıcı şifresini değiştir
// Body: { newPassword }

// PUT /api/users/{id}/toggle-active
// Kullanıcıyı aktif/pasif yap
```

İlgili servis interface ve implementasyonlarını Application ve Infrastructure katmanlarına ekle. DI kaydını güncelle.

### Adım 3 — Dashboard Endpoint'i

**`src/KuyumcuPrivate.API/Endpoints/DashboardEndpoints.cs`**

```csharp
// GET /api/dashboard/summary
// Dönüş:
// {
//   totalCustomers: int,
//   totalActiveUsers: int,
//   todayTransactionCount: int,
//   recentTransactions: TransactionResponse[10]  // son 10 işlem (tüm müşteriler)
// }
```

---

## BÖLÜM B — Raporlama Ekranları

### Adım 4 — Genel Portföy Raporu

**`src/pages/reports/PortfolioReportPage.tsx`**

Bu sayfa işletmenin tüm müşterilerle olan genel durumunu varlık bazında gösterir. Kuyumcu patronunun "genel olarak ne durumdayız" sorusuna cevap verir.

### 4.1 — Özet Kartları

Her varlık tipi için bir kart. Grid layout: masaüstünde 4 sütun, tablette 2, mobilde 1.

```
┌──────────────────────────────────┐
│  🪙 Çeyrek Altın (CEYREK)       │
│                                  │
│  Toplam Alacak:    156,30 adet  │  ← Yeşil
│  Toplam Borç:       12,50 adet  │  ← Kırmızı
│  ─────────────────────────────  │
│  Net Durum:        143,80 adet  │  ← Yeşil (net pozitif)
│                                  │
│  Müşteri Sayısı: 24             │
│  [Detay Gör →]                  │
└──────────────────────────────────┘
```

Renk kuralları:
- Net pozitif → kart üst kenarlık yeşil
- Net negatif → kart üst kenarlık kırmızı

"Detay Gör" tıklandığında o varlık biriminin müşteri dağılımı tablosu açılır (aşağıda).

### 4.2 — Varlık Detay Tablosu

"Detay Gör" butonuna veya bir varlık kartına tıklanınca sayfanın alt kısmında veya dialog'da açılır.

`GET /api/reports/asset-detail/{assetTypeId}` endpoint'ini kullanır.

Tablo sütunları:

| Sütun | Açıklama |
|-------|----------|
| Müşteri | Ad Soyad — tıklanabilir, müşteri detayına gider |
| Bakiye | AmountDisplay — yeşil/kırmızı |
| Durum | "Alacak" (yeşil badge) veya "Borç" (kırmızı badge) |

Export: Excel / PDF — "ceyrek-altin-dagilimi" gibi dosya adı.

### 4.3 — Genel Tablo Görünümü

Kartların altında, aynı verilerin tablo formatında da gösterilmesi — export için kullanışlı.

Tablo: Varlık Kodu, Varlık Adı, Birim Tipi, Toplam Alacak, Toplam Borç, Net Durum, Müşteri Sayısı.
Export: Excel / PDF — "genel-portfoy-raporu"

---

### Adım 5 — Günlük Rapor

**`src/pages/reports/DailyReportPage.tsx`**

Belirli bir günde yapılan tüm işlemlerin özeti.

### 5.1 — Tarih Seçici

Sayfanın üstünde tarih seçici (Shadcn Calendar + Popover). Varsayılan: bugün.
"Önceki Gün" ve "Sonraki Gün" ok butonları.

### 5.2 — Günlük Özet Kartları

3 kart yan yana:

1. **Yatırma İşlemleri** — toplam adet, varlık bazında miktar listesi (yeşil tema)
2. **Çekme İşlemleri** — toplam adet, varlık bazında miktar listesi (kırmızı tema)
3. **Dönüşüm İşlemleri** — toplam adet, "X → Y" formatında liste (mavi tema)

### 5.3 — Günlük İşlem Tablosu

O günün tüm işlemleri — tam DataTable ile (sıralama, arama, sayfalama, export).

Sütunlar:
| Saat | Müşteri | İşlem Türü | Varlık | Miktar | Açıklama | İşlemi Yapan | Durum |

Export: "gunluk-rapor-2025-01-15"

---

### Adım 6 — Müşteri Ekstre Raporu

**`src/pages/reports/CustomerStatementPage.tsx`**

Belirli bir müşterinin belirli tarih aralığındaki tüm hareketleri ve bakiye değişimleri.

### 6.1 — Filtreler

- Müşteri seçici: Combobox (arama destekli müşteri listesi)
- Tarih aralığı: Başlangıç — Bitiş (varsayılan: bu ay)
- "Rapor Oluştur" butonu

### 6.2 — Ekstre Görünümü

```
┌──────────────────────────────────────────────────┐
│  MÜŞTERI EKSTRESİ                                │
│  Ahmet Yılmaz | 01.01.2025 - 31.01.2025         │
├──────────────────────────────────────────────────┤
│                                                  │
│  AÇILIŞ BAKİYELERİ (01.01.2025)                 │
│  Çeyrek Altın:  10,00 adet (Alacak)             │
│  GBP:          500,00 (Alacak)                  │
│                                                  │
│  ────── İŞLEM GEÇMİŞİ ──────                   │
│  [Tablo: Tarih, Tür, Varlık, Miktar, Açıklama]  │
│                                                  │
│  KAPANIŞ BAKİYELERİ (31.01.2025)                │
│  Çeyrek Altın:  23,06 adet (Alacak)             │
│  GBP:            0,00 (—)                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

Export: PDF ve Excel — "ekstre-ahmet-yilmaz-2025-01"

PDF'de özellikle güzel formatlanmalı — kuyumcu müşteriye gösterebilecek düzeyde.

---

## BÖLÜM C — Kullanıcı Yönetimi

### Adım 7 — Kullanıcı Yönetimi Sayfası

**`src/pages/admin/UserManagementPage.tsx`**

Sadece Admin rolündeki kullanıcılar erişebilir.

### 7.1 — Kullanıcı Listesi

DataTable ile:

| Sütun | Açıklama |
|-------|----------|
| Ad Soyad | fullName |
| Kullanıcı Adı | username |
| Rol | Badge: Admin (mor), Personel (mavi) |
| Durum | Badge: Aktif (yeşil), Pasif (gri) |
| İşlemler | Düzenle, Şifre Değiştir, Aktif/Pasif toggle |

### 7.2 — Yeni Kullanıcı Dialogu

Form:
- Ad Soyad (zorunlu)
- Kullanıcı Adı (zorunlu, unique)
- Şifre (zorunlu, min 6 karakter)
- Şifre Tekrar (eşleşmeli)
- Rol: Admin / Personel (radio group)

### 7.3 — Kullanıcı Düzenleme Dialogu

Mevcut bilgileri düzenleme — şifre ayrı.

### 7.4 — Şifre Değiştirme Dialogu

- Yeni Şifre (min 6 karakter)
- Yeni Şifre Tekrar
- Admin başka kullanıcının şifresini değiştirebilir

### 7.5 — Aktif/Pasif Toggle

Kullanıcıyı pasif yapmak onay gerektirir.
Pasif kullanıcılar giriş yapamaz.
Admin kendini pasif yapamaz.

---

## BÖLÜM D — Dashboard İyileştirmeleri

### Adım 8 — Dashboard Güncelleme

Faz 3'te oluşturulan DashboardPage'i güncelle:

### 8.1 — Üst Özet Kartları (güncellendi)

4 kart:
1. **Toplam Müşteri** — sayı + Users ikonu
2. **Aktif Kullanıcı** — sayı + UserCheck ikonu
3. **Bugünkü İşlem** — sayı + Activity ikonu
4. **Son 7 Gün İşlem** — (opsiyonel, varsa)

### 8.2 — Hızlı Varlık Durumu

Portföy raporunun mini versiyonu — en çok hareket gören 5 varlık tipinin net durumu kartlarda.
Her kart renk kodlu (yeşil/kırmızı).

### 8.3 — Son İşlemler Tablosu

Son 10 işlem — kompakt tablo. Satıra tıklamak müşteri detayına gider.

### 8.4 — Hızlı Erişim Butonları

Büyük butonlar:
- "Yeni Müşteri"
- "Müşteri Ara"
- "Günlük Rapor"

Mobilde 2x2 grid.

---

## BÖLÜM E — Son Dokunuşlar

### Adım 9 — Dark Mode Toggle

- AppHeader'a güneş/ay ikonu ile dark mode toggle ekle
- Tercih localStorage'da saklanmalı
- Shadcn dark mode desteği zaten CSS variables ile sağlanıyor

### Adım 10 — Global Hata Yönetimi

- API hataları için genel toast mesajları
- 500 hatalarında: "Sunucu hatası. Lütfen tekrar deneyin."
- Ağ hatası: "Bağlantı hatası. İnternet bağlantınızı kontrol edin."
- 403 hatası: "Bu işlem için yetkiniz yok."

### Adım 11 — Loading States

Tüm sayfalarda veri yüklenirken:
- Skeleton bileşenleri (Shadcn Skeleton)
- Butonlarda loading spinner (işlem devam ederken)
- Çift tıklama koruması (buton işlem bitene kadar disabled)

### Adım 12 — Boş Durumlar

Her listeleme/tablo ekranında veri yokken:
- Uygun ikon + mesaj + aksiyon butonu
- Örnekler:
  - Müşteri yok → "Henüz müşteri eklenmemiş" + "İlk Müşterinizi Ekleyin"
  - İşlem yok → "Bu müşteriye ait işlem bulunmuyor" + "İlk İşlemi Yapın"
  - Rapor veri yok → "Seçilen tarih aralığında işlem bulunmuyor"

### Adım 13 — PWA Hazırlığı (Opsiyonel)

- `public/manifest.json` oluştur
- favicon ve app ikonları ekle (basit altın/kuyumcu temalı)
- Service worker ekleme şimdilik YAPMA (offline destek Faz 2'de)
- Sadece manifest olsun ki tablet ana ekranına eklenebilsin

---

## Adım 14 — Doğrulama

### Raporlama:
1. Genel Portföy sayfası tüm varlık tiplerinin toplamlarını göstermeli
2. Varlık detayında müşteri bazında dağılım görünmeli
3. Günlük rapor tarih seçici ile çalışmalı
4. Müşteri ekstresi doğru tarih aralığında doğru verileri göstermeli
5. Tüm raporlar Excel ve PDF olarak export edilebilmeli

### Kullanıcı Yönetimi:
6. Yeni kullanıcı oluşturulabilmeli
7. Kullanıcı düzenlenebilmeli
8. Şifre değiştirilebilmeli
9. Kullanıcı pasif yapılabilmeli — pasif kullanıcı giriş yapamamalı
10. Sadece Admin rolü bu sayfaya erişebilmeli

### Genel:
11. Dark mode çalışmalı
12. Tüm sayfalar mobilde responsive
13. Loading states tüm sayfalarda aktif
14. Export dosyaları doğru formatta indirilmeli

---

## Proje Tamamlandı!

Bu faz tamamlandığında Faz 1'in tüm frontend ve backend bileşenleri fonksiyonel olacak:

- ✅ JWT Authentication + Role-based erişim
- ✅ Müşteri CRUD + fotoğraf
- ✅ Yatırma / Çekme / Dönüşüm işlemleri
- ✅ Bakiye takibi (renk kodlu)
- ✅ İşlem geçmişi + filtreleme
- ✅ İşlem iptali (Admin)
- ✅ Genel Portföy Raporu
- ✅ Günlük Rapor
- ✅ Müşteri Ekstresi
- ✅ Kullanıcı Yönetimi
- ✅ Excel / PDF export
- ✅ Tam responsive tasarım
- ✅ Dark mode
- ✅ Türkçe arayüz

### Faz 2 İçin Planlanan (ayrı direktif):
- Otomatik kur çekme (API entegrasyonu)
- TL karşılığı otomatik hesaplama (portföy raporunda)
- Offline destek (PWA)
- Bildirimler
- Yedekleme / restore
