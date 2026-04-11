# Kuyumcu Özel Cari Sistemi — Faz 2: Frontend Scaffold, Auth & Layout

## Ön Koşul

- Faz 1 backend tamamen çalışır durumda
- `dotnet run` ile API ayakta, `/health` → 200
- PostgreSQL Docker container çalışıyor
- Seed verisi mevcut: admin kullanıcı + 13 asset type

---

## Adım 1 — Vite + React + TypeScript Scaffold

```bash
cd kuyumcu-private
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

---

## Adım 2 — Bağımlılıklar

```bash
# Routing
npm install react-router-dom

# HTTP client
npm install axios

# Shadcn/ui gereksinimleri
npm install tailwindcss @tailwindcss/vite

# Shadcn/ui CLI
npx shadcn@latest init
```

Shadcn init sırasında şu seçenekleri kullan:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

### Shadcn bileşenlerini ekle:

```bash
npx shadcn@latest add button input label card dialog sheet \
  table dropdown-menu select badge separator avatar \
  toast tabs form popover command scroll-area \
  alert-dialog tooltip skeleton switch textarea \
  sidebar breadcrumb collapsible sonner checkbox \
  radio-group calendar pagination
```

### Ek kütüphaneler:

```bash
# İkonlar
npm install lucide-react

# Tarih formatlama
npm install date-fns

# Excel export
npm install xlsx file-saver
npm install -D @types/file-saver

# PDF export
npm install jspdf jspdf-autotable
npm install -D @types/jspdf

# Tablo yönetimi
npm install @tanstack/react-table

# Form yönetimi + validasyon
npm install react-hook-form @hookform/resolvers zod

# Sayı formatlama (TL, gram, adet)
npm install numeral
npm install -D @types/numeral
```

---

## Adım 3 — Proje Yapısı

`frontend/src/` altında şu yapıyı oluştur:

```
src/
├── api/
│   ├── axios.ts              # Axios instance, interceptors
│   ├── auth.ts               # login, logout
│   ├── customers.ts          # CRUD + photo
│   ├── transactions.ts       # deposit, withdrawal, conversion, cancel
│   ├── balances.ts           # müşteri bakiyeleri
│   ├── asset-types.ts        # varlık birimleri listesi
│   ├── users.ts              # kullanıcı yönetimi (Faz 5)
│   └── reports.ts            # raporlama endpoint'leri (Faz 5)
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx      # Ana layout: sidebar + header + content
│   │   ├── AppSidebar.tsx     # Sol menü — Shadcn Sidebar
│   │   ├── AppHeader.tsx      # Üst bar — kullanıcı adı, çıkış
│   │   ├── MobileNav.tsx      # Mobilde hamburger menü
│   │   └── BreadcrumbNav.tsx  # Sayfa yolu gösterimi
│   ├── shared/
│   │   ├── DataTable.tsx      # Genel tablo: sıralama, filtreleme, sayfalama, arama
│   │   ├── ExportButtons.tsx  # PDF / Excel export butonları
│   │   ├── ConfirmDialog.tsx  # Onay dialogu
│   │   ├── LoadingSpinner.tsx # Yükleniyor gösterimi
│   │   ├── EmptyState.tsx     # Veri yokken gösterilen ekran
│   │   ├── PageHeader.tsx     # Sayfa başlığı + aksiyonlar
│   │   ├── AmountDisplay.tsx  # Tutar gösterimi: yeşil (alacak), kırmızı (borç)
│   │   ├── StatusBadge.tsx    # Durum etiketi
│   │   └── SearchInput.tsx    # Debounced arama input'u
│   └── ui/                    # Shadcn/ui bileşenleri (otomatik oluşur)
├── contexts/
│   └── AuthContext.tsx        # JWT token yönetimi, kullanıcı bilgisi
├── hooks/
│   ├── useAuth.ts             # AuthContext hook
│   ├── useDebounce.ts         # Arama debounce
│   └── useMediaQuery.ts      # Responsive kontrol
├── lib/
│   ├── utils.ts               # Shadcn cn() fonksiyonu (otomatik oluşur)
│   ├── formatters.ts          # Para, tarih, sayı formatlayıcılar
│   └── constants.ts           # Sabit değerler, renk kodları
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── customers/
│   │   ├── CustomerListPage.tsx
│   │   └── CustomerDetailPage.tsx
│   ├── transactions/
│   │   └── TransactionPage.tsx
│   ├── reports/
│   │   ├── PortfolioReportPage.tsx
│   │   ├── DailyReportPage.tsx
│   │   └── CustomerStatementPage.tsx
│   └── admin/
│       └── UserManagementPage.tsx
├── types/
│   └── index.ts               # Tüm TypeScript tipleri
├── App.tsx
├── main.tsx
└── index.css
```

---

## Adım 4 — Tailwind ve Tema Konfigürasyonu

### `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
```

### `src/index.css`

Shadcn'in oluşturduğu CSS değişkenlerini koru, ek olarak şu özelleştirmeleri yap:

```css
/* Shadcn base import'larını koru, ardından ekle: */

/* Kuyumcu Tema Özelleştirmeleri */

/* Alacak / Borç renkleri — tüm sistemde tutarlı kullanılacak */
:root {
  --color-alacak: #16a34a;        /* Yeşil — müşteriden alacak (müşteri yatırdı) */
  --color-borc: #dc2626;          /* Kırmızı — müşteriye borç (müşteri çekti) */
  --color-alacak-bg: #f0fdf4;
  --color-borc-bg: #fef2f2;
  --color-gold: #b8860b;          /* Altın vurgu rengi */
  --color-gold-light: #fef3c7;
}

.dark {
  --color-alacak: #4ade80;
  --color-borc: #f87171;
  --color-alacak-bg: #052e16;
  --color-borc-bg: #450a0a;
  --color-gold: #fbbf24;
  --color-gold-light: #422006;
}

/* Büyük, okunabilir fontlar — yaşlı kullanıcılar için */
html {
  font-size: 17px;  /* Varsayılan 16px yerine 17px */
}

@media (min-width: 1280px) {
  html {
    font-size: 18px;
  }
}

/* Tablo satırları daha rahat okunabilir olsun */
table tbody tr {
  min-height: 3rem;
}

/* Butonlar daha büyük tıklama alanı */
button, [role="button"] {
  min-height: 2.75rem;
  min-width: 2.75rem;
}

/* Input'lar daha büyük */
input, select, textarea {
  min-height: 2.75rem;
  font-size: 1rem;
}
```

---

## Adım 5 — TypeScript Tipleri

**`src/types/index.ts`**

```ts
// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export interface AuthUser {
  token: string;
  fullName: string;
  role: "Admin" | "Staff";
  expiresAt: Date;
}

// ── Customer ──────────────────────────────────────────────────
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  address?: string;
  email?: string;
  nationalId?: string;
  notes?: string;
  hasPhoto: boolean;
  createdAt: string;
}

export interface CustomerCreateRequest {
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  email?: string;
  nationalId?: string;
  notes?: string;
}

export interface CustomerUpdateRequest extends CustomerCreateRequest {}

// ── AssetType ─────────────────────────────────────────────────
export type UnitType = "Currency" | "Piece" | "Gram";

export interface AssetType {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  karat?: number;
  gramWeight?: number;
  isActive: boolean;
  sortOrder: number;
}

// ── Balance ───────────────────────────────────────────────────
export interface Balance {
  assetTypeId: string;
  assetTypeCode: string;
  assetTypeName: string;
  unitType: UnitType;
  amount: number;
}

// ── Transaction ───────────────────────────────────────────────
export type TransactionType = "Deposit" | "Withdrawal" | "Conversion";

export interface ConversionDetail {
  fromAssetCode: string;
  fromAssetName: string;
  fromAmount: number;
  fromRateTry: number;
  tryEquivalent: number;
  toAssetCode: string;
  toAssetName: string;
  toAmount: number;
  toRateTry: number;
  rateSource: string;
  rateNote?: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerFullName: string;
  type: TransactionType;
  assetTypeCode?: string;
  assetTypeName?: string;
  amount?: number;
  description?: string;
  createdByFullName: string;
  createdAt: string;
  isCancelled: boolean;
  cancelReason?: string;
  conversion?: ConversionDetail;
}

export interface DepositRequest {
  customerId: string;
  assetTypeId: string;
  amount: number;
  description?: string;
}

export interface WithdrawalRequest {
  customerId: string;
  assetTypeId: string;
  amount: number;
  description?: string;
}

export interface ConversionRequest {
  customerId: string;
  fromAssetTypeId: string;
  fromAmount: number;
  fromRateTry: number;
  toAssetTypeId: string;
  toRateTry: number;
  description?: string;
  rateNote?: string;
}

// ── Tablo / Sayfalama ─────────────────────────────────────────
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

// ── User Management ───────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  username: string;
  role: "Admin" | "Staff";
  isActive: boolean;
}

export interface UserCreateRequest {
  fullName: string;
  username: string;
  password: string;
  role: "Admin" | "Staff";
}
```

---

## Adım 6 — Axios Instance ve Interceptors

**`src/api/axios.ts`**

```ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — token ekle
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth");
  if (stored) {
    const auth = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// Response interceptor — 401'de login'e yönlendir
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Adım 7 — API Servisleri

**`src/api/auth.ts`**
```ts
import api from "./axios";
import type { LoginRequest, LoginResponse } from "@/types";

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", data).then((r) => r.data),
};
```

**`src/api/customers.ts`**
```ts
import api from "./axios";
import type { Customer, CustomerCreateRequest, CustomerUpdateRequest } from "@/types";

export const customerApi = {
  getAll: () => api.get<Customer[]>("/customers").then((r) => r.data),

  getById: (id: string) =>
    api.get<Customer>(`/customers/${id}`).then((r) => r.data),

  create: (data: CustomerCreateRequest) =>
    api.post<Customer>("/customers", data).then((r) => r.data),

  update: (id: string, data: CustomerUpdateRequest) =>
    api.put<Customer>(`/customers/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/customers/${id}`),

  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return api.post(`/customers/${id}/photo`, file, {
      headers: { "Content-Type": "application/octet-stream" },
    });
  },

  getPhotoUrl: (id: string) => `/api/customers/${id}/photo`,
};
```

**`src/api/transactions.ts`**
```ts
import api from "./axios";
import type {
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  ConversionRequest,
} from "@/types";

export const transactionApi = {
  getByCustomer: (customerId: string) =>
    api.get<Transaction[]>(`/transactions/customer/${customerId}`).then((r) => r.data),

  deposit: (data: DepositRequest) =>
    api.post<Transaction>("/transactions/deposit", data).then((r) => r.data),

  withdraw: (data: WithdrawalRequest) =>
    api.post<Transaction>("/transactions/withdrawal", data).then((r) => r.data),

  convert: (data: ConversionRequest) =>
    api.post<Transaction>("/transactions/conversion", data).then((r) => r.data),

  cancel: (id: string, reason: string) =>
    api.post(`/transactions/${id}/cancel`, { reason }),
};
```

**`src/api/balances.ts`**
```ts
import api from "./axios";
import type { Balance } from "@/types";

export const balanceApi = {
  getByCustomer: (customerId: string) =>
    api.get<Balance[]>(`/balances/customer/${customerId}`).then((r) => r.data),
};
```

**`src/api/asset-types.ts`**
```ts
import api from "./axios";
import type { AssetType } from "@/types";

export const assetTypeApi = {
  getAll: () => api.get<AssetType[]>("/asset-types").then((r) => r.data),
};
```

---

## Adım 8 — Auth Context

**`src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthUser, LoginRequest } from "@/types";
import { authApi } from "@/api/auth";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Token süresi dolmuşsa temizle
    if (new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem("auth");
      return null;
    }
    return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
  });

  const login = async (request: LoginRequest) => {
    const response = await authApi.login(request);
    const authUser: AuthUser = {
      token: response.token,
      fullName: response.fullName,
      role: response.role as "Admin" | "Staff",
      expiresAt: new Date(response.expiresAt),
    };
    localStorage.setItem("auth", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setUser(null);
  };

  // Token süre kontrolü — periyodik
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (user.expiresAt < new Date()) {
        logout();
      }
    }, 60_000); // Her dakika kontrol
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "Admin",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

---

## Adım 9 — Yardımcı Fonksiyonlar

**`src/lib/formatters.ts`**
```ts
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/** Para birimi formatla — 1.234,56 */
export function formatMoney(value: number, decimals = 2): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Adet formatla — 13,06 (ondalıklı adet) */
export function formatPiece(value: number): string {
  // Tam sayıysa ondalık gösterme
  if (Number.isInteger(value)) return value.toString();
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/** Gram formatla — 125,750 g */
export function formatGram(value: number): string {
  return (
    value.toLocaleString("tr-TR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " g"
  );
}

/** Varlık tipine göre otomatik formatla */
export function formatAmount(value: number, unitType: string): string {
  switch (unitType) {
    case "Currency":
      return formatMoney(value);
    case "Gram":
      return formatGram(value);
    case "Piece":
      return formatPiece(value);
    default:
      return value.toString();
  }
}

/** Tarih formatla — 15 Ocak 2025 14:30 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: tr });
}

/** Kısa tarih — 15.01.2025 */
export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "dd.MM.yyyy", { locale: tr });
}

/** İşlem tipi Türkçe karşılık */
export function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    Deposit: "Yatırma",
    Withdrawal: "Çekme",
    Conversion: "Dönüşüm",
  };
  return map[type] ?? type;
}
```

**`src/lib/constants.ts`**
```ts
/** Sayfa başına varsayılan kayıt sayısı */
export const DEFAULT_PAGE_SIZE = 20;

/** Sayfa başına seçenekler */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Debounce süresi (ms) */
export const SEARCH_DEBOUNCE_MS = 300;
```

---

## Adım 10 — Hooks

**`src/hooks/useDebounce.ts`**
```ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

**`src/hooks/useMediaQuery.ts`**
```ts
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}
```

---

## Adım 11 — Layout Bileşenleri

### Tasarım İlkeleri (bu dosyadaki tüm bileşenler için geçerli)

1. **Sidebar** — masaüstünde sabit sol menü (280px), mobilde Sheet/Drawer
2. **Header** — kullanıcı adı, rol badge, çıkış butonu
3. **Renk kodlaması:**
   - Yeşil (#16a34a) → müşteriden **alacak** (müşteri yatırdı, bakiye pozitif)
   - Kırmızı (#dc2626) → müşteriye **borç** (müşteri çekti, bakiye negatif)
   - Altın (#b8860b) → altın varlık vurgusu
4. **Font:** Minimum 17px, inputlar minimum 2.75rem yükseklik
5. **Mobil:** Tüm tablolar yatay kaydırılabilir, formlar tek sütun

### `src/components/layout/AppSidebar.tsx`

Shadcn Sidebar bileşenini kullan. Menü yapısı:

```
📊 Gösterge Paneli        → /
👥 Müşteriler              → /customers
📈 Raporlar                → /reports  (alt menü açılır)
   ├─ Genel Portföy        → /reports/portfolio
   ├─ Günlük Rapor         → /reports/daily
   └─ Müşteri Ekstre       → /reports/statement
⚙️ Yönetim (sadece Admin)  → /admin  (alt menü açılır)
   └─ Kullanıcılar         → /admin/users
```

- Aktif sayfa sidebar'da vurgulanmalı
- Sidebar alt kısmında versiyon numarası: "v1.0.0"
- Mobilde sidebar Sheet olarak açılmalı, sayfa seçilince otomatik kapanmalı

### `src/components/layout/AppHeader.tsx`

- Sol: Breadcrumb (örn: Müşteriler > Ahmet Yılmaz)
- Sağ: Kullanıcı adı + rol badge (Admin/Personel) + Çıkış butonu
- Mobilde: Hamburger menü ikonu (sidebar'ı açar)

### `src/components/layout/AppLayout.tsx`

```tsx
// SidebarProvider + AppSidebar + main content alanı
// Tüm authenticated sayfalar bu layout içinde render edilir
// Login sayfası bu layout DIŞINDA kalır
```

---

## Adım 12 — Login Sayfası

**`src/pages/LoginPage.tsx`**

Tasarım:
- Tam ekran, ortalanmış kart
- Üstte altın rengi ikon veya logo alanı (şimdilik metin: "Kuyumcu Özel Cari")
- Kullanıcı adı + şifre input'ları — büyük, rahat tıklanabilir
- "Giriş Yap" butonu — tam genişlik, altın/amber tonunda
- Hata mesajı: kırmızı alert
- Arka plan: koyu gradient veya subtle altın desen
- Mobilde de rahat kullanılabilmeli

Form validasyonu:
- Kullanıcı adı boş olamaz
- Şifre boş olamaz
- Hata durumunda toast veya inline mesaj

---

## Adım 13 — Router ve App.tsx

**`src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
// ... tüm sayfa import'ları

// PrivateRoute bileşeni — login olmayanı /login'e yönlendir
// AdminRoute bileşeni — Admin olmayanı ana sayfaya yönlendir

// Route yapısı:
// /login          → LoginPage (layout dışı)
// /               → DashboardPage
// /customers      → CustomerListPage
// /customers/:id  → CustomerDetailPage
// /reports/portfolio  → PortfolioReportPage
// /reports/daily      → DailyReportPage
// /reports/statement  → CustomerStatementPage
// /admin/users        → UserManagementPage (AdminRoute)
```

**`src/main.tsx`**
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Adım 14 — Shared Bileşenler (Temel)

### `src/components/shared/AmountDisplay.tsx`

Bakiye/tutar gösterimi — tüm sistemde tutarlı renk kullanımı:

```
Kurallar:
- amount > 0 → yeşil (alacak — müşteri bize yatırdı)
- amount < 0 → kırmızı (borç — biz müşteriye borçluyuz)
- amount === 0 → gri/nötr

Props:
- value: number
- unitType: UnitType
- showSign?: boolean (+ / - göster)
- size?: "sm" | "md" | "lg"  (varsayılan: "md")
```

Büyük boyutta (lg) tutar kalın ve belirgin olmalı.

### `src/components/shared/LoadingSpinner.tsx`

Tam sayfa veya inline loading gösterimi. Skeleton tercih edilebilir.

### `src/components/shared/EmptyState.tsx`

Veri olmadığında gösterilecek: ikon + mesaj + opsiyonel aksiyon butonu.

### `src/components/shared/PageHeader.tsx`

Sayfa başlığı + sağ tarafta aksiyon butonları (örn: "Yeni Müşteri" butonu).

### `src/components/shared/ConfirmDialog.tsx`

Silme / iptal gibi kritik işlemler öncesi onay dialogu.
Shadcn AlertDialog kullan.
Butonlar büyük ve net olmalı — yanlışlıkla tıklamayı önle.

---

## Adım 15 — Doğrulama

```bash
cd frontend
npm run dev
```

Kontrol listesi:
1. `http://localhost:3000/login` açılmalı — giriş formu görünmeli
2. admin / admin123 ile giriş yapılmalı — ana sayfaya yönlendirmeli
3. Sidebar menü görünmeli — tüm linkler çalışmalı
4. Mobil görünümde hamburger menü çalışmalı
5. Çıkış butonu ile çıkış yapılabilmeli — login'e yönlendirmeli
6. Token süresi dolduğunda otomatik çıkış yapılmalı
7. API proxy çalışmalı — `/api/asset-types` veri dönmeli

---

## Sonraki Adım → Faz 3

Faz 3'te müşteri yönetimi ekranları (liste, detay, oluşturma, güncelleme, fotoğraf) kodlanacak.
