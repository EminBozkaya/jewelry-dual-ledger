# Kuyumcu Özel Cari Sistemi — Faz 3: Müşteri Yönetimi Ekranları

## Ön Koşul

- Faz 2 tamamlanmış: scaffold, auth, layout çalışıyor
- Login ile giriş yapılabiliyor, sidebar görünüyor
- API proxy aktif — backend'e erişim var

---

## Adım 1 — Genel DataTable Bileşeni

**`src/components/shared/DataTable.tsx`**

TanStack React Table kullanarak tam özellikli tablo bileşeni oluştur. Bu bileşen tüm sayfalarda ortak kullanılacak.

### Özellikler:

1. **Sıralama** — sütun başlığına tıklayarak asc/desc sıralama
2. **Filtreleme** — sütun bazında filtre (metin, seçim)
3. **Sayfalama** — alt kısımda sayfa navigasyonu, sayfa başına kayıt seçimi (10/20/50/100)
4. **Arama** — üst kısımda genel arama input'u (debounced, tüm sütunlarda arar)
5. **Responsive** — mobilde yatay scroll, önemli sütunlar sabit

### Props:

```ts
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchableColumns?: string[];  // Aranacak sütun id'leri
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  exportFilename?: string;       // Verilmezse export butonları gizlenir
}
```

### Tasarım Kuralları:

- Satır yüksekliği minimum 3rem — rahat okunabilir
- Hover durumunda satır arka planı hafif değişmeli
- Tıklanabilir satırlarda cursor pointer
- Sayfalama butonları büyük (mobilde de rahat tıklanabilir)
- Şu anki sayfa bilgisi gösterilmeli: "20 kayıttan 1-10 arası gösteriliyor"
- Boş durumda EmptyState bileşeni gösterilmeli

---

## Adım 2 — Export Butonları

**`src/components/shared/ExportButtons.tsx`**

```ts
interface ExportButtonsProps {
  data: any[];
  columns: { header: string; accessor: string; formatter?: (val: any) => string }[];
  filename: string;  // Uzantısız dosya adı
}
```

İki buton:
1. **Excel** — `xlsx` kütüphanesi ile .xlsx dosyası indir
2. **PDF** — `jspdf` + `jspdf-autotable` ile .pdf dosyası indir

PDF ayarları:
- Sayfa: A4 yatay
- Başlık: filename + tarih
- Tablo: Türkçe karakter desteği (font dikkat!)
- Alt bilgi: sayfa numarası

Her iki buton da ikon + etiketli, yan yana. Mobilde sadece ikon gösterilebilir.

---

## Adım 3 — SearchInput Bileşeni

**`src/components/shared/SearchInput.tsx`**

- Debounced arama (300ms)
- Sol tarafta arama ikonu (Search from lucide-react)
- Sağ tarafta temizle butonu (X ikonu, değer varsa görünür)
- Placeholder: prop olarak alır
- Büyük, rahat input

---

## Adım 4 — Müşteri Listesi Sayfası

**`src/pages/customers/CustomerListPage.tsx`**

### Üst Alan:
- PageHeader: "Müşteriler" başlığı
- Sağ tarafta "Yeni Müşteri" butonu (+ ikonu, yeşil/primary renk)

### Arama:
- Tam genişlik arama input'u: "Müşteri adı, telefon veya TC ile ara..."

### Tablo Sütunları:

| Sütun | Açıklama | Sıralanabilir | Mobilde |
|-------|----------|:---:|:---:|
| Fotoğraf | Avatar (varsa foto, yoksa baş harfler) | ✗ | Gizle |
| Ad Soyad | `fullName` — kalın yazı | ✓ | Göster |
| Telefon | `phone` | ✗ | Göster |
| Kayıt Tarihi | `createdAt` — formatDateShort | ✓ | Gizle |
| İşlemler | Detay butonu | ✗ | Göster |

### Davranış:
- Satıra tıklamak müşteri detayına gider (`/customers/:id`)
- Arama anlık filtreleme yapar (client-side, data zaten yüklü)
- Sayfalama: varsayılan 20 kayıt/sayfa
- Export butonları: Excel / PDF — "musteri-listesi" dosya adı
- Yükleniyor durumunda Skeleton göster
- Müşteri yoksa EmptyState: "Henüz müşteri eklenmemiş" + "Yeni Müşteri Ekle" butonu

---

## Adım 5 — Yeni Müşteri Oluşturma Dialogu

Müşteri listesinden "Yeni Müşteri" butonuna tıklandığında açılan **Dialog** (Shadcn Dialog).

### Form Alanları:

| Alan | Tip | Zorunlu | Validasyon |
|------|-----|:---:|------------|
| Ad | text | ✓ | Min 2 karakter |
| Soyad | text | ✓ | Min 2 karakter |
| Telefon | text | ✓ | Min 10 karakter |
| TC Kimlik No | text | ✗ | 11 rakam (girilmişse) |
| E-posta | email | ✗ | Geçerli e-posta formatı |
| Adres | textarea | ✗ | — |
| Notlar | textarea | ✗ | — |

### Tasarım:
- Dialog geniş olmalı (max-w-lg)
- react-hook-form + zod validasyon
- Inputlar büyük, label'lar net
- "Kaydet" ve "İptal" butonları büyük
- Başarılı kayıt sonrası toast mesajı + listeyi yenile + dialogu kapat
- Hata durumunda toast ile hata mesajı

---

## Adım 6 — Müşteri Detay Sayfası

**`src/pages/customers/CustomerDetailPage.tsx`**

Bu sayfa, seçilen müşterinin tüm bilgilerini, bakiyelerini ve hareket geçmişini gösterir. Sayfanın ana yapısı:

### 6.1 — Üst Bilgi Kartı

Kart içinde:
- Sol: Müşteri fotoğrafı (büyük avatar, 80x80). Yoksa baş harfler. Tıklanabilir → fotoğraf yükleme
- Orta: Ad Soyad (büyük başlık), Telefon, E-posta, TC Kimlik
- Sağ: Düzenle butonu (kalem ikonu) + Sil butonu (çöp kutusu, kırmızı, onay gerektirir)
- Alt: Adres ve Notlar (varsa)

Fotoğraf yükleme:
- Avatara tıklanınca dosya seçici açılır
- Kabul edilen formatlar: JPG, PNG
- Maks boyut: 5MB
- Yükleme sonrası avatar güncellenir

### 6.2 — Bakiye Kartları

Müşterinin bakiyeleri kart grid'i olarak gösterilir.

**ÖNEMLİ KURAL:** Sadece işlem görmüş (amount != 0) varlık tipleri gösterilir. Hiç işlem yapılmamış varlık tipleri gizlenir.

Her kart:
```
┌──────────────────────────┐
│  💰 Çeyrek Altın         │
│                          │
│     13,06 adet           │  ← Büyük, kalın yazı
│                          │
│  ▲ Alacak                │  ← Yeşil badge (pozitif ise)
└──────────────────────────┘
```

Renk kuralları:
- Pozitif bakiye → kart kenarlığı yeşil, "Alacak" badge'i yeşil
- Negatif bakiye → kart kenarlığı kırmızı, "Borç" badge'i kırmızı
- Sıfır → gösterme

Grid: masaüstünde 4 sütun, tablette 2, mobilde 1.

Bakiye yoksa (hiç işlem yapılmamışsa): "Bu müşteriye ait bakiye kaydı bulunmuyor."

### 6.3 — İşlem Butonları

Bakiye kartlarının altında, yan yana 3 büyük buton:

```
[ 💰 Yatır ]  [ 📤 Çek ]  [ 🔄 Dönüştür ]
```

- Her biri dialog açar (detaylar Faz 4'te)
- Mobilde butonlar alt alta (tam genişlik)
- Butonlar belirgin ve büyük

### 6.4 — Hareket Geçmişi (Tabs)

Shadcn Tabs ile iki sekme:

**Sekme 1: Tüm İşlemler**

Tablo sütunları:

| Sütun | Açıklama | Mobilde |
|-------|----------|:---:|
| Tarih | formatDate | Göster |
| İşlem Türü | Badge: Yatırma (yeşil), Çekme (kırmızı), Dönüşüm (mavi) | Göster |
| Varlık | AssetTypeName (dönüşümde "GBP → CEYREK" formatında) | Göster |
| Miktar | AmountDisplay ile renkli | Göster |
| Açıklama | description (kısa göster, hover'da tam metin) | Gizle |
| İşlemi Yapan | createdByFullName | Gizle |
| Durum | İptal edildiyse kırmızı "İptal" badge'i | Göster |

İptal edilen işlemler: satır arka planı soluk kırmızı, üzeri çizili metin.

Admin kullanıcılar her satırda "İptal Et" butonu görebilir (iptal edilmemiş işlemler için).
İptal etmek istediğinde ConfirmDialog açılır → sebep girişi zorunlu.

**Sekme 2: Dönüşüm Detayları**

Sadece Conversion tipindeki işlemler filtrelenmiş şekilde gösterilir. Ek sütunlar:
- Kaynak Varlık + Miktar
- TL Karşılığı
- Hedef Varlık + Miktar
- Kur bilgisi

### 6.5 — Müşteri Düzenleme

"Düzenle" butonuna tıklanınca Dialog açılır — yeni müşteri dialoguyla aynı yapı, ancak mevcut bilgiler dolu gelir.

### 6.6 — Müşteri Silme

"Sil" butonuna tıklanınca ConfirmDialog:
- Başlık: "Müşteri Silinsin mi?"
- Mesaj: "Bu müşteri silinecektir. İşlem geri alınamaz."
- Buton: "Sil" (kırmızı)
- Başarılı silme sonrası müşteri listesine yönlendir + toast

---

## Adım 7 — Gösterge Paneli (Dashboard)

**`src/pages/DashboardPage.tsx`**

Ana sayfa — giriş yapıldığında ilk görünen ekran.

### 7.1 — Özet Kartları (üst sıra)

4 kart, grid layout:

1. **Toplam Müşteri** — aktif müşteri sayısı, ikon: Users
2. **Bugünkü İşlem** — bugün yapılan işlem sayısı, ikon: Activity
3. **Toplam Alacak** — tüm müşterilerden toplam pozitif bakiye (TL karşılığı — şimdilik sadece TRY cinsinden topla), ikon: TrendingUp, yeşil
4. **Toplam Borç** — tüm müşterilerdeki negatif bakiye toplamı (TRY), ikon: TrendingDown, kırmızı

> Not: TL dışı varlıkların TL karşılığı Faz 2'de (otomatik kur) hesaplanacak. Şimdilik sadece TRY bakiyesi göster, diğer varlıklar "—" olabilir veya sadece adet gösterilebilir.

### 7.2 — Son İşlemler

Son 10 işlem listesi — tablo formatında. Satıra tıklamak ilgili müşteri detayına gider.

### 7.3 — Hızlı Erişim

Mobilde özellikle faydalı — büyük butonlar:
- "Yeni Müşteri Ekle"
- "Müşteri Ara"

---

## Adım 8 — Backend Eksikleri (Gerekirse)

Eğer dashboard için toplam müşteri sayısı, bugünkü işlem sayısı gibi veriler eksikse, backend'e şu endpoint'leri ekle:

**`Endpoints/DashboardEndpoints.cs`**

```csharp
// GET /api/dashboard/summary
// Dönüş:
// {
//   totalCustomers: int,
//   todayTransactionCount: int,
//   recentTransactions: TransactionResponse[10]
// }
```

Bu endpoint'i `Program.cs`'ye `app.MapDashboardEndpoints()` olarak ekle.

Eğer bu endpoint yoksa, frontend'de mevcut endpoint'lerle geçici çözüm üret:
- Müşteri sayısı: `GET /api/customers` sonucunun length'i
- Son işlemler: Tüm müşterilerin işlemlerini çekemeyeceğimiz için, bir `/api/transactions/recent` endpoint'i gerekebilir

Backend'e eklenecek endpoint:

```csharp
// GET /api/transactions/recent?count=10
// Tüm müşterilerin son N işlemini döner
```

---

## Adım 9 — Doğrulama

1. Müşteri listesi yüklenmeli — arama, sıralama, sayfalama çalışmalı
2. Yeni müşteri oluşturulabilmeli — form validasyonu çalışmalı
3. Müşteri detay sayfası açılmalı — bilgi kartı, bakiyeler, hareket geçmişi
4. Müşteri düzenlenebilmeli
5. Müşteri silinebilmeli (soft delete)
6. Fotoğraf yüklenebilmeli
7. Excel ve PDF export çalışmalı
8. Dashboard özet verileri gösterilmeli
9. Tüm ekranlar mobilde düzgün görünmeli
10. Alacak/borç renklendirmesi doğru çalışmalı

---

## Sonraki Adım → Faz 4

Faz 4'te işlem formları (yatırma, çekme, dönüşüm) ve işlem detay ekranları kodlanacak.
