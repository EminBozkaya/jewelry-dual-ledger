<div align="center">

# 💎 Jewelry Dual Ledger

<br />

### 🌐 Select Language / Dil Seçin

<a href="README.md"><img src="https://img.shields.io/badge/🇹🇷_Türkçe-CC0000?style=for-the-badge" alt="Türkçe" /></a>
<a href="README.en.md"><img src="https://img.shields.io/badge/🇬🇧_English-003399?style=for-the-badge" alt="English" /></a>

---

**Kuyumcu İşletmeleri İçin Çift Defter Yönetim Sistemi**

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📋 Proje Hakkında

**Jewelry Dual Ledger**, kuyumcu işletmeleri için tasarlanmış, profesyonel düzeyde bir **çift defterli yönetim sistemidir**. Projenin adındaki "Dual" (çift), kuyumcu işletmelerinin ihtiyaç duyduğu iki temel yönetim alanını ifade eder:

<table>
<tr>
<td width="50%" valign="top">

### 📗 Modül 1 — Özel Cari Defter&ensp;✅
**Müşteri hesap takibi.** Müşterilerin altın (gram ve adet), döviz ve kıymetli metal bakiyelerini kayıt altına alma, yatırma/çekme/dönüşüm işlemleri yapma ve detaylı raporlar üretme.

> **Durum:** Tamamlandı ve aktif kullanımda.

</td>
<td width="50%" valign="top">

### 📘 Modül 2 — Günlük İşlem Defteri&ensp;🚧
**Mağaza operasyonları.** Kuyumcu işletmesinin gün içinde gerçekleştirdiği satış, alış ve çevirim işlemlerinin anlık takibi; kasa yönetimi, stok hareketleri ve gün sonu mutabakatı.

> **Durum:** Yakında geliştirmeye başlanacak.

</td>
</tr>
</table>

Bu iki modül birlikte, bir kuyumcu işletmesinin hem **müşteri ilişkileri** hem de **günlük operasyonları** için eksiksiz bir dijital yönetim platformu oluşturacaktır. Şu an bu repo'da **Modül 1 (Özel Cari Defter)** tam olarak işlevseldir.

### 🎯 Neden Bu Proje?

Türkiye'deki kuyumcu sektörü hâlâ büyük ölçüde kağıt defter ve basit Excel tablolarıyla çalışmaktadır. Bu proje, sektöre özgü ihtiyaçları karşılayan modern bir çözüm sunar:

- 📒 **Dijital Cari Defter** — Kağıt defterden dijitale geçiş
- 🪙 **Çoklu Varlık Desteği** — TL, döviz, gram altın ve adet altın (Cumhuriyet, Reşat serileri)
- 📊 **Anlık Raporlama** — Portföy, günlük rapor ve müşteri ekstresi
- 🔄 **Dönüşüm İşlemleri** — Varlıklar arası dönüşüm (altın↔TL, USD↔TL vb.)
- 📱 **Responsive Tasarım** — Masaüstü, tablet ve mobil cihazlarda sorunsuz çalışma

---

## ✨ Özellikler

### 👥 Müşteri Yönetimi
- Müşteri ekleme, düzenleme ve silme (soft delete)
- Silinmiş müşterileri geri yükleme
- Müşteri fotoğrafı yükleme ve tam ekran görüntüleme
- Müşteri tipi sınıflandırma (Özel Müşteri, Kuyumcu, Tedarikçi)
- TC Kimlik ve telefon numarası doğrulama (tekrar engelleme)
- Gelişmiş arama, sıralama ve sayfalama

### 💰 İşlem Yönetimi
- **Yatırma (Deposit)** — Müşteriye varlık yatırma
- **Çekme (Withdrawal)** — Müşteriden varlık çekme (bakiye kontrollü)
- **Dönüşüm (Conversion)** — Varlıklar arası dönüşüm (anlık kur desteği)
- İşlem iptali (sadece Admin, sebep zorunlu)
- Detaylı işlem geçmişi ve filtreleme

### 📊 Raporlama
- **Genel Portföy Raporu** — Tüm müşterilerin toplam bakiye özeti
- **Mağaza Bakiye Hesaplama** — İşletme portföy özeti
- **Günlük Rapor** — Gün bazlı işlem özeti
- **Müşteri Ekstresi** — Tarih aralıklı detaylı ekstre
- **Excel ve PDF Export** — Tüm raporlarda dışa aktarım
- **Portföy Yazdırma** — Fiş formatında yazdırma desteği

### 💹 Anlık Kur Bilgisi
- TCMB EVDS API entegrasyonu (döviz kurları)
- TCMB XML feed (yedek döviz kaynağı)
- Kıymetli metal fiyatları (altın, gümüş)
- TL karşılığı hesaplama

### 🔐 Güvenlik ve Kimlik Doğrulama
- JWT tabanlı kimlik doğrulama
- Rol bazlı yetkilendirme (Admin / Staff)
- Kullanıcı yönetimi (oluşturma, düzenleme, şifre değiştirme, aktif/pasif)
- Antiforgery token koruması

### 🎨 Arayüz Özellikleri
- 🌗 Dark / Light mod desteği
- 🌐 Çoklu dil desteği (Türkçe / İngilizce)
- 📱 Tam responsive tasarım
- ♿ Büyük font boyutları (yaşlı kullanıcılar için min 17px)
- 💚 Renk kodlaması: Yeşil = Alacak, Kırmızı = Borç

---

## 🏗️ Mimari

Proje, **Clean Architecture** prensiplerine uygun olarak katmanlı mimaride tasarlanmıştır:

```
jewelry-dual-ledger/
└── kuyumcu-private/                    # Özel Cari Modülü
    ├── backend/                        # .NET 10 Minimal API
    │   └── src/
    │       ├── KuyumcuPrivate.Domain/          # Entity, Enum (İş Kuralları)
    │       ├── KuyumcuPrivate.Application/     # DTO, Interface (Uygulama Katmanı)
    │       ├── KuyumcuPrivate.Infrastructure/  # DbContext, Services (Altyapı)
    │       └── KuyumcuPrivate.API/             # Endpoints, Program.cs (Sunum)
    ├── frontend/                       # React 19 SPA
    │   └── src/
    │       ├── api/            # Axios HTTP servisleri
    │       ├── components/     # UI bileşenleri (layout, shared, ui)
    │       ├── contexts/       # React Context (Auth)
    │       ├── hooks/          # Custom hooks
    │       ├── i18n/           # Çoklu dil dosyaları (TR/EN)
    │       ├── lib/            # Yardımcı fonksiyonlar
    │       ├── pages/          # Sayfa bileşenleri
    │       └── types/          # TypeScript tipleri
    └── docker-compose.yml      # PostgreSQL + API orkestrasyon
```

---

## 🛠️ Teknoloji Yığını

### Backend
| Teknoloji | Sürüm | Açıklama |
|-----------|-------|----------|
| .NET | 10.0 | Runtime ve SDK |
| ASP.NET Core Minimal API | 10.0 | RESTful API |
| Entity Framework Core | 10.0 | ORM (Code-First) |
| PostgreSQL | 16 (Alpine) | İlişkisel veritabanı |
| Npgsql | — | PostgreSQL .NET driver |
| BCrypt.Net | — | Şifre hashleme |
| JWT Bearer | — | Token tabanlı kimlik doğrulama |
| Swashbuckle | 10.x | Swagger / OpenAPI |

### Frontend
| Teknoloji | Sürüm | Açıklama |
|-----------|-------|----------|
| React | 19.x | UI kütüphanesi |
| TypeScript | 6.0 | Tip güvenliği |
| Vite | 8.x | Build aracı ve dev server |
| Tailwind CSS | 4.x | Utility-first CSS |
| Shadcn/ui | 4.x | Radix tabanlı UI bileşenleri |
| React Router | 7.x | Client-side routing |
| React Hook Form + Zod | — | Form yönetimi ve doğrulama |
| i18next | 26.x | Çoklu dil desteği |
| Axios | 1.15 | HTTP istemcisi |
| Lucide React | — | İkon kütüphanesi |
| jsPDF + xlsx | — | PDF ve Excel export |
| date-fns | 4.x | Tarih işlemleri |

### Altyapı
| Teknoloji | Açıklama |
|-----------|----------|
| Docker & Docker Compose | Konteyner orkestrasyon |
| PWA Manifest | Progressive Web App desteği |

---

## 🚀 Kurulum

### Ön Gereksinimler

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/) ve npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL için)
- Git

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/EminBozkaya/jewelry-dual-ledger.git
cd jewelry-dual-ledger
```

### 2. Veritabanını Başlatın

```bash
cd kuyumcu-private
docker compose up postgres -d
```

Bu komut, PostgreSQL 16'yı Docker üzerinde `15432` portunda başlatır.

### 3. Backend Yapılandırması

Hassas bilgileri saklamak için yerel yapılandırma dosyası oluşturun:

```bash
cd kuyumcu-private/backend/src/KuyumcuPrivate.API
```

`appsettings.Local.json` dosyası oluşturun (bu dosya `.gitignore`'da tanımlıdır ve repo'ya gönderilmez):

```json
{
  "Jwt": {
    "Key": "BURAYA_EN_AZ_32_KARAKTER_GIZLI_ANAHTAR_YAZIN"
  },
  "Evds": {
    "ApiKey": "TCMB_EVDS_API_ANAHTARINIZ"
  }
}
```

> 💡 **EVDS API Key:** Anlık döviz kuru çekmek için [TCMB EVDS](https://evds2.tcmb.gov.tr/) portalından ücretsiz API anahtarı alabilirsiniz. API key olmadan uygulama çalışmaya devam eder, sadece anlık kur bilgisi çekilemez.

### 4. Backend'i Çalıştırın

```bash
cd kuyumcu-private/backend
dotnet run --project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj
```

API, `http://localhost:5000` adresinde çalışmaya başlar. İlk çalıştırmada veritabanı migration'ları otomatik uygulanır.

### 5. Frontend'i Çalıştırın

Yeni bir terminal açın:

```bash
cd kuyumcu-private/frontend
npm install
npm run dev
```

Frontend, `http://localhost:3000` adresinde açılır.

### 6. Giriş Yapın

| Alan | Değer |
|------|-------|
| Kullanıcı Adı | `admin` |
| Şifre | `admin123` |

> ⚠️ **Önemli:** İlk girişten sonra Admin panelinden şifrenizi mutlaka değiştirin.

---

## 🐳 Docker ile Tam Kurulum

Tüm sistemi Docker ile ayağa kaldırmak için:

```bash
cd kuyumcu-private
docker compose up -d
```

Bu komut hem PostgreSQL hem de API'yi başlatır:
- **PostgreSQL:** `localhost:15432`
- **API:** `localhost:5000`

---

## 📄 API Dökümantasyonu

Backend çalışırken Swagger UI'a erişebilirsiniz:

```
http://localhost:5000/swagger
```

### Ana Endpoint'ler

| Grup | Yol | Açıklama |
|------|-----|----------|
| Auth | `POST /api/auth/login` | Giriş |
| Customers | `GET/POST /api/customers` | Müşteri CRUD |
| Transactions | `GET/POST /api/transactions` | İşlem yönetimi |
| Balances | `GET /api/balances` | Bakiye sorgulama |
| Reports | `GET /api/reports/*` | Raporlar |
| Dashboard | `GET /api/dashboard/summary` | Dashboard özeti |
| Rates | `GET /api/rates/*` | Anlık kur bilgisi |
| Users | `GET/POST /api/users` | Kullanıcı yönetimi (Admin) |
| Asset Types | `GET/POST /api/asset-types` | Varlık birim yönetimi |

---

## 🗺️ Yol Haritası

### 📘 Modül 2 — Günlük İşlem Defteri *(Öncelikli)*
- [ ] Günlük satış ve alış kayıtları
- [ ] Kasa yönetimi (nakit, altın, döviz kasası)
- [ ] Stok hareketleri takibi
- [ ] Gün sonu mutabakatı ve kapanış raporu
- [ ] İşletme kâr/zarar analizi

### 🔧 Genel İyileştirmeler
- [ ] Otomatik kur çekme zamanlayıcısı
- [ ] Offline destek (Service Worker)
- [ ] Bildirim sistemi
- [ ] Yedekleme ve geri yükleme
- [ ] PWA ikonları

---

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Lütfen:

1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<div align="center">

**Kuyumculuk sektörü için ❤️ ile geliştirildi**

</div>
