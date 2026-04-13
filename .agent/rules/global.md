# Global Coding Standards & Architecture Rules

## 1. Project Overview
**Project Name**: Jewelry Dual Ledger (Kuyumcu-Private)
**Domain**: Dual-ledger system for jewelry businesses, managing both store portfolio (Mağaza) and customer portfolios (Müşteri) with multi-asset types (Gold, Cash, etc.).

## 2. Architecture & Tech Stack
### Backend
- **Framework**: .NET 10 Web API
- **Language**: C# 13.0
- **Database**: PostgreSQL
- **ORM**: Entity Framework Core 10 (Npgsql)
- **Architecture**: Clean Architecture (API, Application, Domain, Infrastructure)

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Shadcn UI
- **Routing**: React Router DOM 7
- **i18n**: i18next (Turkish & English)

## 3. General Rules (Do's and Don'ts)

### 🔴 DON'TS
- **DON'T** use hardcoded strings in the UI. Everything must be integrated with `i18next`.
- **DON'T** expose Domain entities directly in the API. Always use DTOs.
- **DON'T** write raw SQL queries unless absolutely necessary; use EF Core LINQ.
- **DON'T** use `any` type in TypeScript. Always define proper interfaces and types.
- **DON'T** commit `bin/`, `obj/`, or `node_modules/` or any local environment files.
- **DON'T** mix business logic inside UI React Components. Extract logic to hooks or utility functions.

### 🟢 DO'S
- **DO** write meaningful and concise commit descriptions.
- **DO** update English and Turkish translation files for every new UI feature.
- **DO** use Strong Typing across the application (TypeScript on Frontend, C# on Backend).
- **DO** follow the existing Clean Architecture layer rules (Dependencies point inward toward Domain).
- **DO** handle timezone and formatting issues for transaction dates carefully.
- **DO** write consistent error handling blocks in API endpoints and use standard HTTP status codes.
