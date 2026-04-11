# Kuyumcu Özel Cari Sistemi — Faz 1 Başlangıç Direktifi

## Bağlam

Bu direktif, bir kuyumcu işletmesi için geliştirilen **Cihaz B / Özel Cari Sistemi**'nin Faz 1 kodlamasını başlatmak için hazırlanmıştır. Sistem tamamen lokal çalışacak, Docker ile paketlenecek ve dışarıya hiçbir bağımlılığı olmayacaktır.

### Teknik Kararlar (değiştirme)
- **Backend:** .NET 10 Minimal API, Clean Architecture (hafif)
- **Veritabanı:** PostgreSQL (Docker container)
- **Frontend:** React + Vite + TypeScript
- **ORM:** Entity Framework Core 10
- **Paketleme:** Docker Compose
- **Dil:** Tüm kod İngilizce, yorumlar Türkçe olabilir

---

## Adım 1 — Solution ve Klasör Yapısı

Aşağıdaki yapıyı oluştur. Hiçbir dosyayı atlama.

```
kuyumcu-private/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── KuyumcuPrivate.sln
│   ├── src/
│   │   ├── KuyumcuPrivate.Domain/
│   │   │   └── KuyumcuPrivate.Domain.csproj
│   │   ├── KuyumcuPrivate.Application/
│   │   │   └── KuyumcuPrivate.Application.csproj
│   │   ├── KuyumcuPrivate.Infrastructure/
│   │   │   └── KuyumcuPrivate.Infrastructure.csproj
│   │   └── KuyumcuPrivate.API/
│   │       └── KuyumcuPrivate.API.csproj
│   └── KuyumcuPrivate.sln
└── frontend/
    └── (Vite scaffold — sonraki adımda)
```

### Komutlar

```bash
mkdir -p kuyumcu-private/backend/src
cd kuyumcu-private/backend

dotnet new sln -n KuyumcuPrivate

dotnet new classlib -n KuyumcuPrivate.Domain       -o src/KuyumcuPrivate.Domain       --framework net10.0
dotnet new classlib -n KuyumcuPrivate.Application  -o src/KuyumcuPrivate.Application  --framework net10.0
dotnet new classlib -n KuyumcuPrivate.Infrastructure -o src/KuyumcuPrivate.Infrastructure --framework net10.0
dotnet new webapi   -n KuyumcuPrivate.API          -o src/KuyumcuPrivate.API          --framework net10.0

dotnet sln add src/KuyumcuPrivate.Domain/KuyumcuPrivate.Domain.csproj
dotnet sln add src/KuyumcuPrivate.Application/KuyumcuPrivate.Application.csproj
dotnet sln add src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj
dotnet sln add src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj

# Proje referansları
dotnet add src/KuyumcuPrivate.Application/KuyumcuPrivate.Application.csproj reference src/KuyumcuPrivate.Domain/KuyumcuPrivate.Domain.csproj
dotnet add src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj reference src/KuyumcuPrivate.Application/KuyumcuPrivate.Application.csproj
dotnet add src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj reference src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj
dotnet add src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj reference src/KuyumcuPrivate.Application/KuyumcuPrivate.Application.csproj
```

---

## Adım 2 — NuGet Paketleri

```bash
# Infrastructure
dotnet add src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj package Microsoft.EntityFrameworkCore
dotnet add src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj package Microsoft.EntityFrameworkCore.Design

# API
dotnet add src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj package Microsoft.EntityFrameworkCore.Design
```

---

## Adım 3 — Domain Katmanı Entity'leri

Aşağıdaki dosyaları `src/KuyumcuPrivate.Domain/` altında oluştur.

### 3.1 — Enums

**`Enums/UnitType.cs`**
```csharp
namespace KuyumcuPrivate.Domain.Enums;

public enum UnitType
{
    Currency,  // Para birimi (TL, USD, EUR, GBP)
    Piece,     // Adet bazlı (çeyrek, yarım, ata, beşli, gremse)
    Gram       // Gram bazlı (22 ayar, 24 ayar, gümüş)
}
```

**`Enums/TransactionType.cs`**
```csharp
namespace KuyumcuPrivate.Domain.Enums;

public enum TransactionType
{
    Deposit,     // Yatırma — müşteri hesabına varlık ekler
    Withdrawal,  // Çekme — müşteri hesabından varlık çıkar
    Conversion   // Dönüşüm — hesap içi varlık değişimi (virman)
}
```

**`Enums/RateSource.cs`**
```csharp
namespace KuyumcuPrivate.Domain.Enums;

public enum RateSource
{
    Manual, // Kullanıcı tarafından girildi
    Auto    // API'den otomatik çekildi (Faz 2)
}
```

**`Enums/UserRole.cs`**
```csharp
namespace KuyumcuPrivate.Domain.Enums;

public enum UserRole
{
    Admin, // Tüm işlemlere erişim
    Staff  // Günlük işlemler — yönetim paneline erişim yok
}
```

### 3.2 — Base Entity

**`Common/BaseEntity.cs`**
```csharp
namespace KuyumcuPrivate.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
}
```

### 3.3 — Entity Sınıfları

**`Entities/User.cs`**
```csharp
using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Staff;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Transaction> Transactions { get; set; } = [];
}
```

**`Entities/Customer.cs`**
```csharp
using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

public class Customer : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? NationalId { get; set; }   // TC kimlik — aynı isimli müşterileri ayırt eder
    public byte[]? Photo { get; set; }         // Fotoğraf binary olarak saklanır
    public string? Notes { get; set; }         // Genel müşteri notu — serbest metin
    public bool IsDeleted { get; set; } = false; // Soft delete
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Balance> Balances { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
}
```

**`Entities/AssetType.cs`**
```csharp
using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

// Varlık birimi tanımları — veritabanında yönetilir, sabit kodlanmaz
public class AssetType : BaseEntity
{
    public string Code { get; set; } = string.Empty;      // Örn: CEYREK, GBP, GOLD22
    public string Name { get; set; } = string.Empty;      // Örn: Çeyrek Altın, Sterlin
    public UnitType UnitType { get; set; }
    public int? Karat { get; set; }                        // Altınlar için: 22 veya 24
    public decimal? GramWeight { get; set; }               // Referans ağırlık — gram bazlı rapor için
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;               // UI sıralama

    // Navigation
    public ICollection<Balance> Balances { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
}
```

**`Entities/Balance.cs`**
```csharp
using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

// Müşteri bazında anlık bakiye — her işlemden sonra güncellenir
public class Balance : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Guid AssetTypeId { get; set; }
    public decimal Amount { get; set; } = 0;   // Ondalıklı — 13.07 çeyrek yazılabilir
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Customer Customer { get; set; } = null!;
    public AssetType AssetType { get; set; } = null!;
}
```

**`Entities/Transaction.cs`**
```csharp
using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

public class Transaction : BaseEntity
{
    public Guid CustomerId { get; set; }
    public TransactionType Type { get; set; }

    // Deposit ve Withdrawal için dolu, Conversion için null — detay conversions tablosunda
    public Guid? AssetTypeId { get; set; }
    public decimal? Amount { get; set; }

    public string? Description { get; set; }  // Serbest açıklama — "eniştesi geldi" tarzı
    public Guid CreatedBy { get; set; }        // İşlemi yapan kullanıcı
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsCancelled { get; set; } = false;  // Soft delete — işlem silinmez, iptal edilir
    public string? CancelReason { get; set; }

    // Navigation
    public Customer Customer { get; set; } = null!;
    public AssetType? AssetType { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public Conversion? Conversion { get; set; }
}
```

**`Entities/Conversion.cs`**
```csharp
using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

// Virman / dönüşüm detayı — her zaman TL ara birim olarak kullanılır
// Örnek: 500 GBP → çeyrek altın
//   from_rate_try : 1 GBP = 42.30 TL
//   try_equivalent: 21.150 TL
//   to_rate_try   : 1 çeyrek = 1.620 TL
//   to_amount     : 13.06 çeyrek
public class Conversion : BaseEntity
{
    public Guid TransactionId { get; set; }

    public Guid FromAssetId { get; set; }
    public decimal FromAmount { get; set; }
    public decimal FromRateTry { get; set; }    // Kaynak varlığın TL kuru

    public decimal TryEquivalent { get; set; }  // Ara TL tutarı — kayıt ve raporlama için

    public Guid ToAssetId { get; set; }
    public decimal ToAmount { get; set; }
    public decimal ToRateTry { get; set; }      // Hedef varlığın TL kuru

    public RateSource RateSource { get; set; } = RateSource.Manual;
    public string? RateNote { get; set; }       // Örn: "Borsa kapanış kuru", "Anlaşmalı kur"

    // Navigation
    public Transaction Transaction { get; set; } = null!;
    public AssetType FromAsset { get; set; } = null!;
    public AssetType ToAsset { get; set; } = null!;
}
```

---

## Adım 4 — Infrastructure: DbContext

**`src/KuyumcuPrivate.Infrastructure/Persistence/AppDbContext.cs`**

```csharp
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<AssetType> AssetTypes => Set<AssetType>();
    public DbSet<Balance> Balances => Set<Balance>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Conversion> Conversions => Set<Conversion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Role).HasConversion<string>();
        });

        // Customer
        modelBuilder.Entity<Customer>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasQueryFilter(x => !x.IsDeleted); // Soft delete global filtresi
        });

        // AssetType
        modelBuilder.Entity<AssetType>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.UnitType).HasConversion<string>();
            e.Property(x => x.GramWeight).HasPrecision(10, 4);
        });

        // Balance — bir müşterinin her varlık biriminden tek satırı olur
        modelBuilder.Entity<Balance>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CustomerId, x.AssetTypeId }).IsUnique();
            e.Property(x => x.Amount).HasPrecision(18, 6);
            e.HasOne(x => x.Customer).WithMany(x => x.Balances).HasForeignKey(x => x.CustomerId);
            e.HasOne(x => x.AssetType).WithMany(x => x.Balances).HasForeignKey(x => x.AssetTypeId);
        });

        // Transaction
        modelBuilder.Entity<Transaction>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Type).HasConversion<string>();
            e.Property(x => x.Amount).HasPrecision(18, 6);
            e.HasOne(x => x.Customer).WithMany(x => x.Transactions).HasForeignKey(x => x.CustomerId);
            e.HasOne(x => x.AssetType).WithMany(x => x.Transactions).HasForeignKey(x => x.AssetTypeId).IsRequired(false);
            e.HasOne(x => x.CreatedByUser).WithMany(x => x.Transactions).HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        });

        // Conversion
        modelBuilder.Entity<Conversion>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.FromAmount).HasPrecision(18, 6);
            e.Property(x => x.FromRateTry).HasPrecision(18, 6);
            e.Property(x => x.TryEquivalent).HasPrecision(18, 6);
            e.Property(x => x.ToAmount).HasPrecision(18, 6);
            e.Property(x => x.ToRateTry).HasPrecision(18, 6);
            e.Property(x => x.RateSource).HasConversion<string>();
            e.HasOne(x => x.Transaction).WithOne(x => x.Conversion).HasForeignKey<Conversion>(x => x.TransactionId);
            e.HasOne(x => x.FromAsset).WithMany().HasForeignKey(x => x.FromAssetId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ToAsset).WithMany().HasForeignKey(x => x.ToAssetId).OnDelete(DeleteBehavior.Restrict);
        });

        // Seed: Varsayılan varlık birimleri
        SeedAssetTypes(modelBuilder);
    }

    private static void SeedAssetTypes(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AssetType>().HasData(
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Code = "TRY",    Name = "Türk Lirası",    UnitType = UnitType.Currency, SortOrder = 1 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Code = "USD",    Name = "Dolar",          UnitType = UnitType.Currency, SortOrder = 2 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000003"), Code = "EUR",    Name = "Euro",           UnitType = UnitType.Currency, SortOrder = 3 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000004"), Code = "GBP",    Name = "Sterlin",        UnitType = UnitType.Currency, SortOrder = 4 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000005"), Code = "GOLD22", Name = "22 Ayar Altın",  UnitType = UnitType.Gram,     Karat = 22, GramWeight = 1m,     SortOrder = 5 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000006"), Code = "GOLD24", Name = "24 Ayar Altın",  UnitType = UnitType.Gram,     Karat = 24, GramWeight = 1m,     SortOrder = 6 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000007"), Code = "CEYREK", Name = "Çeyrek Altın",   UnitType = UnitType.Piece,    Karat = 22, GramWeight = 1.75m,  SortOrder = 7 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000008"), Code = "YARIM",  Name = "Yarım Altın",    UnitType = UnitType.Piece,    Karat = 22, GramWeight = 3.50m,  SortOrder = 8 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000009"), Code = "LIRA",   Name = "Tam Altın",      UnitType = UnitType.Piece,    Karat = 22, GramWeight = 7.02m,  SortOrder = 9 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000010"), Code = "ATA",    Name = "Ata Altın",      UnitType = UnitType.Piece,    Karat = 22, GramWeight = 7.21m,  SortOrder = 10 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000011"), Code = "GREMSE", Name = "Gremse Altın",   UnitType = UnitType.Piece,    Karat = 22, GramWeight = 17.54m, SortOrder = 11 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000012"), Code = "BESLI",  Name = "Beşli Altın",    UnitType = UnitType.Piece,    Karat = 22, GramWeight = 35.08m, SortOrder = 12 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000013"), Code = "SILVER", Name = "Gümüş",          UnitType = UnitType.Gram,     GramWeight = 1m,                 SortOrder = 13 }
        );
    }
}
```

---

## Adım 5 — API: appsettings ve Program.cs

**`src/KuyumcuPrivate.API/appsettings.json`** içindeki connection string bölümünü şu şekilde güncelle:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=kuyumcu_private;Username=kuyumcu;Password=changeme"
  },
  "AllowedHosts": "*"
}
```

**`src/KuyumcuPrivate.API/Program.cs`** dosyasını tamamen şu şekilde yaz:

```csharp
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS — React frontend lokal ağdan erişecek
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Uygulama başlarken migration otomatik uygula
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
```

---

## Adım 6 — İlk Migration

```bash
cd backend

dotnet ef migrations add InitialCreate \
  --project src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj \
  --startup-project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj \
  --output-dir Persistence/Migrations
```

> Migration oluşturmak için PostgreSQL bağlantısı gerekmez — sadece modelin doğru olması yeterlidir.

---

## Adım 7 — Docker Compose

Kök dizinde `docker-compose.yml` oluştur:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: kuyumcu_private_db
    environment:
      POSTGRES_DB: kuyumcu_private
      POSTGRES_USER: kuyumcu
      POSTGRES_PASSWORD: changeme
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: kuyumcu_private_api
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=kuyumcu_private;Username=kuyumcu;Password=changeme
    ports:
      - "5000:8080"
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

Kök dizinde `.env.example` oluştur:

```env
POSTGRES_PASSWORD=changeme
```

---

## Adım 8 — Dockerfile (Backend)

`backend/Dockerfile` oluştur:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj", "src/KuyumcuPrivate.API/"]
COPY ["src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj", "src/KuyumcuPrivate.Infrastructure/"]
COPY ["src/KuyumcuPrivate.Application/KuyumcuPrivate.Application.csproj", "src/KuyumcuPrivate.Application/"]
COPY ["src/KuyumcuPrivate.Domain/KuyumcuPrivate.Domain.csproj", "src/KuyumcuPrivate.Domain/"]
RUN dotnet restore "src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj"
COPY . .
RUN dotnet publish "src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "KuyumcuPrivate.API.dll"]
```

---

## Adım 9 — Doğrulama

Tüm adımlar tamamlandıktan sonra şunu çalıştır:

```bash
# PostgreSQL container'ı başlat
docker compose up postgres -d

# API'yi geliştirme modunda çalıştır
cd backend
dotnet run --project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj

# Swagger UI'a git
# http://localhost:5000/swagger

# Health check
curl http://localhost:5000/health
```

Beklenen çıktı:
```json
{ "status": "ok", "timestamp": "..." }
```

Veritabanında şu tabloların oluşmuş olması gerekir:
- `users`
- `customers`
- `asset_types` (13 kayıt seed edilmiş)
- `balances`
- `transactions`
- `conversions`

---

## Sonraki Adım (Faz 1 devamı)

Bu direktif tamamlandıktan sonra şu konuları sırasıyla ele alacağız:

1. **Authentication** — JWT tabanlı, kullanıcı girişi, role-based erişim
2. **Customer endpoint'leri** — CRUD, fotoğraf yükleme
3. **Transaction endpoint'leri** — deposit, withdrawal, conversion iş mantığı
4. **Balance güncelleme servisi** — işlem sonrası otomatik bakiye hesabı
5. **React frontend** — Vite scaffold, müşteri listesi, hareket ekranı
