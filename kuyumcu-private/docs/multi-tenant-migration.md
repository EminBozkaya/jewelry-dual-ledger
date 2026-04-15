# Jewelry Dual Ledger — Multi-Tenant (Çok Mağazalı) Geçiş Direktifi

## Bağlam ve Amaç

Bu direktif, **jewelry-dual-ledger** projesini tek mağaza (single-tenant) mimarisinden çok mağazalı (multi-tenant) mimarisine geçirmek için hazırlanmıştır. Claude Code bu dosyayı okuyarak tüm geçişi uçtan uca gerçekleştirecektir.

### Mevcut Durum
- Proje tek mağaza için çalışıyor ve pilot kuyumcu tarafından aktif test ediliyor
- Stack: .NET 10 Minimal API + React 19 / TypeScript / Tailwind 4 + PostgreSQL 16
- Clean Architecture: Domain → Application → Infrastructure → API
- Altyapı: Cloudflare Pages (frontend) + Oracle Cloud VM / Podman + Caddy (backend) + Neon PostgreSQL
- JWT tabanlı authentication mevcut (Admin / Staff rolleri)

### Hedef
- Her mağaza `store_id` ile izole edilecek
- Subdomain modeli: `magazaadi.defteri.app`
- Landing/vitrin sayfası: `kuyumcudefteri.com`
- Mağaza bazlı özelleştirme (white-label) desteği
- Şubeler arası tam veri izolasyonu

### Kritik Kurallar (değiştirme)
- Tüm kod İngilizce, yorumlar Türkçe olabilir
- Mevcut entity yapısını kırma — additive (eklemeli) migration yap
- Her adımın sonunda `dotnet build` başarılı olmalı
- Mevcut seed data korunmalı, yeni seed data eklenmeli
- Mevcut API endpoint'lerinin geriye uyumluluğu korunmalı (geçiş sırasında)

---

## Proje Yapısı (referans)

```
jewelry-dual-ledger/
└── kuyumcu-private/
    ├── backend/
    │   └── src/
    │       ├── KuyumcuPrivate.Domain/
    │       │   ├── Common/BaseEntity.cs
    │       │   ├── Entities/   (User, Customer, AssetType, Balance, Transaction, Conversion)
    │       │   └── Enums/      (UnitType, TransactionType, RateSource, UserRole)
    │       ├── KuyumcuPrivate.Application/
    │       │   ├── DTOs/       (Auth, Customers, Transactions, Balances)
    │       │   └── Interfaces/ (IAuthService, ICustomerService, ITransactionService)
    │       ├── KuyumcuPrivate.Infrastructure/
    │       │   ├── Persistence/AppDbContext.cs
    │       │   ├── Services/   (AuthService, CustomerService, TransactionService)
    │       │   └── DependencyInjection.cs
    │       └── KuyumcuPrivate.API/
    │           ├── Endpoints/  (Auth, Customer, Transaction, Balance, AssetType)
    │           ├── Program.cs
    │           └── appsettings.json
    ├── frontend/
    │   └── src/
    │       ├── api/        (Axios HTTP servisleri)
    │       ├── components/ (layout, shared, ui)
    │       ├── contexts/   (AuthContext)
    │       ├── hooks/
    │       ├── i18n/       (TR/EN)
    │       ├── pages/
    │       └── types/
    └── docker-compose.yml
```

---

## ADIM 1 — Domain: Store Entity ve StoreSettings Entity

### 1.1 — Store Entity

**`src/KuyumcuPrivate.Domain/Entities/Store.cs`** oluştur:

```csharp
using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Mağaza (tenant) tanımı — her kuyumcu işletmesi bir Store kaydıdır.
/// Subdomain üzerinden erişilir: slug.defteri.app
/// </summary>
public class Store : BaseEntity
{
    public string Name { get; set; } = string.Empty;           // Mağaza görünen adı: "Altınkral Kuyumculuk"
    public string Slug { get; set; } = string.Empty;           // Subdomain slug: "altinkral" → altinkral.defteri.app
    public string? LogoUrl { get; set; }                        // Mağaza logosu URL
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxNumber { get; set; }                      // Vergi numarası
    public string? TaxOffice { get; set; }                      // Vergi dairesi
    public bool IsActive { get; set; } = true;                  // Pasif mağaza erişemez
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubscriptionExpiresAt { get; set; }        // Abonelik bitiş tarihi (null = sınırsız)

    // Navigation
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Balance> Balances { get; set; } = [];
    public ICollection<StoreAssetType> StoreAssetTypes { get; set; } = [];
    public ICollection<StoreSetting> Settings { get; set; } = [];
}
```

### 1.2 — StoreSetting Entity (Mağaza Bazlı Özelleştirme)

**`src/KuyumcuPrivate.Domain/Entities/StoreSetting.cs`** oluştur:

```csharp
using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Mağaza bazlı key-value ayar deposu.
/// Örnek: "ui.customer_label" → "Müşteri" veya "Alıcı"
/// Örnek: "ui.report_title" → "Hesap Ekstresi"
/// Örnek: "report.show_logo" → "true"
/// Örnek: "ui.primary_color" → "#1a5276"
/// Mağaza admini kendi panelinden ayar ekleyip düzenleyebilir.
/// Frontend, login sonrası tüm ayarları çekip Context'e yükler.
/// </summary>
public class StoreSetting : BaseEntity
{
    public Guid StoreId { get; set; }
    public string Key { get; set; } = string.Empty;     // Dot-notation: "ui.report_title"
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }             // Admin panelinde gösterilecek açıklama
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Store Store { get; set; } = null!;
}
```

### 1.3 — StoreAssetType Entity (Mağaza Bazlı Varlık Birimi Açma/Kapama)

**`src/KuyumcuPrivate.Domain/Entities/StoreAssetType.cs`** oluştur:

```csharp
using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Hangi mağaza hangi varlık birimlerini kullanıyor?
/// Global AssetType tablosu tüm birimleri tanımlar,
/// bu tablo ise mağaza bazında aktif/pasif kontrolü sağlar.
/// Örnek: Bir kuyumcu gümüş satmıyorsa SILVER'ı kapatabilir.
/// </summary>
public class StoreAssetType : BaseEntity
{
    public Guid StoreId { get; set; }
    public Guid AssetTypeId { get; set; }
    public bool IsActive { get; set; } = true;
    public int? SortOrderOverride { get; set; }  // Mağaza kendi sıralamasını yapabilir

    // Navigation
    public Store Store { get; set; } = null!;
    public AssetType AssetType { get; set; } = null!;
}
```

---

## ADIM 2 — Domain: Mevcut Entity'lere StoreId Eklenmesi

Her bir mevcut entity'ye `StoreId` property'si ve navigation ekle. **Dosyaları doğrudan düzenle, üzerine yazma.**

### 2.1 — IStoreScoped Interface

**`src/KuyumcuPrivate.Domain/Common/IStoreScoped.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.Domain.Common;

/// <summary>
/// Store bazlı izolasyon gerektiren tüm entity'ler bu interface'i implemente eder.
/// DbContext bu interface'i kullanan entity'lere otomatik global query filter uygular.
/// </summary>
public interface IStoreScoped
{
    Guid StoreId { get; set; }
    Store? Store { get; set; }
}
```

> **Not:** Bu interface'i kullanmak için `using KuyumcuPrivate.Domain.Entities;` gerekecek. Ancak Common namespace'inde Entities referansı olmaması için, Store navigation'ı concrete sınıflarda tanımlanabilir. Alternatif olarak interface'de sadece `Guid StoreId` bırakılabilir. **Pragmatik yaklaşım:** Interface'de sadece `Guid StoreId { get; set; }` tut, navigation'ı her entity'de ayrı tanımla.

Düzeltilmiş versiyon:

```csharp
namespace KuyumcuPrivate.Domain.Common;

/// <summary>
/// Store bazlı izolasyon gerektiren tüm entity'ler bu interface'i implemente eder.
/// DbContext bu interface'i kullanan entity'lere otomatik global query filter uygular.
/// </summary>
public interface IStoreScoped
{
    Guid StoreId { get; set; }
}
```

### 2.2 — User Entity Güncellemesi

`src/KuyumcuPrivate.Domain/Entities/User.cs` dosyasına şunları ekle:

```csharp
// Mevcut property'lerin altına ekle:
public Guid StoreId { get; set; }

// Navigation bölümüne ekle:
public Store Store { get; set; } = null!;
```

Sınıf imzasını güncelle: `public class User : BaseEntity, IStoreScoped`

`using KuyumcuPrivate.Domain.Common;` zaten var, `IStoreScoped` import'u için yeterli.

### 2.3 — Customer Entity Güncellemesi

`src/KuyumcuPrivate.Domain/Entities/Customer.cs` dosyasına şunları ekle:

```csharp
// Mevcut property'lerin altına ekle:
public Guid StoreId { get; set; }

// Navigation bölümüne ekle:
public Store Store { get; set; } = null!;
```

Sınıf imzası: `public class Customer : BaseEntity, IStoreScoped`

### 2.4 — Balance Entity Güncellemesi

`src/KuyumcuPrivate.Domain/Entities/Balance.cs` dosyasına şunları ekle:

```csharp
public Guid StoreId { get; set; }
public Store Store { get; set; } = null!;
```

Sınıf imzası: `public class Balance : BaseEntity, IStoreScoped`

### 2.5 — Transaction Entity Güncellemesi

`src/KuyumcuPrivate.Domain/Entities/Transaction.cs` dosyasına şunları ekle:

```csharp
public Guid StoreId { get; set; }
public Store Store { get; set; } = null!;
```

Sınıf imzası: `public class Transaction : BaseEntity, IStoreScoped`

### 2.6 — Conversion Entity

Conversion entity'sine `StoreId` **ekleme**. Conversion her zaman bir Transaction'a bağlıdır ve Transaction zaten StoreId taşır. Gereksiz duplikasyondan kaçın.

### 2.7 — AssetType Entity

AssetType entity'sine `StoreId` **ekleme**. AssetType global bir referans tablosudur (TL, USD, CEYREK vb.). Mağaza bazlı aktivasyon `StoreAssetType` join tablosu ile yönetilir.

---

## ADIM 3 — Infrastructure: DbContext Güncellemesi

`src/KuyumcuPrivate.Infrastructure/Persistence/AppDbContext.cs` dosyasını güncelle.

### 3.1 — Yeni DbSet'ler Ekle

```csharp
public DbSet<Store> Stores => Set<Store>();
public DbSet<StoreSetting> StoreSettings => Set<StoreSetting>();
public DbSet<StoreAssetType> StoreAssetTypes => Set<StoreAssetType>();
```

### 3.2 — ICurrentStoreContext Inject Et

DbContext'e store context'i inject edebilmek için constructor'ı güncelle. Ancak EF Core'da DbContext'e custom dependency inject etmek karmaşıktır. Bunun yerine **global query filter + middleware** yaklaşımı kullan.

**Yöntem:** `_currentStoreId` değerini `IHttpContextAccessor` üzerinden al.

AppDbContext constructor'ını şu şekilde güncelle:

```csharp
using Microsoft.AspNetCore.Http;

public class AppDbContext : DbContext
{
    private readonly Guid? _currentStoreId;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
        : base(options)
    {
        // Middleware tarafından HttpContext.Items["StoreId"] olarak set ediliyor
        if (httpContextAccessor?.HttpContext?.Items.TryGetValue("StoreId", out var storeIdObj) == true
            && storeIdObj is Guid storeId)
        {
            _currentStoreId = storeId;
        }
    }

    // ... mevcut DbSet'ler ...
```

### 3.3 — OnModelCreating Güncellemesi

`OnModelCreating` metodunun sonuna (mevcut entity konfigürasyonlarından sonra) şunları ekle:

```csharp
// Store
modelBuilder.Entity<Store>(e =>
{
    e.HasKey(x => x.Id);
    e.HasIndex(x => x.Slug).IsUnique();
    e.Property(x => x.Slug).HasMaxLength(63); // subdomain max length
});

// StoreSetting
modelBuilder.Entity<StoreSetting>(e =>
{
    e.HasKey(x => x.Id);
    e.HasIndex(x => new { x.StoreId, x.Key }).IsUnique();
    e.Property(x => x.Key).HasMaxLength(128);
    e.HasOne(x => x.Store).WithMany(x => x.Settings).HasForeignKey(x => x.StoreId);
});

// StoreAssetType
modelBuilder.Entity<StoreAssetType>(e =>
{
    e.HasKey(x => x.Id);
    e.HasIndex(x => new { x.StoreId, x.AssetTypeId }).IsUnique();
    e.HasOne(x => x.Store).WithMany(x => x.StoreAssetTypes).HasForeignKey(x => x.StoreId);
    e.HasOne(x => x.AssetType).WithMany().HasForeignKey(x => x.AssetTypeId);
});
```

Mevcut entity konfigürasyonlarına `StoreId` foreign key ilişkilerini ekle:

```csharp
// User — mevcut konfigürasyona ekle
e.HasOne(x => x.Store).WithMany(x => x.Users).HasForeignKey(x => x.StoreId);

// Customer — mevcut konfigürasyona ekle
e.HasOne(x => x.Store).WithMany(x => x.Customers).HasForeignKey(x => x.StoreId);

// Balance — mevcut konfigürasyona ekle
e.HasOne(x => x.Store).WithMany(x => x.Balances).HasForeignKey(x => x.StoreId);

// Transaction — mevcut konfigürasyona ekle
e.HasOne(x => x.Store).WithMany(x => x.Transactions).HasForeignKey(x => x.StoreId);
```

### 3.4 — Global Query Filter (Otomatik Store İzolasyonu)

`OnModelCreating` sonuna **global query filter** ekle. Bu filtre sayesinde hiçbir servis katmanında `WHERE store_id = @storeId` yazmaya gerek kalmaz — EF Core otomatik ekler.

```csharp
// ── Global Store Filter ──────────────────────────────────────────────
// IStoreScoped implement eden tüm entity'lere otomatik filtre uygula
if (_currentStoreId.HasValue)
{
    var storeId = _currentStoreId.Value;

    modelBuilder.Entity<User>().HasQueryFilter(
        x => x.StoreId == storeId);

    modelBuilder.Entity<Customer>().HasQueryFilter(
        x => !x.IsDeleted && x.StoreId == storeId);  // Mevcut soft-delete filtresi korunuyor

    modelBuilder.Entity<Balance>().HasQueryFilter(
        x => x.StoreId == storeId);

    modelBuilder.Entity<Transaction>().HasQueryFilter(
        x => x.StoreId == storeId);

    modelBuilder.Entity<StoreSetting>().HasQueryFilter(
        x => x.StoreId == storeId);

    modelBuilder.Entity<StoreAssetType>().HasQueryFilter(
        x => x.StoreId == storeId);
}
else
{
    // StoreId yoksa (migration, seed vb.) sadece mevcut soft-delete filtresi
    modelBuilder.Entity<Customer>().HasQueryFilter(x => !x.IsDeleted);
}
```

> **Önemli:** Mevcut `Customer` entity'sindeki `HasQueryFilter(x => !x.IsDeleted)` satırını kaldır ve yukarıdaki birleşik filtreyle değiştir.

### 3.5 — Seed Data Güncellemesi

Mevcut `SeedAssetTypes` ve `SeedUsers` metodlarını koru. Ek olarak bir varsayılan Store seed'i ekle:

```csharp
private static void SeedDefaultStore(ModelBuilder modelBuilder)
{
    var defaultStoreId = Guid.Parse("00000000-0000-0000-0000-000000000100");

    modelBuilder.Entity<Store>().HasData(new Store
    {
        Id        = defaultStoreId,
        Name      = "Demo Kuyumculuk",
        Slug      = "demo",
        IsActive  = true,
        CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
    });
}
```

Mevcut `SeedUsers` metodundaki admin kullanıcısına `StoreId` ekle:

```csharp
// Admin kullanıcısının StoreId'sini varsayılan mağazaya ata
StoreId = Guid.Parse("00000000-0000-0000-0000-000000000100")
```

`OnModelCreating` içinde `SeedDefaultStore(modelBuilder);` çağrısını `SeedAssetTypes` ve `SeedUsers` çağrılarının **önüne** ekle (FK bağımlılığı nedeniyle).

---

## ADIM 4 — Application: ICurrentStoreContext ve Yeni DTO'lar

### 4.1 — ICurrentStoreContext Interface

**`src/KuyumcuPrivate.Application/Interfaces/ICurrentStoreContext.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.Application.Interfaces;

/// <summary>
/// Mevcut HTTP isteğinin ait olduğu mağazayı sağlar.
/// Middleware tarafından subdomain'den veya JWT'den resolve edilir.
/// Tüm servisler bu interface üzerinden store_id'ye erişir.
/// </summary>
public interface ICurrentStoreContext
{
    Guid StoreId { get; }
    string StoreSlug { get; }
}
```

### 4.2 — Store DTOs

**`src/KuyumcuPrivate.Application/DTOs/Stores/StoreResponse.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreResponse(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? Phone,
    string? Email,
    string? Address,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? SubscriptionExpiresAt
);
```

**`src/KuyumcuPrivate.Application/DTOs/Stores/StoreCreateRequest.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreCreateRequest(
    string Name,
    string Slug,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxNumber,
    string? TaxOffice,
    string AdminFullName,
    string AdminUsername,
    string AdminPassword
);
```

### 4.3 — StoreSetting DTOs

**`src/KuyumcuPrivate.Application/DTOs/Stores/StoreSettingResponse.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreSettingResponse(
    Guid Id,
    string Key,
    string Value,
    string? Description
);
```

**`src/KuyumcuPrivate.Application/DTOs/Stores/StoreSettingUpsertRequest.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreSettingUpsertRequest(
    string Key,
    string Value,
    string? Description
);
```

### 4.4 — LoginResponse Güncellemesi

Mevcut `LoginResponse` record'una `StoreSlug` ve `StoreId` ekle:

```csharp
public record LoginResponse(
    string Token,
    string FullName,
    string Role,
    DateTime ExpiresAt,
    string StoreSlug,     // Yeni — frontend redirect için
    Guid StoreId          // Yeni — frontend context için
);
```

### 4.5 — IStoreService Interface

**`src/KuyumcuPrivate.Application/Interfaces/IStoreService.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.DTOs.Stores;

namespace KuyumcuPrivate.Application.Interfaces;

/// <summary>
/// Mağaza CRUD işlemleri — sadece süper admin (platform seviyesi) kullanır.
/// Yeni mağaza oluşturulurken admin kullanıcısı da otomatik yaratılır.
/// </summary>
public interface IStoreService
{
    Task<StoreResponse> CreateAsync(StoreCreateRequest request);
    Task<StoreResponse?> GetBySlugAsync(string slug);
    Task<StoreResponse?> GetByIdAsync(Guid id);
    Task<List<StoreResponse>> GetAllAsync();
    Task<bool> DeactivateAsync(Guid id);
}
```

### 4.6 — IStoreSettingService Interface

**`src/KuyumcuPrivate.Application/Interfaces/IStoreSettingService.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.DTOs.Stores;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IStoreSettingService
{
    Task<List<StoreSettingResponse>> GetAllAsync();
    Task<StoreSettingResponse> UpsertAsync(StoreSettingUpsertRequest request);
    Task<bool> DeleteAsync(string key);
}
```

---

## ADIM 5 — Domain: UserRole Enum Güncellemesi

`src/KuyumcuPrivate.Domain/Enums/UserRole.cs` dosyasına yeni rol ekle:

```csharp
namespace KuyumcuPrivate.Domain.Enums;

public enum UserRole
{
    SuperAdmin,  // Platform yöneticisi — tüm mağazalara erişim, mağaza CRUD
    Admin,       // Mağaza sahibi — kendi mağazasının tüm işlemlerine erişim
    Staff        // Mağaza personeli — günlük işlemler
}
```

> **Dikkat:** Mevcut seed admin kullanıcısının rolü `Admin` olarak kalır. `SuperAdmin` rolü sadece platform yönetimi içindir ve ayrı bir seed ile oluşturulacaktır.

---

## ADIM 6 — Infrastructure: Middleware ve CurrentStoreContext

### 6.1 — CurrentStoreContext Implementasyonu

**`src/KuyumcuPrivate.Infrastructure/Services/CurrentStoreContext.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace KuyumcuPrivate.Infrastructure.Services;

/// <summary>
/// HTTP context'ten mevcut store bilgisini okur.
/// StoreResolutionMiddleware tarafından HttpContext.Items'a yazılan değerleri kullanır.
/// </summary>
public class CurrentStoreContext(IHttpContextAccessor httpContextAccessor) : ICurrentStoreContext
{
    public Guid StoreId =>
        httpContextAccessor.HttpContext?.Items.TryGetValue("StoreId", out var id) == true && id is Guid guid
            ? guid
            : throw new InvalidOperationException("StoreId HTTP context'te bulunamadı.");

    public string StoreSlug =>
        httpContextAccessor.HttpContext?.Items.TryGetValue("StoreSlug", out var slug) == true && slug is string s
            ? s
            : throw new InvalidOperationException("StoreSlug HTTP context'te bulunamadı.");
}
```

### 6.2 — StoreResolutionMiddleware

**`src/KuyumcuPrivate.API/Middleware/StoreResolutionMiddleware.cs`** oluştur:

```csharp
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Middleware;

/// <summary>
/// Gelen isteğin hangi mağazaya ait olduğunu çözümler.
/// Öncelik sırası:
///   1. X-Store-Slug header (Caddy tarafından subdomain'den eklenir)
///   2. JWT'deki store_id claim'i (authenticated istekler için)
///   3. Query string: ?store=slug (geliştirme ortamı için)
///
/// Çözümlenen store_id ve slug HttpContext.Items'a yazılır.
/// Çözümlenemezse 404 döner.
///
/// Muaf yollar: /health, /api/auth/login, /api/platform/* (SuperAdmin endpointleri)
/// </summary>
public class StoreResolutionMiddleware(RequestDelegate next)
{
    // Bu path'ler store resolution'dan muaftır
    private static readonly string[] ExemptPaths =
    [
        "/health",
        "/api/auth/login",
        "/api/platform",
        "/swagger",
        "/_framework"
    ];

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var path = context.Request.Path.Value ?? "";

        // Muaf path kontrolü
        if (ExemptPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await next(context);
            return;
        }

        string? slug = null;

        // 1. Caddy'den gelen header
        if (context.Request.Headers.TryGetValue("X-Store-Slug", out var headerSlug))
        {
            slug = headerSlug.ToString().ToLowerInvariant().Trim();
        }

        // 2. Query string (geliştirme ortamı fallback)
        if (string.IsNullOrEmpty(slug))
        {
            slug = context.Request.Query["store"].ToString().ToLowerInvariant().Trim();
        }

        // 3. JWT'deki store_id claim'i (token zaten varsa)
        if (string.IsNullOrEmpty(slug) && context.User.Identity?.IsAuthenticated == true)
        {
            var storeIdClaim = context.User.FindFirst("store_id")?.Value;
            if (Guid.TryParse(storeIdClaim, out var claimStoreId))
            {
                // Direkt ID üzerinden çözümle
                var storeById = await db.Stores
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == claimStoreId && s.IsActive);

                if (storeById is not null)
                {
                    context.Items["StoreId"] = storeById.Id;
                    context.Items["StoreSlug"] = storeById.Slug;
                    await next(context);
                    return;
                }
            }
        }

        if (string.IsNullOrEmpty(slug))
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = "Mağaza bilgisi bulunamadı. Subdomain veya store parametresi gerekli." });
            return;
        }

        // Slug → Store çözümleme (IgnoreQueryFilters: global filter StoreId arar, burada henüz yok)
        var store = await db.Stores
            .AsNoTracking()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Slug == slug && s.IsActive);

        if (store is null)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = $"'{slug}' mağazası bulunamadı veya aktif değil." });
            return;
        }

        // Abonelik kontrolü
        if (store.SubscriptionExpiresAt.HasValue && store.SubscriptionExpiresAt.Value < DateTime.UtcNow)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new { error = "Mağaza aboneliği sona ermiş. Lütfen yönetici ile iletişime geçin." });
            return;
        }

        context.Items["StoreId"] = store.Id;
        context.Items["StoreSlug"] = store.Slug;

        await next(context);
    }
}
```

### 6.3 — StoreClaimValidationMiddleware (Çift Kontrol)

**`src/KuyumcuPrivate.API/Middleware/StoreClaimValidationMiddleware.cs`** oluştur:

```csharp
namespace KuyumcuPrivate.API.Middleware;

/// <summary>
/// JWT'deki store_id ile subdomain'den resolve edilen store_id eşleşmesini kontrol eder.
/// Bir kullanıcının yanlış subdomain üzerinden erişmesini engeller.
/// Bu middleware, Authentication middleware'den SONRA çalışmalıdır.
/// </summary>
public class StoreClaimValidationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Sadece authenticated isteklerde kontrol et
        if (context.User.Identity?.IsAuthenticated == true
            && context.Items.TryGetValue("StoreId", out var resolvedObj)
            && resolvedObj is Guid resolvedStoreId)
        {
            var claimStoreId = context.User.FindFirst("store_id")?.Value;

            // SuperAdmin tüm mağazalara erişebilir
            var role = context.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role == "SuperAdmin")
            {
                await next(context);
                return;
            }

            if (Guid.TryParse(claimStoreId, out var tokenStoreId) && tokenStoreId != resolvedStoreId)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Bu mağazaya erişim yetkiniz bulunmuyor."
                });
                return;
            }
        }

        await next(context);
    }
}
```

---

## ADIM 7 — Infrastructure: Servis Güncellemeleri

### 7.1 — AuthService Güncellemesi

`src/KuyumcuPrivate.Infrastructure/Services/AuthService.cs` dosyasını güncelle.

JWT claim'lerine `store_id` ekle:

```csharp
var claims = new[]
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
    new Claim(ClaimTypes.Name, user.FullName),
    new Claim(ClaimTypes.Role, user.Role.ToString()),
    new Claim("store_id", user.StoreId.ToString())   // YENİ
};
```

`LoginAsync` metodunda store bilgisini dön:

```csharp
// User'ın store'unu çek
var store = await db.Stores.FindAsync(user.StoreId);

return new LoginResponse(
    Token: new JwtSecurityTokenHandler().WriteToken(token),
    FullName: user.FullName,
    Role: user.Role.ToString(),
    ExpiresAt: expiresAt,
    StoreSlug: store?.Slug ?? "",    // YENİ
    StoreId: user.StoreId           // YENİ
);
```

> **Login akışı notu:** `/api/auth/login` endpoint'i store resolution'dan muaftır. Login'de kullanıcı adı + şifre ile giriş yapılır. User tablosunda `StoreId` zaten var, dolayısıyla kullanıcının hangi mağazaya ait olduğu otomatik belirlenir. Response'taki `StoreSlug` ile frontend kullanıcıyı doğru subdomain'e yönlendirir.

### 7.2 — CustomerService Güncellemesi

`CustomerService` constructor'ına `ICurrentStoreContext` ekle:

```csharp
public class CustomerService(AppDbContext db, ICurrentStoreContext storeContext) : ICustomerService
```

`CreateAsync` metodunda müşteriye `StoreId` ata:

```csharp
var customer = new Customer
{
    // ... mevcut alanlar ...
    StoreId = storeContext.StoreId   // YENİ
};
```

> **Global query filter sayesinde** `GetAllAsync`, `GetByIdAsync` ve diğer okuma metodlarında hiçbir değişiklik gerekmez. EF Core otomatik olarak `WHERE store_id = @currentStoreId` ekler.

### 7.3 — TransactionService Güncellemesi

`TransactionService` constructor'ına `ICurrentStoreContext` ekle:

```csharp
public class TransactionService(AppDbContext db, ICurrentStoreContext storeContext) : ITransactionService
```

`DepositAsync`, `WithdrawAsync`, `ConvertAsync` metodlarında transaction'a `StoreId` ata:

```csharp
var transaction = new Transaction
{
    // ... mevcut alanlar ...
    StoreId = storeContext.StoreId   // YENİ
};
```

`UpdateBalanceAsync` metodunda yeni balance oluştururken:

```csharp
balance = new Balance
{
    CustomerId  = customerId,
    AssetTypeId = assetTypeId,
    Amount      = 0,
    StoreId     = storeContext.StoreId   // YENİ
};
```

### 7.4 — StoreService Implementasyonu

**`src/KuyumcuPrivate.Infrastructure/Services/StoreService.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.DTOs.Stores;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

/// <summary>
/// Mağaza CRUD — sadece SuperAdmin tarafından kullanılır.
/// Yeni mağaza oluşturulurken:
///   1. Store kaydı oluşturulur
///   2. Admin kullanıcısı oluşturulur
///   3. Tüm aktif AssetType'lar StoreAssetType olarak eklenir
/// </summary>
public class StoreService(AppDbContext db) : IStoreService
{
    public async Task<StoreResponse> CreateAsync(StoreCreateRequest request)
    {
        // Slug benzersizlik kontrolü
        var slugExists = await db.Stores
            .IgnoreQueryFilters()
            .AnyAsync(s => s.Slug == request.Slug.ToLowerInvariant());

        if (slugExists)
            throw new InvalidOperationException($"'{request.Slug}' slug'ı zaten kullanımda.");

        var store = new Store
        {
            Name      = request.Name.Trim(),
            Slug      = request.Slug.ToLowerInvariant().Trim(),
            Phone     = request.Phone?.Trim(),
            Email     = request.Email?.Trim(),
            Address   = request.Address?.Trim(),
            TaxNumber = request.TaxNumber?.Trim(),
            TaxOffice = request.TaxOffice?.Trim(),
            IsActive  = true
        };

        db.Stores.Add(store);
        await db.SaveChangesAsync();

        // Admin kullanıcısı oluştur
        var adminUser = new User
        {
            FullName     = request.AdminFullName.Trim(),
            Username     = request.AdminUsername.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
            Role         = UserRole.Admin,
            IsActive     = true,
            StoreId      = store.Id
        };

        db.Users.Add(adminUser);

        // Tüm aktif AssetType'ları bu mağazaya ekle
        var assetTypes = await db.AssetTypes
            .Where(a => a.IsActive)
            .ToListAsync();

        foreach (var at in assetTypes)
        {
            db.StoreAssetTypes.Add(new StoreAssetType
            {
                StoreId     = store.Id,
                AssetTypeId = at.Id,
                IsActive    = true
            });
        }

        await db.SaveChangesAsync();

        return ToResponse(store);
    }

    public async Task<StoreResponse?> GetBySlugAsync(string slug)
    {
        var store = await db.Stores
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Slug == slug.ToLowerInvariant());
        return store is null ? null : ToResponse(store);
    }

    public async Task<StoreResponse?> GetByIdAsync(Guid id)
    {
        var store = await db.Stores
            .IgnoreQueryFilters()
            .FindAsync(id);
        return store is null ? null : ToResponse(store);
    }

    public async Task<List<StoreResponse>> GetAllAsync()
    {
        return await db.Stores
            .IgnoreQueryFilters()
            .OrderBy(s => s.Name)
            .Select(s => ToResponse(s))
            .ToListAsync();
    }

    public async Task<bool> DeactivateAsync(Guid id)
    {
        var store = await db.Stores.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == id);
        if (store is null) return false;
        store.IsActive = false;
        await db.SaveChangesAsync();
        return true;
    }

    private static StoreResponse ToResponse(Store s) => new(
        s.Id, s.Name, s.Slug, s.LogoUrl, s.Phone, s.Email,
        s.Address, s.IsActive, s.CreatedAt, s.SubscriptionExpiresAt
    );
}
```

### 7.5 — StoreSettingService Implementasyonu

**`src/KuyumcuPrivate.Infrastructure/Services/StoreSettingService.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.DTOs.Stores;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

/// <summary>
/// Mağaza bazlı ayar yönetimi.
/// Global query filter sayesinde sadece mevcut mağazanın ayarları döner.
/// </summary>
public class StoreSettingService(AppDbContext db, ICurrentStoreContext storeContext) : IStoreSettingService
{
    public async Task<List<StoreSettingResponse>> GetAllAsync()
    {
        return await db.StoreSettings
            .OrderBy(s => s.Key)
            .Select(s => new StoreSettingResponse(s.Id, s.Key, s.Value, s.Description))
            .ToListAsync();
    }

    public async Task<StoreSettingResponse> UpsertAsync(StoreSettingUpsertRequest request)
    {
        var existing = await db.StoreSettings
            .FirstOrDefaultAsync(s => s.Key == request.Key);

        if (existing is not null)
        {
            existing.Value = request.Value;
            existing.Description = request.Description;
        }
        else
        {
            existing = new StoreSetting
            {
                StoreId     = storeContext.StoreId,
                Key         = request.Key.Trim(),
                Value       = request.Value,
                Description = request.Description
            };
            db.StoreSettings.Add(existing);
        }

        await db.SaveChangesAsync();
        return new StoreSettingResponse(existing.Id, existing.Key, existing.Value, existing.Description);
    }

    public async Task<bool> DeleteAsync(string key)
    {
        var setting = await db.StoreSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting is null) return false;
        db.StoreSettings.Remove(setting);
        await db.SaveChangesAsync();
        return true;
    }
}
```

---

## ADIM 8 — DI Kaydı ve Program.cs Güncellemesi

### 8.1 — DependencyInjection.cs Güncellemesi

Mevcut `DependencyInjection.cs` dosyasına yeni servisleri ekle:

```csharp
services.AddScoped<ICurrentStoreContext, CurrentStoreContext>();
services.AddScoped<IStoreService, StoreService>();
services.AddScoped<IStoreSettingService, StoreSettingService>();
```

`using` satırlarına ekle:

```csharp
using Microsoft.AspNetCore.Http;
```

Ayrıca `AddInfrastructure` metoduna:

```csharp
services.AddHttpContextAccessor();
```

### 8.2 — Program.cs Güncellemesi

`Program.cs` dosyasında middleware sıralama kritiktir. Aşağıdaki sıraya dikkat et:

```csharp
// using ekle
using KuyumcuPrivate.API.Middleware;

// ... builder konfigürasyonu ...

var app = builder.Build();

app.UseCors();

// 1. Store çözümleme — her şeyden önce
app.UseMiddleware<StoreResolutionMiddleware>();

// 2. Authentication
app.UseAuthentication();
app.UseAuthorization();

// 3. Store claim doğrulama — auth'dan sonra
app.UseMiddleware<StoreClaimValidationMiddleware>();

// ... swagger, migration, endpoints ...
```

Authorization policy güncellemesi:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin", "SuperAdmin"));

    options.AddPolicy("SuperAdminOnly", policy =>
        policy.RequireRole("SuperAdmin"));
});
```

Yeni endpoint gruplarını kaydet:

```csharp
app.MapStoreSettingEndpoints();
app.MapPlatformEndpoints();
```

---

## ADIM 9 — API: Yeni Endpoint Dosyaları

### 9.1 — Platform Endpoints (SuperAdmin)

**`src/KuyumcuPrivate.API/Endpoints/PlatformEndpoints.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.DTOs.Stores;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

/// <summary>
/// Platform seviyesi yönetim endpoint'leri.
/// Sadece SuperAdmin erişebilir.
/// Store resolution middleware'den muaftır (/api/platform prefix'i).
/// </summary>
public static class PlatformEndpoints
{
    public static void MapPlatformEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/platform")
            .WithTags("Platform")
            .RequireAuthorization("SuperAdminOnly");

        // POST /api/platform/stores — yeni mağaza oluştur
        group.MapPost("/stores", async (StoreCreateRequest request, IStoreService svc) =>
        {
            try
            {
                var store = await svc.CreateAsync(request);
                return Results.Created($"/api/platform/stores/{store.Id}", store);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // GET /api/platform/stores — tüm mağazaları listele
        group.MapGet("/stores", async (IStoreService svc) =>
            Results.Ok(await svc.GetAllAsync()));

        // GET /api/platform/stores/{id}
        group.MapGet("/stores/{id:guid}", async (Guid id, IStoreService svc) =>
        {
            var store = await svc.GetByIdAsync(id);
            return store is null ? Results.NotFound() : Results.Ok(store);
        });

        // POST /api/platform/stores/{id}/deactivate
        group.MapPost("/stores/{id:guid}/deactivate", async (Guid id, IStoreService svc) =>
        {
            var result = await svc.DeactivateAsync(id);
            return result ? Results.Ok() : Results.NotFound();
        });
    }
}
```

### 9.2 — StoreSetting Endpoints

**`src/KuyumcuPrivate.API/Endpoints/StoreSettingEndpoints.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.DTOs.Stores;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class StoreSettingEndpoints
{
    public static void MapStoreSettingEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/settings")
            .WithTags("StoreSettings")
            .RequireAuthorization();

        // GET /api/settings — mağazanın tüm ayarlarını döner
        // Hem admin paneli hem de frontend başlatma sırasında kullanılır
        group.MapGet("/", async (IStoreSettingService svc) =>
            Results.Ok(await svc.GetAllAsync()));

        // PUT /api/settings — ayar ekle veya güncelle (upsert)
        group.MapPut("/", async (StoreSettingUpsertRequest request, IStoreSettingService svc) =>
        {
            var result = await svc.UpsertAsync(request);
            return Results.Ok(result);
        }).RequireAuthorization("AdminOnly");

        // DELETE /api/settings/{key}
        group.MapDelete("/{key}", async (string key, IStoreSettingService svc) =>
        {
            var result = await svc.DeleteAsync(key);
            return result ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization("AdminOnly");
    }
}
```

### 9.3 — Auth Endpoints Güncellemesi

Mevcut `AuthEndpoints.cs` dosyasındaki login response'u zaten güncellenmiş `LoginResponse` DTO'sunu döner. Ek olarak, login sonrası subdomain yönlendirme bilgisi response'ta mevcuttur.

Login endpoint'ine mağaza bilgisi çözümleme eklenmeli. Login store resolution'dan muaf olduğu için, kullanıcı adı üzerinden store bulunur. `AuthService.LoginAsync` zaten user'ın `StoreId`'sinden store'u çekiyor.

---

## ADIM 10 — Migration

```bash
cd kuyumcu-private/backend

dotnet ef migrations add AddMultiTenancy \
  --project src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj \
  --startup-project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj \
  --output-dir Persistence/Migrations
```

> **Önemli:** Migration oluşturulduktan sonra, oluşan migration dosyasını incele. Mevcut tablolardaki `StoreId` sütunlarının `nullable: false` olarak eklendiğini doğrula. Eğer mevcut veriler varsa, migration'a bir `Sql()` komutu ekleyerek mevcut kayıtlara varsayılan store_id atanmalı:

```csharp
// Migration dosyasının Up metodunun başına ekle (mevcut verileri varsayılan store'a bağla)
migrationBuilder.Sql(@"
    UPDATE ""Users""        SET ""StoreId"" = '00000000-0000-0000-0000-000000000100' WHERE ""StoreId"" = '00000000-0000-0000-0000-000000000000';
    UPDATE ""Customers""    SET ""StoreId"" = '00000000-0000-0000-0000-000000000100' WHERE ""StoreId"" = '00000000-0000-0000-0000-000000000000';
    UPDATE ""Balances""     SET ""StoreId"" = '00000000-0000-0000-0000-000000000100' WHERE ""StoreId"" = '00000000-0000-0000-0000-000000000000';
    UPDATE ""Transactions"" SET ""StoreId"" = '00000000-0000-0000-0000-000000000100' WHERE ""StoreId"" = '00000000-0000-0000-0000-000000000000';
");
```

> Alternatif: `StoreId` sütunlarını önce nullable olarak ekle, mevcut verileri güncelle, sonra NOT NULL constraint ekle. Bu daha güvenli bir migration stratejisidir. Claude Code migration dosyasını oluşturduktan sonra bunu değerlendirsin.

---

## ADIM 11 — Caddy Konfigürasyonu (Referans)

Bu adım sunucu tarafında uygulanır, kod değişikliği gerektirmez. Referans olarak:

```caddy
# defteri.app — uygulama subdomain'leri
*.defteri.app {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }

    reverse_proxy localhost:5000 {
        header_up X-Store-Slug {labels.3}
    }
}

# kuyumcudefteri.com — landing page ve login
kuyumcudefteri.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }

    # /api istekleri backend'e
    handle /api/* {
        reverse_proxy localhost:5000
    }

    # Geri kalan her şey frontend'e
    handle {
        reverse_proxy localhost:3000
    }
}
```

---

## ADIM 12 — Frontend Değişiklikleri (Özet)

> Bu adımlar ayrı bir frontend direktifinde detaylandırılabilir. Burada sadece yapılacaklar listeleniyor.

### 12.1 — Login Akışı Güncellemesi

1. Login response'tan `storeSlug` oku
2. Eğer kullanıcı `kuyumcudefteri.com` üzerinden giriş yaptıysa, login sonrası `{storeSlug}.defteri.app` adresine redirect yap:
   ```typescript
   const loginResponse = await authApi.login(credentials);
   const currentHost = window.location.hostname;

   if (currentHost === 'kuyumcudefteri.com' || currentHost === 'localhost') {
     // Token'ı URL ile taşı, hedef subdomain localStorage'a kaydetsin
     window.location.href = `https://${loginResponse.storeSlug}.defteri.app/auth/callback?token=${loginResponse.token}`;
   } else {
     // Zaten doğru subdomain'deyiz
     localStorage.setItem('token', loginResponse.token);
     navigate('/');
   }
   ```

### 12.2 — Auth Callback Sayfası

`/auth/callback` route'u oluştur:
- URL'den token'ı al
- localStorage'a kaydet
- AuthContext'i güncelle
- Ana sayfaya yönlendir

### 12.3 — Settings Context

Login sonrası `/api/settings` endpoint'inden mağaza ayarlarını çek ve React Context'e koy:

```typescript
// StoreSettingsContext.tsx
const [settings, setSettings] = useState<Record<string, string>>({});

useEffect(() => {
  if (isAuthenticated) {
    settingsApi.getAll().then(data => {
      const map: Record<string, string> = {};
      data.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    });
  }
}, [isAuthenticated]);

// Kullanım
const customerLabel = settings['ui.customer_label'] ?? 'Müşteri';
```

### 12.4 — Axios Interceptor Güncellemesi

Geliştirme ortamında (localhost) store slug'ı query string olarak ekle:

```typescript
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Geliştirme ortamında store bilgisini query string ile gönder
  if (window.location.hostname === 'localhost') {
    const storeSlug = localStorage.getItem('storeSlug') ?? 'demo';
    const url = new URL(config.url!, config.baseURL);
    url.searchParams.set('store', storeSlug);
    config.url = url.toString();
  }

  return config;
});
```

---

## ADIM 13 — SuperAdmin Seed

`AppDbContext.cs`'deki seed bölümüne SuperAdmin kullanıcısı ekle. Bu kullanıcı herhangi bir mağazaya bağlı olmayacak şekilde tasarlanabilir, ancak mevcut yapıda `StoreId` NOT NULL olduğu için varsayılan store'a bağla:

```csharp
private static void SeedSuperAdmin(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<User>().HasData(new User
    {
        Id           = Guid.Parse("00000000-0000-0000-0000-000000000002"),
        FullName     = "Platform Yöneticisi",
        Username     = "superadmin",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("super_secret_change_me"),
        Role         = UserRole.SuperAdmin,
        IsActive     = true,
        StoreId      = Guid.Parse("00000000-0000-0000-0000-000000000100")
    });
}
```

---

## ADIM 14 — Doğrulama

Tüm adımlar tamamlandıktan sonra:

### 14.1 — Build Kontrolü

```bash
cd kuyumcu-private/backend
dotnet build
```
→ Hatasız build olmalı.

### 14.2 — Migration Kontrolü

```bash
docker compose up postgres -d

dotnet ef database update \
  --project src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj \
  --startup-project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj
```
→ Migration başarıyla uygulanmalı.

### 14.3 — API Başlatma

```bash
dotnet run --project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj
```

### 14.4 — Test Senaryoları

**1. Health check (store resolution'dan muaf)**
```bash
curl http://localhost:5000/health
```
→ `{ "status": "ok" }`

**2. Login (store resolution'dan muaf)**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
→ Token + `storeSlug: "demo"` + `storeId` dönmeli

**3. Store parametresi ile müşteri listesi**
```bash
curl http://localhost:5000/api/customers?store=demo \
  -H "Authorization: Bearer <token>"
```
→ Mevcut müşteriler dönmeli (varsayılan store'a atanmış olanlar)

**4. SuperAdmin ile mağaza oluşturma**
```bash
# Önce superadmin ile login
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"username":"superadmin","password":"super_secret_change_me"}'

# Yeni mağaza oluştur
curl -X POST http://localhost:5000/api/platform/stores \
  -H "Authorization: Bearer <superadmin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Altınkral Kuyumculuk",
    "slug": "altinkral",
    "phone": "05551112233",
    "adminFullName": "Mehmet Altınkral",
    "adminUsername": "mehmet",
    "adminPassword": "guclu_sifre_123"
  }'
```
→ Store oluşturulmalı, admin kullanıcısı ve tüm asset type bağlantıları oluşturulmalı

**5. Yeni mağaza ile login ve izolasyon testi**
```bash
# Yeni mağaza admini ile login
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"username":"mehmet","password":"guclu_sifre_123"}'

# Bu token ile demo mağazanın müşterilerini görmeye çalış
curl http://localhost:5000/api/customers?store=demo \
  -H "Authorization: Bearer <altinkral-token>"
```
→ 403 dönmeli (store_id uyuşmazlığı)

**6. Mağaza ayarı ekle**
```bash
curl -X PUT http://localhost:5000/api/settings?store=altinkral \
  -H "Authorization: Bearer <altinkral-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"key":"ui.customer_label","value":"Alıcı","description":"Müşteri yerine Alıcı kullan"}'
```
→ Ayar kaydedilmeli

---

## Varsayılan Mağaza Ayarları (Referans)

Yeni mağaza oluşturulurken seed edilebilecek varsayılan ayarlar:

| Key | Default Value | Açıklama |
|-----|--------------|----------|
| `ui.customer_label` | `Müşteri` | Müşteri yerine kullanılacak etiket |
| `ui.report_title` | `Hesap Ekstresi` | Rapor başlığı |
| `ui.primary_color` | `#1a5276` | Mağaza tema rengi |
| `report.show_logo` | `true` | Raporlarda logo gösterilsin mi |
| `report.footer_text` | `""` | Rapor alt bilgi metni |
| `ui.currency_display` | `symbol` | Para birimi gösterim şekli (symbol/code) |

---

## Dosya Değişiklik Özeti

### Yeni Dosyalar
| Dosya | Açıklama |
|-------|----------|
| `Domain/Entities/Store.cs` | Mağaza entity |
| `Domain/Entities/StoreSetting.cs` | Mağaza ayar entity |
| `Domain/Entities/StoreAssetType.cs` | Mağaza-varlık ilişki entity |
| `Domain/Common/IStoreScoped.cs` | Store izolasyon interface |
| `Application/DTOs/Stores/StoreResponse.cs` | Store DTO |
| `Application/DTOs/Stores/StoreCreateRequest.cs` | Store oluşturma DTO |
| `Application/DTOs/Stores/StoreSettingResponse.cs` | Ayar DTO |
| `Application/DTOs/Stores/StoreSettingUpsertRequest.cs` | Ayar upsert DTO |
| `Application/Interfaces/ICurrentStoreContext.cs` | Store context interface |
| `Application/Interfaces/IStoreService.cs` | Store servis interface |
| `Application/Interfaces/IStoreSettingService.cs` | Ayar servis interface |
| `Infrastructure/Services/CurrentStoreContext.cs` | Store context impl |
| `Infrastructure/Services/StoreService.cs` | Store servis impl |
| `Infrastructure/Services/StoreSettingService.cs` | Ayar servis impl |
| `API/Middleware/StoreResolutionMiddleware.cs` | Subdomain → store_id middleware |
| `API/Middleware/StoreClaimValidationMiddleware.cs` | JWT-subdomain eşleşme kontrolü |
| `API/Endpoints/PlatformEndpoints.cs` | SuperAdmin endpoint'leri |
| `API/Endpoints/StoreSettingEndpoints.cs` | Mağaza ayar endpoint'leri |

### Güncellenen Dosyalar
| Dosya | Değişiklik |
|-------|-----------|
| `Domain/Entities/User.cs` | `StoreId` + `IStoreScoped` |
| `Domain/Entities/Customer.cs` | `StoreId` + `IStoreScoped` |
| `Domain/Entities/Balance.cs` | `StoreId` + `IStoreScoped` |
| `Domain/Entities/Transaction.cs` | `StoreId` + `IStoreScoped` |
| `Domain/Enums/UserRole.cs` | `SuperAdmin` rolü eklendi |
| `Application/DTOs/Auth/LoginResponse.cs` | `StoreSlug` + `StoreId` eklendi |
| `Infrastructure/Persistence/AppDbContext.cs` | Store DbSet'ler, FK'ler, global query filter, seed |
| `Infrastructure/Services/AuthService.cs` | JWT'ye `store_id` claim, response'a store bilgisi |
| `Infrastructure/Services/CustomerService.cs` | `ICurrentStoreContext` inject, create'de StoreId |
| `Infrastructure/Services/TransactionService.cs` | `ICurrentStoreContext` inject, create'lerde StoreId |
| `Infrastructure/DependencyInjection.cs` | Yeni servis kayıtları |
| `API/Program.cs` | Middleware sıralama, yeni policy, yeni endpoint'ler |

---

## Sonraki Adımlar (Bu Direktif Dışı)

1. **Frontend multi-tenant güncellemesi** — login akışı, subdomain redirect, settings context
2. **Landing page** — `kuyumcudefteri.com` için vitrin + login sayfası
3. **Mağaza admin paneli** — ayar yönetimi, kullanıcı yönetimi, logo yükleme
4. **Abonelik yönetimi** — ödeme entegrasyonu, plan limitleri
5. **Modül 2 (Günlük İşlem Defteri)** — mağaza operasyonları
