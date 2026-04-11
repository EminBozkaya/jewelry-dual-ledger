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

## Faz 3 — Müşteri Yönetimi ✅
- [x] SearchInput — debounce (300ms) + temizle butonu
- [x] ExportButtons — gerçek xlsx (xlsx kütüphanesi) ve PDF (jspdf + autoTable) export
- [x] DataTable — onRowClick, isLoading (Skeleton), emptyMessage, exportFilename/exportColumns props; sayfalama bilgisi "N kayıttan X–Y arası gösteriliyor"
- [x] Müşteri listesi sayfası (CustomerListPage) — arama, sıralama, sayfalama, Excel/PDF export, satıra tıklayarak detaya git
- [x] Yeni müşteri dialogu — react-hook-form + zod, tüm alanlar, başarılı toast + liste yenileme
- [x] Müşteri detay sayfası (CustomerDetailPage)
  - [x] Bilgi kartı (avatar, ad, telefon, email, TC, adres, notlar)
  - [x] Fotoğraf yükleme (JPG/PNG, maks 5MB, tıklanabilir avatar)
  - [x] Bakiye kartları grid (pozitif=yeşil, negatif=kırmızı; sadece amount≠0 olanlar)
  - [x] İşlem butonları (Yatır / Çek / Dönüştür — Faz 4 için placeholder)
  - [x] Hareket geçmişi — Tabs: Tüm İşlemler + Dönüşüm Detayları
  - [x] Admin kullanıcı için işlem iptali (sebep girişi zorunlu)
  - [x] İptal edilen işlem satırları kırmızı badge
- [x] Müşteri düzenleme dialogu (mevcut bilgiler dolu)
- [x] Müşteri silme (soft delete) — ConfirmDialog + toast + yönlendirme
- [x] Dashboard sayfası (DashboardPage) — 4 özet kart, hızlı erişim butonları, son 10 işlem tablosu
- [x] Backend: GET /api/dashboard/summary endpoint (totalCustomers, todayTransactionCount, recentTransactions)
- [x] Frontend: src/api/dashboard.ts API servisi

## Faz 4 — İşlem Formları ✅
- [x] AssetTypeSelect bileşeni — Combobox, gruplu (Para/Altın Adet/Altın Gram/Diğer), arama
- [x] Yatırma dialogu (DepositDialog) — form + onay adımı, yeşil "Yatır" butonu
- [x] Çekme dialogu (WithdrawalDialog) — mevcut bakiye gösterimi, "Tamamını Çek", bakiye aşım engeli, onay adımı
- [x] Dönüşüm dialogu (ConversionDialog) — kaynak/hedef varlık, anlık TL karşılığı + hedef miktar hesaplama, onay adımı
- [x] İşlem onay diyalogu — yatır/çek/dönüştür formlarında son adım özet + onayla
- [x] İşlem iptali (Admin) — işlem özeti gösterimi, iptal sebebi zorunlu, tooltip ile sebep gösterme
- [x] İşlem geçmişi filtreleri — tür, varlık, durum, tarih aralığı; client-side
- [x] DataTable getRowClassName prop eklendi (iptal satırları bg-red-50)
- [x] App.tsx'e TooltipProvider eklendi

## Faz 5 — Raporlama + Kullanıcı Yönetimi ✅
- [x] Backend: IUserService + IReportService interface'leri
  - DTOs: UserDtos.cs, ReportDtos.cs
- [x] Backend: UserService implementasyonu (UserService.cs)
  - Kullanıcı listeleme, oluşturma, güncelleme, şifre değiştirme, aktif/pasif toggle
- [x] Backend: ReportService implementasyonu (ReportService.cs)
  - Portföy özeti, günlük rapor, müşteri ekstresi, varlık detayı
- [x] Backend: UserEndpoints.cs (GET, POST, PUT, password, toggle-active) — AdminOnly
- [x] Backend: ReportEndpoints.cs (portfolio, daily, customer-statement, asset-detail)
- [x] Backend: DashboardEndpoints.cs güncellendi — totalActiveUsers eklendi
- [x] Backend: DependencyInjection.cs güncellendi (UserService + ReportService kayıtları)
- [x] Backend: Program.cs güncellendi (MapReportEndpoints + MapUserEndpoints)
- [x] Frontend: types/index.ts — PortfolioAsset, DailyReport, CustomerStatement, AssetDetailCustomer tipleri
- [x] Frontend: api/dashboard.ts — totalActiveUsers eklendi
- [x] Frontend: api/reports.ts — getAssetDetail endpoint eklendi
- [x] Frontend: api/users.ts — changePassword + toggleActive endpoint'leri düzeltildi
- [x] Frontend: PortfolioReportPage — varlık kartları (renk kodlu), detay dialog, genel tablo, export
- [x] Frontend: DailyReportPage — tarih seçici (önceki/sonraki gün okları), 3 özet kart, işlem tablosu, export
- [x] Frontend: CustomerStatementPage — müşteri combobox, tarih aralığı, açılış/kapanış bakiyeleri, işlem tablosu, export
- [x] Frontend: UserManagementPage — DataTable, yeni kullanıcı dialogu, düzenleme, şifre değiştir, toggle aktif/pasif
- [x] Frontend: DashboardPage güncellendi — Aktif Kullanıcı kartı, mini portföy (5 varlık), Günlük Rapor hızlı erişim
- [x] Frontend: Dark mode toggle — AppHeader'a güneş/ay ikonu, localStorage persist, useDarkMode hook
- [x] Frontend: Global hata yönetimi — axios interceptor (403, 500, network error toast)
- [x] Frontend: PWA manifest.json + index.html bağlantısı + theme-color

---

## Proje Tamamlandı ✅

Tüm faz direktifleri uygulandı. Sistem tamamen fonksiyonel:

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
- ✅ PWA manifest

## Bilinen Sorunlar
- npm 11 + Node 22 kombinasyonunda tslib `ideallyInert: true` olarak işaretlenip kurulmuyor;
  `node_modules/.package-lock.json` dosyasından flag silinerek çözüldü.
- Dashboard'daki Toplam Alacak / Toplam Borç TL karşılığı hesabı yapılmıyor; TL dışı
  varlıkların kur karşılığı Faz 2'de kur API entegrasyonuyla hesaplanacak.
- PWA ikonları (icon-192.png, icon-512.png) oluşturulmadı; manifest.json hazır ama
  ikonlar olmadan ana ekrana ekleme tam çalışmayabilir.

## Notlar
- Shadcn nova preset kullanıldı (Lucide / Geist font).
- `vite.config.ts`'de `/api` → `http://localhost:5000` proxy tanımlı.
- TypeScript alias `@/*` → `./src/*` şeklinde ayarlı; `tsconfig.json` + `tsconfig.app.json` her ikisinde de mevcut.
- Faz 2 için planlananlar: Otomatik kur çekme, TL karşılığı hesaplama, offline destek, bildirimler, yedekleme/restore.
