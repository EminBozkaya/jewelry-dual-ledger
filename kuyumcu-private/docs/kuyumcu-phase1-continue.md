# Kuyumcu Özel Cari Sistemi — Faz 1 Devam Direktifi

## Ön Koşul

Bu direktife geçmeden önce `kuyumcu-phase1-start.md` eksiksiz tamamlanmış olmalı:
- Solution yapısı kuruldu
- Tüm entity'ler oluşturuldu
- `AppDbContext` yazıldı
- Migration oluşturuldu
- `docker compose up postgres -d` çalışıyor
- `/health` endpoint'i 200 dönüyor

---

## Adım 10 — NuGet: Authentication Paketleri

```bash
cd backend

dotnet add src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj package System.IdentityModel.Tokens.Jwt
dotnet add src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj package BCrypt.Net-Next
```

---

## Adım 11 — appsettings: JWT Ayarları

`src/KuyumcuPrivate.API/appsettings.json` dosyasına JWT bloğunu ekle:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=kuyumcu_private;Username=kuyumcu;Password=changeme"
  },
  "Jwt": {
    "Key": "BURAYA_EN_AZ_32_KARAKTER_GIZLI_ANAHTAR_YAZ",
    "Issuer": "kuyumcu-private",
    "Audience": "kuyumcu-private-client",
    "ExpiryHours": 12
  },
  "AllowedHosts": "*"
}
```

> `Key` değeri production'da güçlü ve rastgele olmalı. Geliştirme ortamında `dotnet user-secrets` ile saklanabilir.

---

## Adım 12 — Application Katmanı: DTOs ve Servis Arayüzleri

### 12.1 — Auth DTOs

**`src/KuyumcuPrivate.Application/DTOs/Auth/LoginRequest.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Auth;

public record LoginRequest(string Username, string Password);
```

**`src/KuyumcuPrivate.Application/DTOs/Auth/LoginResponse.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Auth;

public record LoginResponse(
    string Token,
    string FullName,
    string Role,
    DateTime ExpiresAt
);
```

### 12.2 — Customer DTOs

**`src/KuyumcuPrivate.Application/DTOs/Customers/CustomerCreateRequest.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Customers;

public record CustomerCreateRequest(
    string FirstName,
    string LastName,
    string Phone,
    string? Address,
    string? Email,
    string? NationalId,
    string? Notes
);
```

**`src/KuyumcuPrivate.Application/DTOs/Customers/CustomerResponse.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Customers;

public record CustomerResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string Phone,
    string? Address,
    string? Email,
    string? NationalId,
    string? Notes,
    bool HasPhoto,
    DateTime CreatedAt
);
```

**`src/KuyumcuPrivate.Application/DTOs/Customers/CustomerUpdateRequest.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Customers;

public record CustomerUpdateRequest(
    string FirstName,
    string LastName,
    string Phone,
    string? Address,
    string? Email,
    string? NationalId,
    string? Notes
);
```

### 12.3 — Transaction DTOs

**`src/KuyumcuPrivate.Application/DTOs/Transactions/DepositRequest.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Transactions;

public record DepositRequest(
    Guid CustomerId,
    Guid AssetTypeId,
    decimal Amount,
    string? Description
);
```

**`src/KuyumcuPrivate.Application/DTOs/Transactions/WithdrawalRequest.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Transactions;

public record WithdrawalRequest(
    Guid CustomerId,
    Guid AssetTypeId,
    decimal Amount,
    string? Description
);
```

**`src/KuyumcuPrivate.Application/DTOs/Transactions/ConversionRequest.cs`**
```csharp
namespace KuyumcuPrivate.Application.DTOs.Transactions;

// Dönüşüm her zaman TL üzerinden yapılır.
// Örnek: 500 GBP → çeyrek
//   FromAssetTypeId = GBP id
//   FromAmount      = 500
//   FromRateTry     = 42.30  (1 GBP = 42.30 TL)
//   ToAssetTypeId   = CEYREK id
//   ToRateTry       = 1620   (1 çeyrek = 1620 TL)
//   ToAmount sistem tarafından hesaplanır: (500 * 42.30) / 1620 = 13.06
public record ConversionRequest(
    Guid CustomerId,
    Guid FromAssetTypeId,
    decimal FromAmount,
    decimal FromRateTry,
    Guid ToAssetTypeId,
    decimal ToRateTry,
    string? Description,
    string? RateNote
);
```

**`src/KuyumcuPrivate.Application/DTOs/Transactions/TransactionResponse.cs`**
```csharp
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Transactions;

public record TransactionResponse(
    Guid Id,
    Guid CustomerId,
    string CustomerFullName,
    TransactionType Type,
    string? AssetTypeCode,
    string? AssetTypeName,
    decimal? Amount,
    string? Description,
    string CreatedByFullName,
    DateTime CreatedAt,
    bool IsCancelled,
    string? CancelReason,
    ConversionDetail? Conversion
);

public record ConversionDetail(
    string FromAssetCode,
    string FromAssetName,
    decimal FromAmount,
    decimal FromRateTry,
    decimal TryEquivalent,
    string ToAssetCode,
    string ToAssetName,
    decimal ToAmount,
    decimal ToRateTry,
    string RateSource,
    string? RateNote
);
```

### 12.4 — Balance DTO

**`src/KuyumcuPrivate.Application/DTOs/Balances/BalanceResponse.cs`**
```csharp
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Balances;

public record BalanceResponse(
    Guid AssetTypeId,
    string AssetTypeCode,
    string AssetTypeName,
    UnitType UnitType,
    decimal Amount
);
```

### 12.5 — Servis Arayüzleri

**`src/KuyumcuPrivate.Application/Interfaces/IAuthService.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Auth;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}
```

**`src/KuyumcuPrivate.Application/Interfaces/ICustomerService.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Customers;

namespace KuyumcuPrivate.Application.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerResponse>> GetAllAsync();
    Task<CustomerResponse?> GetByIdAsync(Guid id);
    Task<CustomerResponse> CreateAsync(CustomerCreateRequest request);
    Task<CustomerResponse?> UpdateAsync(Guid id, CustomerUpdateRequest request);
    Task<bool> DeleteAsync(Guid id);                          // Soft delete
    Task<bool> UploadPhotoAsync(Guid id, byte[] photoBytes);
    Task<byte[]?> GetPhotoAsync(Guid id);
}
```

**`src/KuyumcuPrivate.Application/Interfaces/ITransactionService.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Transactions;

namespace KuyumcuPrivate.Application.Interfaces;

public interface ITransactionService
{
    Task<TransactionResponse> DepositAsync(DepositRequest request, Guid userId);
    Task<TransactionResponse> WithdrawAsync(WithdrawalRequest request, Guid userId);
    Task<TransactionResponse> ConvertAsync(ConversionRequest request, Guid userId);
    Task<List<TransactionResponse>> GetByCustomerAsync(Guid customerId);
    Task<bool> CancelAsync(Guid transactionId, string reason, Guid userId);
}
```

---

## Adım 13 — Infrastructure: Servis Implementasyonları

### 13.1 — AuthService

**`src/KuyumcuPrivate.Infrastructure/Services/AuthService.cs`**
```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KuyumcuPrivate.Application.DTOs.Auth;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace KuyumcuPrivate.Infrastructure.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        var expiryHours = config.GetValue<int>("Jwt:ExpiryHours");
        var expiresAt = DateTime.UtcNow.AddHours(expiryHours);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return new LoginResponse(
            Token: new JwtSecurityTokenHandler().WriteToken(token),
            FullName: user.FullName,
            Role: user.Role.ToString(),
            ExpiresAt: expiresAt
        );
    }
}
```

### 13.2 — CustomerService

**`src/KuyumcuPrivate.Infrastructure/Services/CustomerService.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class CustomerService(AppDbContext db) : ICustomerService
{
    public async Task<List<CustomerResponse>> GetAllAsync()
    {
        return await db.Customers
            .OrderBy(c => c.LastName).ThenBy(c => c.FirstName)
            .Select(c => ToResponse(c))
            .ToListAsync();
    }

    public async Task<CustomerResponse?> GetByIdAsync(Guid id)
    {
        var c = await db.Customers.FindAsync(id);
        return c is null ? null : ToResponse(c);
    }

    public async Task<CustomerResponse> CreateAsync(CustomerCreateRequest request)
    {
        var customer = new Customer
        {
            FirstName  = request.FirstName.Trim(),
            LastName   = request.LastName.Trim(),
            Phone      = request.Phone.Trim(),
            Address    = request.Address?.Trim(),
            Email      = request.Email?.Trim(),
            NationalId = request.NationalId?.Trim(),
            Notes      = request.Notes?.Trim()
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        return ToResponse(customer);
    }

    public async Task<CustomerResponse?> UpdateAsync(Guid id, CustomerUpdateRequest request)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return null;

        customer.FirstName  = request.FirstName.Trim();
        customer.LastName   = request.LastName.Trim();
        customer.Phone      = request.Phone.Trim();
        customer.Address    = request.Address?.Trim();
        customer.Email      = request.Email?.Trim();
        customer.NationalId = request.NationalId?.Trim();
        customer.Notes      = request.Notes?.Trim();

        await db.SaveChangesAsync();
        return ToResponse(customer);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return false;

        customer.IsDeleted = true; // Soft delete — kayıt silinmez
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UploadPhotoAsync(Guid id, byte[] photoBytes)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return false;

        customer.Photo = photoBytes;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]?> GetPhotoAsync(Guid id)
    {
        var customer = await db.Customers.FindAsync(id);
        return customer?.Photo;
    }

    private static CustomerResponse ToResponse(Customer c) => new(
        Id:          c.Id,
        FirstName:   c.FirstName,
        LastName:    c.LastName,
        FullName:    $"{c.FirstName} {c.LastName}",
        Phone:       c.Phone,
        Address:     c.Address,
        Email:       c.Email,
        NationalId:  c.NationalId,
        Notes:       c.Notes,
        HasPhoto:    c.Photo is not null,
        CreatedAt:   c.CreatedAt
    );
}
```

### 13.3 — TransactionService

**`src/KuyumcuPrivate.Infrastructure/Services/TransactionService.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Transactions;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class TransactionService(AppDbContext db) : ITransactionService
{
    // ── Yatırma ──────────────────────────────────────────────────────────────
    public async Task<TransactionResponse> DepositAsync(DepositRequest request, Guid userId)
    {
        var transaction = new Transaction
        {
            CustomerId   = request.CustomerId,
            Type         = TransactionType.Deposit,
            AssetTypeId  = request.AssetTypeId,
            Amount       = request.Amount,
            Description  = request.Description,
            CreatedBy    = userId
        };

        db.Transactions.Add(transaction);
        await UpdateBalanceAsync(request.CustomerId, request.AssetTypeId, request.Amount);
        await db.SaveChangesAsync();

        return await BuildResponseAsync(transaction.Id);
    }

    // ── Çekme ────────────────────────────────────────────────────────────────
    public async Task<TransactionResponse> WithdrawAsync(WithdrawalRequest request, Guid userId)
    {
        // Bakiye kontrolü
        var balance = await db.Balances.FirstOrDefaultAsync(b =>
            b.CustomerId == request.CustomerId &&
            b.AssetTypeId == request.AssetTypeId);

        if (balance is null || balance.Amount < request.Amount)
            throw new InvalidOperationException(
                $"Yetersiz bakiye. Mevcut: {balance?.Amount ?? 0}, İstenen: {request.Amount}");

        var transaction = new Transaction
        {
            CustomerId  = request.CustomerId,
            Type        = TransactionType.Withdrawal,
            AssetTypeId = request.AssetTypeId,
            Amount      = request.Amount,
            Description = request.Description,
            CreatedBy   = userId
        };

        db.Transactions.Add(transaction);
        await UpdateBalanceAsync(request.CustomerId, request.AssetTypeId, -request.Amount);
        await db.SaveChangesAsync();

        return await BuildResponseAsync(transaction.Id);
    }

    // ── Dönüşüm (Virman) ─────────────────────────────────────────────────────
    public async Task<TransactionResponse> ConvertAsync(ConversionRequest request, Guid userId)
    {
        // Kaynak bakiye kontrolü
        var fromBalance = await db.Balances.FirstOrDefaultAsync(b =>
            b.CustomerId == request.CustomerId &&
            b.AssetTypeId == request.FromAssetTypeId);

        if (fromBalance is null || fromBalance.Amount < request.FromAmount)
            throw new InvalidOperationException(
                $"Yetersiz bakiye. Mevcut: {fromBalance?.Amount ?? 0}, İstenen: {request.FromAmount}");

        // TL üzerinden hesaplama
        var tryEquivalent = request.FromAmount * request.FromRateTry;
        var toAmount      = Math.Round(tryEquivalent / request.ToRateTry, 6);

        var transaction = new Transaction
        {
            CustomerId  = request.CustomerId,
            Type        = TransactionType.Conversion,
            Description = request.Description,
            CreatedBy   = userId
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(); // Id oluşsun

        var conversion = new Conversion
        {
            TransactionId  = transaction.Id,
            FromAssetId    = request.FromAssetTypeId,
            FromAmount     = request.FromAmount,
            FromRateTry    = request.FromRateTry,
            TryEquivalent  = tryEquivalent,
            ToAssetId      = request.ToAssetTypeId,
            ToAmount       = toAmount,
            ToRateTry      = request.ToRateTry,
            RateSource     = RateSource.Manual,
            RateNote       = request.RateNote
        };

        db.Conversions.Add(conversion);

        // Bakiyeleri güncelle — kaynak azalır, hedef artar
        await UpdateBalanceAsync(request.CustomerId, request.FromAssetTypeId, -request.FromAmount);
        await UpdateBalanceAsync(request.CustomerId, request.ToAssetTypeId, toAmount);

        await db.SaveChangesAsync();

        return await BuildResponseAsync(transaction.Id);
    }

    // ── Müşteri Hareket Geçmişi ───────────────────────────────────────────────
    public async Task<List<TransactionResponse>> GetByCustomerAsync(Guid customerId)
    {
        var ids = await db.Transactions
            .Where(t => t.CustomerId == customerId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => t.Id)
            .ToListAsync();

        var result = new List<TransactionResponse>();
        foreach (var id in ids)
            result.Add(await BuildResponseAsync(id));

        return result;
    }

    // ── İptal ─────────────────────────────────────────────────────────────────
    public async Task<bool> CancelAsync(Guid transactionId, string reason, Guid userId)
    {
        var transaction = await db.Transactions
            .Include(t => t.Conversion)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction is null || transaction.IsCancelled) return false;

        // Bakiyeleri geri al
        if (transaction.Type == TransactionType.Deposit)
            await UpdateBalanceAsync(transaction.CustomerId, transaction.AssetTypeId!.Value, -transaction.Amount!.Value);
        else if (transaction.Type == TransactionType.Withdrawal)
            await UpdateBalanceAsync(transaction.CustomerId, transaction.AssetTypeId!.Value, transaction.Amount!.Value);
        else if (transaction.Type == TransactionType.Conversion && transaction.Conversion is not null)
        {
            await UpdateBalanceAsync(transaction.CustomerId, transaction.Conversion.FromAssetId, transaction.Conversion.FromAmount);
            await UpdateBalanceAsync(transaction.CustomerId, transaction.Conversion.ToAssetId, -transaction.Conversion.ToAmount);
        }

        transaction.IsCancelled  = true;
        transaction.CancelReason = reason;
        await db.SaveChangesAsync();
        return true;
    }

    // ── Yardımcı: Bakiye Güncelle ─────────────────────────────────────────────
    private async Task UpdateBalanceAsync(Guid customerId, Guid assetTypeId, decimal delta)
    {
        var balance = await db.Balances.FirstOrDefaultAsync(b =>
            b.CustomerId == customerId &&
            b.AssetTypeId == assetTypeId);

        if (balance is null)
        {
            balance = new Balance
            {
                CustomerId  = customerId,
                AssetTypeId = assetTypeId,
                Amount      = 0
            };
            db.Balances.Add(balance);
        }

        balance.Amount    += delta;
        balance.UpdatedAt  = DateTime.UtcNow;
    }

    // ── Yardımcı: Response Oluştur ────────────────────────────────────────────
    private async Task<TransactionResponse> BuildResponseAsync(Guid id)
    {
        var t = await db.Transactions
            .Include(x => x.Customer)
            .Include(x => x.AssetType)
            .Include(x => x.CreatedByUser)
            .Include(x => x.Conversion)
                .ThenInclude(c => c!.FromAsset)
            .Include(x => x.Conversion)
                .ThenInclude(c => c!.ToAsset)
            .FirstAsync(x => x.Id == id);

        ConversionDetail? convDetail = null;
        if (t.Conversion is not null)
        {
            convDetail = new ConversionDetail(
                FromAssetCode: t.Conversion.FromAsset.Code,
                FromAssetName: t.Conversion.FromAsset.Name,
                FromAmount:    t.Conversion.FromAmount,
                FromRateTry:   t.Conversion.FromRateTry,
                TryEquivalent: t.Conversion.TryEquivalent,
                ToAssetCode:   t.Conversion.ToAsset.Code,
                ToAssetName:   t.Conversion.ToAsset.Name,
                ToAmount:      t.Conversion.ToAmount,
                ToRateTry:     t.Conversion.ToRateTry,
                RateSource:    t.Conversion.RateSource.ToString(),
                RateNote:      t.Conversion.RateNote
            );
        }

        return new TransactionResponse(
            Id:                 t.Id,
            CustomerId:         t.CustomerId,
            CustomerFullName:   $"{t.Customer.FirstName} {t.Customer.LastName}",
            Type:               t.Type,
            AssetTypeCode:      t.AssetType?.Code,
            AssetTypeName:      t.AssetType?.Name,
            Amount:             t.Amount,
            Description:        t.Description,
            CreatedByFullName:  t.CreatedByUser.FullName,
            CreatedAt:          t.CreatedAt,
            IsCancelled:        t.IsCancelled,
            CancelReason:       t.CancelReason,
            Conversion:         convDetail
        );
    }
}
```

---

## Adım 14 — DI Kaydı ve Program.cs Güncellemesi

**`src/KuyumcuPrivate.Infrastructure/DependencyInjection.cs`** oluştur:

```csharp
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KuyumcuPrivate.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ITransactionService, TransactionService>();
        return services;
    }
}
```

**`src/KuyumcuPrivate.API/Program.cs`** dosyasını tamamen şu şekilde yeniden yaz:

```csharp
using System.Text;
using KuyumcuPrivate.Infrastructure;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Veritabanı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Servisler
builder.Services.AddInfrastructure();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// CORS — React frontend lokal ağdan erişecek
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Migration otomatik uygula
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Endpoint'leri kaydet
app.MapAuthEndpoints();
app.MapCustomerEndpoints();
app.MapTransactionEndpoints();
app.MapBalanceEndpoints();
app.MapAssetTypeEndpoints();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
```

---

## Adım 15 — Endpoint Dosyaları

Her endpoint grubu ayrı bir dosyada tanımlanacak. Hepsini `src/KuyumcuPrivate.API/Endpoints/` klasörüne oluştur.

### 15.1 — Auth Endpoints

**`Endpoints/AuthEndpoints.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Auth;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        // POST /api/auth/login
        group.MapPost("/login", async (LoginRequest request, IAuthService authService) =>
        {
            var result = await authService.LoginAsync(request);
            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        }).AllowAnonymous();
    }
}
```

### 15.2 — Customer Endpoints

**`Endpoints/CustomerEndpoints.cs`**
```csharp
using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class CustomerEndpoints
{
    public static void MapCustomerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/customers").WithTags("Customers").RequireAuthorization();

        // GET /api/customers
        group.MapGet("/", async (ICustomerService svc) =>
            Results.Ok(await svc.GetAllAsync()));

        // GET /api/customers/{id}
        group.MapGet("/{id:guid}", async (Guid id, ICustomerService svc) =>
        {
            var customer = await svc.GetByIdAsync(id);
            return customer is null ? Results.NotFound() : Results.Ok(customer);
        });

        // POST /api/customers
        group.MapPost("/", async (CustomerCreateRequest request, ICustomerService svc) =>
        {
            var created = await svc.CreateAsync(request);
            return Results.Created($"/api/customers/{created.Id}", created);
        });

        // PUT /api/customers/{id}
        group.MapPut("/{id:guid}", async (Guid id, CustomerUpdateRequest request, ICustomerService svc) =>
        {
            var updated = await svc.UpdateAsync(id, request);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // DELETE /api/customers/{id}  — soft delete
        group.MapDelete("/{id:guid}", async (Guid id, ICustomerService svc) =>
        {
            var result = await svc.DeleteAsync(id);
            return result ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/customers/{id}/photo
        group.MapPost("/{id:guid}/photo", async (Guid id, HttpRequest request, ICustomerService svc) =>
        {
            using var ms = new MemoryStream();
            await request.Body.CopyToAsync(ms);
            var bytes = ms.ToArray();

            if (bytes.Length == 0) return Results.BadRequest("Fotoğraf boş olamaz.");
            if (bytes.Length > 5 * 1024 * 1024) return Results.BadRequest("Fotoğraf 5MB'ı geçemez.");

            var result = await svc.UploadPhotoAsync(id, bytes);
            return result ? Results.Ok() : Results.NotFound();
        });

        // GET /api/customers/{id}/photo
        group.MapGet("/{id:guid}/photo", async (Guid id, ICustomerService svc) =>
        {
            var photo = await svc.GetPhotoAsync(id);
            return photo is null ? Results.NotFound() : Results.File(photo, "image/jpeg");
        });
    }
}
```

### 15.3 — Transaction Endpoints

**`Endpoints/TransactionEndpoints.cs`**
```csharp
using System.Security.Claims;
using KuyumcuPrivate.Application.DTOs.Transactions;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class TransactionEndpoints
{
    public static void MapTransactionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transactions").WithTags("Transactions").RequireAuthorization();

        // GET /api/transactions/customer/{customerId}
        group.MapGet("/customer/{customerId:guid}", async (Guid customerId, ITransactionService svc) =>
            Results.Ok(await svc.GetByCustomerAsync(customerId)));

        // POST /api/transactions/deposit
        group.MapPost("/deposit", async (DepositRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await svc.DepositAsync(request, userId);
            return Results.Ok(result);
        });

        // POST /api/transactions/withdrawal
        group.MapPost("/withdrawal", async (WithdrawalRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            try
            {
                var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var result = await svc.WithdrawAsync(request, userId);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/transactions/conversion
        group.MapPost("/conversion", async (ConversionRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            try
            {
                var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var result = await svc.ConvertAsync(request, userId);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/transactions/{id}/cancel
        group.MapPost("/{id:guid}/cancel", async (Guid id, CancelRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await svc.CancelAsync(id, request.Reason, userId);
            return result ? Results.Ok() : Results.NotFound();
        }).RequireAuthorization("AdminOnly");
    }
}

public record CancelRequest(string Reason);
```

### 15.4 — Balance Endpoints

**`Endpoints/BalanceEndpoints.cs`**
```csharp
using KuyumcuPrivate.Infrastructure.Persistence;
using KuyumcuPrivate.Application.DTOs.Balances;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Endpoints;

public static class BalanceEndpoints
{
    public static void MapBalanceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/balances").WithTags("Balances").RequireAuthorization();

        // GET /api/balances/customer/{customerId}
        // Müşterinin tüm varlık bakiyelerini döner — sıfır olanlar dahil değil
        group.MapGet("/customer/{customerId:guid}", async (Guid customerId, AppDbContext db) =>
        {
            var balances = await db.Balances
                .Include(b => b.AssetType)
                .Where(b => b.CustomerId == customerId && b.Amount != 0)
                .OrderBy(b => b.AssetType.SortOrder)
                .Select(b => new BalanceResponse(
                    b.AssetTypeId,
                    b.AssetType.Code,
                    b.AssetType.Name,
                    b.AssetType.UnitType,
                    b.Amount))
                .ToListAsync();

            return Results.Ok(balances);
        });
    }
}
```

### 15.5 — AssetType Endpoints

**`Endpoints/AssetTypeEndpoints.cs`**
```csharp
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Endpoints;

public static class AssetTypeEndpoints
{
    public static void MapAssetTypeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/asset-types").WithTags("AssetTypes").RequireAuthorization();

        // GET /api/asset-types — aktif tüm varlık birimlerini döner
        group.MapGet("/", async (AppDbContext db) =>
        {
            var types = await db.AssetTypes
                .Where(a => a.IsActive)
                .OrderBy(a => a.SortOrder)
                .ToListAsync();

            return Results.Ok(types);
        });
    }
}
```

---

## Adım 16 — Authorization Policy: AdminOnly

`Program.cs` içinde `builder.Services.AddAuthorization()` satırını şu şekilde güncelle:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
});
```

---

## Adım 17 — İlk Admin Kullanıcısı (Seed)

`AppDbContext.cs` içindeki `OnModelCreating` metoduna, `SeedAssetTypes` çağrısının altına ekle:

```csharp
SeedUsers(modelBuilder);
```

Aynı dosyaya şu metodu ekle:

```csharp
private static void SeedUsers(ModelBuilder modelBuilder)
{
    // Varsayılan admin kullanıcısı — ilk girişten sonra şifre değiştirilmeli
    modelBuilder.Entity<User>().HasData(new User
    {
        Id           = Guid.Parse("00000000-0000-0000-0000-000000000001"),
        FullName     = "Sistem Yöneticisi",
        Username     = "admin",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
        Role         = UserRole.Admin,
        IsActive     = true
    });
}
```

Ardından yeni bir migration oluştur:

```bash
dotnet ef migrations add AddUserSeed \
  --project src/KuyumcuPrivate.Infrastructure/KuyumcuPrivate.Infrastructure.csproj \
  --startup-project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj \
  --output-dir Persistence/Migrations
```

---

## Adım 18 — Doğrulama

```bash
# PostgreSQL çalışıyorsa direkt API'yi başlat
dotnet run --project src/KuyumcuPrivate.API/KuyumcuPrivate.API.csproj
```

Swagger UI üzerinden sırasıyla şunları test et:

**1. Login**
```
POST /api/auth/login
{ "username": "admin", "password": "admin123" }
```
→ Token alınmalı

**2. Token ile müşteri oluştur**
```
POST /api/customers
Authorization: Bearer <token>
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "phone": "05551234567"
}
```
→ 201 Created, müşteri id dönmeli

**3. Yatırma işlemi**
```
POST /api/transactions/deposit
{
  "customerId": "<müşteri-id>",
  "assetTypeId": "<GBP-id>",
  "amount": 500,
  "description": "İlk yatırım"
}
```
→ Transaction response dönmeli

**4. Bakiye kontrolü**
```
GET /api/balances/customer/<müşteri-id>
```
→ GBP: 500 görünmeli

**5. Dönüşüm**
```
POST /api/transactions/conversion
{
  "customerId": "<müşteri-id>",
  "fromAssetTypeId": "<GBP-id>",
  "fromAmount": 500,
  "fromRateTry": 42.30,
  "toAssetTypeId": "<CEYREK-id>",
  "toRateTry": 1620,
  "description": "Sterlin çeyreğe çevrildi",
  "rateNote": "Günlük borsa kuru"
}
```
→ GBP: 0, CEYREK: 13.06 görünmeli

---

## Sonraki Adım (Faz 1 — Frontend)

Bu direktif tamamlandıktan sonra sırada şunlar var:

1. **React + Vite scaffold** — TypeScript, Axios, React Router
2. **Auth context** — login ekranı, token yönetimi
3. **Müşteri listesi ekranı** — arama, filtreleme
4. **Müşteri detay ekranı** — bakiyeler, hareket geçmişi
5. **İşlem formları** — yatır, çek, dönüştür
