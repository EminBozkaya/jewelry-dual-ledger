using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Endpoints;

public static class AssetTypeEndpoints
{
    public static void MapAssetTypeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/asset-types").WithTags("AssetTypes").RequireAuthorization();

        // GET /api/asset-types — aktif tüm varlık birimlerini döner (select listeler vb. için)
        group.MapGet("/", async (AppDbContext db) =>
        {
            var types = await db.AssetTypes
                .Where(a => a.IsActive)
                .OrderBy(a => a.SortOrder)
                .ToListAsync();

            return Results.Ok(types);
        });

        // GET /api/asset-types/all — pasifler dahil tümünü döner (Admin yönetim paneli için)
        group.MapGet("/all", async (AppDbContext db) =>
        {
            var types = await db.AssetTypes
                .OrderBy(a => a.SortOrder)
                .ThenBy(a => a.Name)
                .ToListAsync();

            return Results.Ok(types);
        }).RequireAuthorization("AdminOnly");

        // POST /api/asset-types — yeni varlık tipi ekle
        group.MapPost("/", async (AssetTypeCreateRequest req, AppDbContext db) =>
        {
            // Aynı code var mı kontrol et (silinmiş olanlar dahil)
            var exists = await db.AssetTypes.AnyAsync(a => a.Code == req.Code.ToUpperInvariant());
            if (exists)
                return Results.Conflict(new { error = $"'{req.Code}' kodu zaten kullanılıyor." });

            // Yeni sıra numarası: mevcut max + 1
            var maxSort = await db.AssetTypes.MaxAsync(a => (int?)a.SortOrder) ?? 0;

            var entity = new AssetType
            {
                Code       = req.Code.ToUpperInvariant().Trim(),
                Name       = req.Name.Trim(),
                UnitType   = Enum.Parse<UnitType>(req.UnitType),
                Karat      = req.Karat,
                GramWeight = req.GramWeight,
                IsActive   = true,
                SortOrder  = maxSort + 1
            };

            db.AssetTypes.Add(entity);
            await db.SaveChangesAsync();

            return Results.Created($"/api/asset-types/{entity.Id}", entity);
        }).RequireAuthorization("AdminOnly");

        // PUT /api/asset-types/reorder — toplu sıralama güncelle (drag & drop)
        group.MapPut("/reorder", async (AssetTypeReorderItem[] req, AppDbContext db) =>
        {
            foreach (var item in req)
            {
                var entity = await db.AssetTypes.FindAsync(item.Id);
                if (entity is not null)
                    entity.SortOrder = item.SortOrder;
            }
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization("AdminOnly");

        // PUT /api/asset-types/{id} — varlık tipini güncelle
        group.MapPut("/{id:guid}", async (Guid id, AssetTypeUpdateRequest req, AppDbContext db) =>
        {
            var entity = await db.AssetTypes.FindAsync(id);
            if (entity is null)
                return Results.NotFound(new { error = "Varlık tipi bulunamadı." });

            // Code değişiyorsa, benzersizlik kontrol et
            var newCode = req.Code.ToUpperInvariant().Trim();
            if (entity.Code != newCode)
            {
                var codeExists = await db.AssetTypes.AnyAsync(a => a.Code == newCode && a.Id != id);
                if (codeExists)
                    return Results.Conflict(new { error = $"'{newCode}' kodu zaten kullanılıyor." });
            }

            entity.Code       = newCode;
            entity.Name       = req.Name.Trim();
            entity.UnitType   = Enum.Parse<UnitType>(req.UnitType);
            entity.Karat      = req.Karat;
            entity.GramWeight = req.GramWeight;
            entity.SortOrder  = req.SortOrder;

            await db.SaveChangesAsync();

            return Results.Ok(entity);
        }).RequireAuthorization("AdminOnly");

        // PUT /api/asset-types/{id}/toggle-active — soft delete / geri getirme
        group.MapPut("/{id:guid}/toggle-active", async (Guid id, AppDbContext db) =>
        {
            var entity = await db.AssetTypes.FindAsync(id);
            if (entity is null)
                return Results.NotFound(new { error = "Varlık tipi bulunamadı." });

            entity.IsActive = !entity.IsActive;
            await db.SaveChangesAsync();

            return Results.Ok(entity);
        }).RequireAuthorization("AdminOnly");

        // DELETE /api/asset-types/{id} — akıllı silme
        // Hiçbir müşteride kullanılmıyorsa → hard delete
        // Kullanılıyorsa → soft delete (IsActive = false)
        group.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var entity = await db.AssetTypes.FindAsync(id);
            if (entity is null)
                return Results.NotFound(new { error = "Varlık tipi bulunamadı." });

            var usedInBalances = await db.Balances.AnyAsync(b => b.AssetTypeId == id);
            var usedInTransactions = await db.Transactions.AnyAsync(t => t.AssetTypeId == id);

            if (!usedInBalances && !usedInTransactions)
            {
                // Hiçbir yerde kullanılmamış → veritabanından tamamen sil
                db.AssetTypes.Remove(entity);
                await db.SaveChangesAsync();
                return Results.Ok(new { action = "hard_delete", message = $"'{entity.Name}' kalıcı olarak silindi." });
            }
            else
            {
                // Kullanılıyor → pasife çek
                entity.IsActive = false;
                await db.SaveChangesAsync();
                return Results.Ok(new { action = "soft_delete", message = $"'{entity.Name}' işlemlerde kullanıldığı için pasife alındı." });
            }
        }).RequireAuthorization("AdminOnly");
    }
}

// ── DTO'lar ───────────────────────────────────────────────────
public record AssetTypeCreateRequest(
    string Code,
    string Name,
    string UnitType,
    int? Karat,
    decimal? GramWeight
);

public record AssetTypeUpdateRequest(
    string Code,
    string Name,
    string UnitType,
    int? Karat,
    decimal? GramWeight,
    int SortOrder
);

public record AssetTypeReorderItem(Guid Id, int SortOrder);
