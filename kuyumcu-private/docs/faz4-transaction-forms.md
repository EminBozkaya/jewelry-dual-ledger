# Kuyumcu Özel Cari Sistemi — Faz 4: İşlem Formları

## Ön Koşul

- Faz 3 tamamlanmış: müşteri listesi, detay, CRUD çalışıyor
- Müşteri detay sayfasında "Yatır", "Çek", "Dönüştür" butonları var (henüz dialogları bağlanmamış)

---

## Adım 1 — Varlık Birimi Seçici Bileşeni

**`src/components/shared/AssetTypeSelect.tsx`**

Tüm işlem formlarında ortak kullanılacak varlık birimi seçici.

### Özellikler:
- Shadcn Select veya Combobox (Popover + Command) kullan
- Varlık birimleri gruplu gösterilmeli:
  - **Para Birimleri:** TRY, USD, EUR, GBP
  - **Altın (Adet):** Çeyrek, Yarım, Tam, Ata, Gremse, Beşli
  - **Altın (Gram):** 22 Ayar, 24 Ayar
  - **Diğer:** Gümüş
- Her öğede: Kod + İsim (örn: "CEYREK — Çeyrek Altın")
- Arama ile filtrelenebilmeli
- Büyük, rahat tıklanabilir öğeler

### Props:
```ts
interface AssetTypeSelectProps {
  value: string;         // seçili assetTypeId
  onChange: (id: string) => void;
  exclude?: string[];    // hariç tutulacak id'ler (dönüşümde kaynak = hedef olmasın)
  label?: string;
  error?: string;
}
```

---

## Adım 2 — Yatırma (Deposit) Dialogu

Müşteri detay sayfasında "Yatır" butonuna tıklanınca açılan Dialog.

### Form Alanları:

| Alan | Bileşen | Zorunlu | Validasyon |
|------|---------|:---:|------------|
| Varlık Birimi | AssetTypeSelect | ✓ | Seçilmeli |
| Miktar | Sayısal input | ✓ | > 0 |
| Açıklama | textarea | ✗ | — |

### Tasarım:
- Dialog başlığı: "Yatırma İşlemi — {Müşteri Adı}"
- Miktar inputu büyük, ortada, belirgin (odak buraya)
- Seçilen varlık biriminin birim tipine göre miktar formatı:
  - Currency → "0,00" placeholder
  - Piece → "0" veya "0,00" (ondalıklı adet mümkün)
  - Gram → "0,000" placeholder
- "Yatır" butonu yeşil, büyük
- İşlem sonrası:
  1. Toast: "500 GBP yatırma işlemi başarılı"
  2. Bakiye kartlarını yenile
  3. Hareket geçmişini yenile
  4. Dialogu kapat

---

## Adım 3 — Çekme (Withdrawal) Dialogu

"Çek" butonuna tıklanınca açılan Dialog. Yatırma ile aynı yapıda, farklılıklar:

### Ek Özellikler:
- Seçilen varlık biriminde mevcut bakiye gösterilmeli: "Mevcut: 13,06 adet"
- Miktar bakiyeyi aşamaz — aşarsa buton disabled + uyarı mesajı
- "Tamamını Çek" butonu — mevcut bakiyeyi otomatik dolduran kısayol
- "Çek" butonu kırmızı
- Bakiyesi olmayan varlık birimleri seçicide gizlenebilir veya disabled olabilir

### Hata Durumu:
- Backend'den "Yetersiz bakiye" hatası gelirse toast ile göster
- Ağ hatası → genel hata mesajı

---

## Adım 4 — Dönüşüm (Conversion) Dialogu

En karmaşık form. "Dönüştür" butonuna tıklanınca açılan Dialog.

### Form Alanları:

```
┌─────────────────────────────────────────────────┐
│  Dönüşüm İşlemi — Ahmet Yılmaz                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  KAYNAK (Verilecek)                             │
│  ┌────────────────┐  ┌──────────────────────┐  │
│  │ Varlık Birimi  │  │ Miktar               │  │
│  │ [GBP ▼]        │  │ [500]                │  │
│  └────────────────┘  └──────────────────────┘  │
│  Mevcut bakiye: 500,00 GBP                     │
│                                                 │
│  TL Kuru: [42,30] TL                           │
│  TL Karşılığı: 21.150,00 TL                    │  ← Otomatik hesaplama
│                                                 │
│  ─────────── ↕ ───────────                      │
│                                                 │
│  HEDEF (Alınacak)                               │
│  ┌────────────────┐                             │
│  │ Varlık Birimi  │                             │
│  │ [CEYREK ▼]     │                             │
│  └────────────────┘                             │
│  TL Kuru: [1.620,00] TL                        │
│                                                 │
│  Hesaplanan Miktar: 13,06 adet                  │  ← Otomatik: TL / kur
│                                                 │
│  Kur Notu: [________________]                   │
│  Açıklama: [________________]                   │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │          🔄 Dönüşümü Uygula            │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Hesaplama Mantığı:
```
TL Karşılığı = Kaynak Miktar × Kaynak TL Kuru
Hedef Miktar = TL Karşılığı ÷ Hedef TL Kuru
```

Kullanıcı kaynak miktar, kaynak kur veya hedef kur değiştirdiğinde anlık hesaplama yapılmalı (controlled inputs + useEffect veya computed).

### Validasyon:
- Kaynak ve hedef varlık birimi aynı olamaz
- Kaynak miktar > 0 ve bakiyeyi aşamaz
- Her iki kur > 0
- Hedef miktar > 0 (hesaplama sonucu)

### Kaynak Varlık Seçiminde:
- Müşterinin bakiyesi olan varlıklar önce/vurgulanmış gösterilmeli
- Bakiyesi olmayanlar disabled veya ayrı grup

---

## Adım 5 — İşlem Onay Diyalogu

Tüm işlemler (yatır, çek, dönüştür) için son adım olarak bir onay ekranı göster.
Formu doldurduktan sonra "Yatır" / "Çek" / "Dönüştür" butonuna basınca:

1. Önce form validasyonunu yap
2. Geçerliyse onay dialogu göster:
   ```
   ┌───────────────────────────────────┐
   │  ⚠️ İşlemi Onaylıyor musunuz?    │
   │                                   │
   │  İşlem: Yatırma                   │
   │  Müşteri: Ahmet Yılmaz           │
   │  Varlık: Sterlin (GBP)           │
   │  Miktar: 500,00                   │
   │                                   │
   │  [İptal]        [✓ Onayla]       │
   └───────────────────────────────────┘
   ```
3. "Onayla" butonuna basınca API çağrısı yap
4. Başarılıysa toast + verileri yenile + dialogları kapat

Bu özellikle yaşlı kullanıcılar için önemli — yanlışlıkla büyük tutarlı işlem yapılmasını önler.

---

## Adım 6 — İşlem İptal (Admin)

Admin kullanıcılar müşteri detay sayfasındaki hareket tablosunda işlem iptal edebilir.

### Akış:
1. Satırdaki "İptal Et" butonuna tıkla
2. Dialog açılır:
   - İşlem özeti gösterilir (tür, miktar, varlık)
   - "İptal Sebebi" textarea'sı — zorunlu
   - "İşlemi İptal Et" butonu — kırmızı
3. API çağrısı: `POST /api/transactions/{id}/cancel`
4. Başarılıysa toast + verileri yenile

İptal edilen işlemler:
- Tabloda satır arka planı soluk kırmızı
- Miktar üzeri çizili
- "İptal Edildi" badge'i kırmızı
- Hover'da iptal sebebi gösterilir (tooltip)

---

## Adım 7 — İşlem Geçmişi İyileştirmeleri

Müşteri detay sayfasındaki işlem tablosuna ek filtreler:

### Filtre Alanları (tablo üstünde):
1. **İşlem Türü** — Tümü / Yatırma / Çekme / Dönüşüm (select)
2. **Varlık Birimi** — Tümü / [varlık listesi] (select)
3. **Tarih Aralığı** — Başlangıç-Bitiş tarih seçici (Shadcn Calendar/Popover)
4. **Durum** — Tümü / Aktif / İptal Edilmiş (select)

Filtreler client-side uygulanabilir (tüm data yüklü olduğu sürece).

---

## Adım 8 — Doğrulama

1. Yatırma işlemi yapılabilmeli — bakiye artmalı, hareket eklenmeli
2. Çekme işlemi yapılabilmeli — bakiye azalmalı, yetersiz bakiye uyarı vermeli
3. Dönüşüm işlemi yapılabilmeli — kaynak azalmalı, hedef artmalı, hesaplama doğru
4. İşlem onay dialogu çalışmalı
5. Admin işlem iptal edebilmeli — bakiyeler geri alınmalı
6. İptal edilen işlemler tabloda belirgin şekilde işaretli
7. Filtreler çalışmalı
8. Tüm formlar mobilde rahat kullanılabilmeli

---

## Sonraki Adım → Faz 5

Faz 5'te raporlama ekranları, kullanıcı yönetimi ve genel portföy dashboard'u kodlanacak.
