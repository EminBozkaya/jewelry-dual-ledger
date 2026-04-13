<div align="center">

# 💎 Jewelry Dual Ledger

<br />

### 🌐 Select Language / Dil Seçin

<a href="README.md"><img src="https://img.shields.io/badge/🇹🇷_Türkçe-CC0000?style=for-the-badge" alt="Türkçe" /></a>
<a href="README.en.md"><img src="https://img.shields.io/badge/🇬🇧_English-003399?style=for-the-badge" alt="English" /></a>

---

**Dual-Ledger Management System for Jewelry Retail Businesses**

[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📋 About

**Jewelry Dual Ledger** is a professional-grade **dual-ledger management system** designed for jewelry retail businesses. The "Dual" in the project name refers to the two core management areas that every jewelry business needs:

<table>
<tr>
<td width="50%" valign="top">

### 📗 Module 1 — Private Ledger&ensp;✅
**Customer account tracking.** Record and manage customer balances across gold (gram and pieces), foreign currencies, and precious metals. Handle deposits, withdrawals, conversions, and generate detailed reports.

> **Status:** Complete and in active use.

</td>
<td width="50%" valign="top">

### 📘 Module 2 — Operations Ledger&ensp;🚧
**Daily store operations.** Real-time tracking of the jewelry store's daily sales, purchases, and conversion transactions; cash register management, inventory movements, and end-of-day reconciliation.

> **Status:** Development starting soon.

</td>
</tr>
</table>

Together, these two modules will form a complete digital management platform for a jewelry business — covering both **customer relations** and **daily operations**. Currently, this repository contains the fully functional **Module 1 (Private Ledger)**.

### 🎯 Why This Project?

The jewelry retail sector in Turkey still largely operates with paper ledgers and basic spreadsheets. This project provides a modern solution tailored to the industry's specific needs:

- 📒 **Digital Ledger** — Transition from paper to digital
- 🪙 **Multi-Asset Support** — TRY, foreign currencies, gold by gram and pieces (Republic & Reşat coin series)
- 📊 **Real-time Reporting** — Portfolio, daily reports, and customer statements
- 🔄 **Conversion Operations** — Cross-asset conversions (gold↔TRY, USD↔TRY, etc.)
- 📱 **Responsive Design** — Seamless experience on desktop, tablet, and mobile

---

## ✨ Features

### 👥 Customer Management
- Full CRUD operations with soft delete
- Deleted customer restoration
- Customer photo upload and full-screen viewing
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

---

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

---

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

---

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

---

## 🐳 Full Docker Setup

To spin up the entire system with Docker:

```bash
cd kuyumcu-private
docker compose up -d
```

This starts both PostgreSQL and the API:
- **PostgreSQL:** `localhost:15432`
- **API:** `localhost:5000`

---

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

---

## 🗺️ Roadmap

### 📘 Module 2 — Operations Ledger *(Priority)*
- [ ] Daily sales and purchase records
- [ ] Cash register management (cash, gold, foreign currency registers)
- [ ] Inventory movement tracking
- [ ] End-of-day reconciliation and closing reports
- [ ] Business profit/loss analysis

### 🔧 General Improvements
- [ ] Automatic exchange rate polling scheduler
- [ ] Offline support (Service Worker)
- [ ] Notification system
- [ ] Backup and restore
- [ ] PWA icons

---

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
