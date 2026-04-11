# Uygulama Durumu

> Bu dosya her faz tamamlandığında güncellenir.
> Claude Code yeni conversation'da bu dosyayı okuyarak nereden devam edeceğini anlar.

---

## Faz 1 — Backend Start ✅
- [x] Solution yapısı (Domain, Application, Infrastructure, API)
- [x] Entity'ler (User, Customer, AssetType, Balance, Transaction, Conversion)
- [x] Enum'lar (UnitType, TransactionType, RateSource, UserRole)
- [x] AppDbContext + EF Core konfigürasyonu
- [x] Seed: 13 varlık birimi
- [x] Docker Compose (PostgreSQL)
- [x] Dockerfile
- [x] InitialCreate migration
- [x] /health endpoint

## Faz 1 — Backend Continue ✅
- [x] JWT Authentication (login, token üretimi)
- [x] Auth, Customer, Transaction, Balance, AssetType DTOs
- [x] Servis interface'leri + implementasyonları
- [x] AuthService, CustomerService, TransactionService
- [x] DI kaydı (DependencyInjection.cs)
- [x] Tüm endpoint'ler (Auth, Customer, Transaction, Balance, AssetType)
- [x] AdminOnly authorization policy
- [x] Seed: admin kullanıcı (admin / admin123)
- [x] AddUserSeed migration

## Faz 2 — Frontend Scaffold ✅
- [x] Vite + React + TypeScript
- [x] Shadcn/ui + Tailwind kurulumu (radix preset, 30 bileşen)
- [x] Proje klasör yapısı (api/, components/, contexts/, hooks/, lib/, pages/, types/)
- [x] TypeScript tipleri (src/types/index.ts)
- [x] Axios instance + interceptors (src/api/axios.ts)
- [x] API servisleri (auth, customers, transactions, balances, asset-types, users, reports)
- [x] AuthContext (JWT yönetimi, token süresi kontrolü)
- [x] Yardımcı fonksiyonlar (formatters, constants)
- [x] Hooks (useDebounce, useMediaQuery, useAuth)
- [x] Layout (AppSidebar, AppHeader, AppLayout, BreadcrumbNav, MobileNav)
- [x] Login sayfası (react-hook-form + zod validasyon, şifre göster/gizle)
- [x] Router + App.tsx (PrivateRoute + AdminRoute)
- [x] Shared bileşenler (AmountDisplay, LoadingSpinner, EmptyState, PageHeader, ConfirmDialog, DataTable, ExportButtons, SearchInput, StatusBadge)
- [x] Tema özelleştirmeleri (alacak/borç renkleri, altın rengi, 17px font, büyük inputlar)

## Faz 3 — Müşteri Yönetimi ⬜
- [ ] DataTable bileşeni (sıralama, filtreleme, sayfalama, arama)
- [ ] ExportButtons (Excel + PDF)
- [ ] SearchInput bileşeni
- [ ] Müşteri listesi sayfası
- [ ] Yeni müşteri dialogu
- [ ] Müşteri detay sayfası (bilgi kartı, bakiye kartları, hareket geçmişi)
- [ ] Müşteri düzenleme dialogu
- [ ] Müşteri silme (soft delete)
- [ ] Fotoğraf yükleme
- [ ] Dashboard sayfası
- [ ] Backend: Dashboard endpoint (opsiyonel)

## Faz 4 — İşlem Formları ⬜
- [ ] AssetTypeSelect bileşeni
- [ ] Yatırma dialogu
- [ ] Çekme dialogu (bakiye kontrolü)
- [ ] Dönüşüm dialogu (anlık hesaplama)
- [ ] İşlem onay dialogu
- [ ] İşlem iptali (Admin)
- [ ] İşlem geçmişi filtreleri

## Faz 5 — Raporlama + Kullanıcı Yönetimi ⬜
- [ ] Backend: Report endpoint'leri (portfolio, daily, statement, asset-detail)
- [ ] Backend: User CRUD endpoint'leri
- [ ] Backend: Dashboard endpoint
- [ ] Genel Portföy Raporu sayfası
- [ ] Günlük Rapor sayfası
- [ ] Müşteri Ekstre sayfası
- [ ] Kullanıcı Yönetimi sayfası (Admin)
- [ ] Dark mode toggle
- [ ] Global hata yönetimi
- [ ] Loading states + boş durumlar

---

## Bilinen Sorunlar
- npm 11 + Node 22 kombinasyonunda tslib `ideallyInert: true` olarak işaretlenip kurulmuyor; 
  `node_modules/.package-lock.json` dosyasından flag silinerek çözüldü.

## Notlar
- Faz 3 için hazır: DataTable, SearchInput, ExportButtons bileşenleri zaten mevcut.
- Shadcn nova preset kullanıldı (Lucide / Geist font).
- `vite.config.ts`'de `/api` → `http://localhost:5000` proxy tanımlı.
- TypeScript alias `@/*` → `./src/*` şeklinde ayarlı; `tsconfig.json` + `tsconfig.app.json` her ikisinde de mevcut.
