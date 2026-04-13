<div align="center">

# 💎 Jewelry Dual Ledger

**Kuyumcu İşletmeleri İçin Çift Defter Yönetim Sistemi**

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<br />

[🇹🇷 Türkçe](#-türkçe) · [🇬🇧 English](#-english)

---

</div>

<br />

# 🇹🇷 Türkçe

## 📋 Proje Hakkında

**Jewelry Dual Ledger**, kuyumcu işletmeleri için tasarlanmış, profesyonel düzeyde bir **müşteri cari hesap takip sistemidir**. Müşterilerin altın (gram ve adet), döviz (TRY, USD, EUR, GBP, SAR) ve kıymetli metal bakiyelerini dijital ortamda güvenli şekilde yönetmenizi sağlar.

Sistem, **özel cari defteri** (private ledger) kavramını temel alır — kuyumcuların geleneksel olarak kağıt defter üzerinde tuttuğu müşteri hesaplarını modern ve güvenli bir dijital platforma taşır.

### 🎯 Neden Bu Proje?

Türkiye'deki kuyumcu sektörü hâlâ büyük ölçüde kağıt defter ve basit Excel tablolarıyla çalışmaktadır. Bu proje, sektöre özgü ihtiyaçları karşılayan modern bir çözüm sunar:

- 📒 **Dijital Cari Defter** — Kağıt defterden dijitale geçiş
- 🪙 **Çoklu Varlık Desteği** — TL, döviz, gram altın ve adet altın (Cumhuriyet, Reşat serileri)
- 📊 **Anlık Raporlama** — Portföy, günlük rapor ve müşteri ekstresi
- 🔄 **Dönüşüm İşlemleri** — Varlıklar arası dönüşüm (altın↔TL, USD↔TL vb.)
- 📱 **Responsive Tasarım** — Masaüstü, tablet ve mobil cihazlarda sorunsuz çalışma

## ✨ Özellikler

### 👥 Müşteri Yönetimi
- Müşteri ekleme, düzenleme ve silme (soft delete)
- Silinmiş müşterileri geri yükleme
- Müşteri fotoğrafı yükleme ve görüntüleme
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

## 🐳 Docker ile Tam Kurulum

Tüm sistemi Docker ile ayağa kaldırmak için:

```bash
cd kuyumcu-private
docker compose up -d
```

Bu komut hem PostgreSQL hem de API'yi başlatır:
- **PostgreSQL:** `localhost:15432`
- **API:** `localhost:5000`

## 📸 Ekran Görüntüleri

> Ekran görüntüleri eklenecektir.

## 🗺️ Yol Haritası

- [ ] Otomatik kur çekme zamanlayıcısı
- [ ] Offline destek (Service Worker)
- [ ] Bildirim sistemi
- [ ] Yedekleme ve geri yükleme
- [ ] Resmi defter (official ledger) modülü
- [ ] Raporlama köprüsü (reporting bridge)
- [ ] PWA ikonları

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

<br />

# 🇬🇧 English

## 📋 About

**Jewelry Dual Ledger** is a professional-grade **customer account tracking system** designed for jewelry retail businesses. It enables secure digital management of customer balances across gold (gram and pieces), foreign currencies (TRY, USD, EUR, GBP, SAR), and precious metals.

The system is based on the **private ledger** concept — digitizing the traditional paper-based customer account books that jewelers have relied on for generations into a modern, secure platform.

### 🎯 Why This Project?

The jewelry retail sector in Turkey still largely operates with paper ledgers and basic spreadsheets. This project provides a modern solution tailored to the industry's specific needs:

- 📒 **Digital Ledger** — Transition from paper to digital
- 🪙 **Multi-Asset Support** — TRY, foreign currencies, gold by gram and pieces (Republic & Reşat coin series)
- 📊 **Real-time Reporting** — Portfolio, daily reports, and customer statements
- 🔄 **Conversion Operations** — Cross-asset conversions (gold↔TRY, USD↔TRY, etc.)
- 📱 **Responsive Design** — Seamless experience on desktop, tablet, and mobile

## ✨ Features

### 👥 Customer Management
- Full CRUD operations with soft delete
- Deleted customer restoration
- Customer photo upload and viewing
- Customer type classification (Individual, Jeweler, Supplier)
- National ID and phone number validation with duplicate prevention
- Advanced search, sorting, and pagination

### 💰 Transaction Management
- **Deposit** — Add assets to customer account
- **Withdrawal** — Withdraw assets with balance checking
- **Conversion** — Cross-asset conversion with live exchange rates
- Transaction cancellation (Admin only, reason required)
- Detailed transaction history with filtering

### 📊 Reporting
- **Portfolio Report** — Aggregate balance summary across all customers
- **Store Balance Calculator** — Business portfolio summary
- **Daily Report** — Day-by-day transaction summary
- **Customer Statement** — Date-range detailed statements
- **Excel & PDF Export** — Export capability across all reports
- **Portfolio Printing** — Receipt-style portfolio printout

### 💹 Live Exchange Rates
- TCMB EVDS API integration (foreign exchange rates)
- TCMB XML feed (backup exchange source)
- Precious metal prices (gold, silver)
- TRY equivalent calculations

### 🔐 Security & Authentication
- JWT-based authentication
- Role-based authorization (Admin / Staff)
- User management (create, edit, password change, activate/deactivate)
- Antiforgery token protection

### 🎨 UI/UX Features
- 🌗 Dark / Light mode
- 🌐 Multi-language support (Turkish / English)
- 📱 Fully responsive design
- ♿ Large font sizes (min 17px for elderly users)
- 💚 Color coding: Green = Receivable, Red = Payable

## 🏗️ Architecture

The project follows **Clean Architecture** principles with a layered design:

```
jewelry-dual-ledger/
└── kuyumcu-private/                    # Private Ledger Module
    ├── backend/                        # .NET 10 Minimal API
    │   └── src/
    │       ├── KuyumcuPrivate.Domain/          # Entities, Enums (Business Rules)
    │       ├── KuyumcuPrivate.Application/     # DTOs, Interfaces (Application Layer)
    │       ├── KuyumcuPrivate.Infrastructure/  # DbContext, Services (Infrastructure)
    │       └── KuyumcuPrivate.API/             # Endpoints, Program.cs (Presentation)
    ├── frontend/                       # React 19 SPA
    │   └── src/
    │       ├── api/            # Axios HTTP services
    │       ├── components/     # UI components (layout, shared, ui)
    │       ├── contexts/       # React Context (Auth)
    │       ├── hooks/          # Custom hooks
    │       ├── i18n/           # Internationalization (TR/EN)
    │       ├── lib/            # Utility functions
    │       ├── pages/          # Page components
    │       └── types/          # TypeScript type definitions
    └── docker-compose.yml      # PostgreSQL + API orchestration
```

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| .NET | 10.0 | Runtime & SDK |
| ASP.NET Core Minimal API | 10.0 | RESTful API |
| Entity Framework Core | 10.0 | ORM (Code-First) |
| PostgreSQL | 16 (Alpine) | Relational database |
| Npgsql | — | PostgreSQL .NET driver |
| BCrypt.Net | — | Password hashing |
| JWT Bearer | — | Token-based authentication |
| Swashbuckle | 10.x | Swagger / OpenAPI |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI library |
| TypeScript | 6.0 | Type safety |
| Vite | 8.x | Build tool & dev server |
| Tailwind CSS | 4.x | Utility-first CSS |
| Shadcn/ui | 4.x | Radix-based UI components |
| React Router | 7.x | Client-side routing |
| React Hook Form + Zod | — | Form management & validation |
| i18next | 26.x | Internationalization |
| Axios | 1.15 | HTTP client |
| Lucide React | — | Icon library |
| jsPDF + xlsx | — | PDF & Excel export |
| date-fns | 4.x | Date utilities |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker & Docker Compose | Container orchestration |
| PWA Manifest | Progressive Web App support |

## 🚀 Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/) and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/EminBozkaya/jewelry-dual-ledger.git
cd jewelry-dual-ledger
```

### 2. Start the Database

```bash
cd kuyumcu-private
docker compose up postgres -d
```

This starts PostgreSQL 16 via Docker on port `15432`.

### 3. Backend Configuration

Create a local configuration file for sensitive data:

```bash
cd kuyumcu-private/backend/src/KuyumcuPrivate.API
```

Create `appsettings.Local.json` (this file is in `.gitignore` and won't be committed):

```json
{
  "Jwt": {
    "Key": "YOUR_SECRET_KEY_AT_LEAST_32_CHARACTERS"
  },
  "Evds": {
    "ApiKey": "YOUR_TCMB_EVDS_API_KEY"
  }
}
```

> 💡 **EVDS API Key:** To fetch live exchange rates, obtain a free API key from [TCMB EVDS](https://evds2.tcmb.gov.tr/) portal. The app works without it — you just won't get live exchange rates.

### 4. Run the Backend

```bash
cd kuyumcu-private/backend
dotnet run --project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj
```

The API starts at `http://localhost:5000`. Database migrations are applied automatically on first run.

### 5. Run the Frontend

Open a new terminal:

```bash
cd kuyumcu-private/frontend
npm install
npm run dev
```

The frontend opens at `http://localhost:3000`.

### 6. Login

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ **Important:** Change your password immediately after first login via the Admin panel.

## 🐳 Full Docker Setup

To spin up the entire system with Docker:

```bash
cd kuyumcu-private
docker compose up -d
```

This starts both PostgreSQL and the API:
- **PostgreSQL:** `localhost:15432`
- **API:** `localhost:5000`

## 📸 Screenshots

> Screenshots will be added.

## 🗺️ Roadmap

- [ ] Automatic exchange rate polling scheduler
- [ ] Offline support (Service Worker)
- [ ] Notification system
- [ ] Backup and restore
- [ ] Official ledger module
- [ ] Reporting bridge
- [ ] PWA icons

## 📄 API Documentation

Access Swagger UI while the backend is running:

```
http://localhost:5000/swagger
```

### Main Endpoints

| Group | Path | Description |
|-------|------|-------------|
| Auth | `POST /api/auth/login` | Login |
| Customers | `GET/POST /api/customers` | Customer CRUD |
| Transactions | `GET/POST /api/transactions` | Transaction management |
| Balances | `GET /api/balances` | Balance queries |
| Reports | `GET /api/reports/*` | Reports |
| Dashboard | `GET /api/dashboard/summary` | Dashboard summary |
| Rates | `GET /api/rates/*` | Live exchange rates |
| Users | `GET/POST /api/users` | User management (Admin) |
| Asset Types | `GET/POST /api/asset-types` | Asset type management |

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ for the jewelry retail industry**

</div>
