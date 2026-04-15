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
            .FirstOrDefaultAsync(s => s.Id == id);
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
