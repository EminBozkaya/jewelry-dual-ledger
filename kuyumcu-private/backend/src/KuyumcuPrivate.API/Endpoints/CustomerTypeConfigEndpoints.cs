using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Endpoints;

public static class CustomerTypeConfigEndpoints
{
    public static void MapCustomerTypeConfigEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/customer-types").WithTags("CustomerTypes").RequireAuthorization();

        // GET /api/customer-types — aktif müşteri tiplerini döner
        group.MapGet("/", async (AppDbContext db) =>
        {
            var types = await db.CustomerTypeConfigs
                .Where(t => t.IsActive)
                .OrderBy(t => t.SortOrder)
                .ToListAsync();

            return Results.Ok(types);
        });

        // GET /api/customer-types/all — pasifler dahil tümünü döner (Admin yönetim paneli için)
        group.MapGet("/all", async (AppDbContext db) =>
        {
            var types = await db.CustomerTypeConfigs
                .OrderBy(t => t.SortOrder)
                .ThenBy(t => t.Name)
                .ToListAsync();

            return Results.Ok(types);
        }).RequireAuthorization("AdminOnly");

        // POST /api/customer-types — yeni müşteri tipi ekle
        group.MapPost("/", async (CustomerTypeConfigCreateRequest req, AppDbContext db) =>
        {
            // Aynı Value var mı kontrol et
            var exists = await db.CustomerTypeConfigs.AnyAsync(t => t.Value == req.Value);
            if (exists)
                return Results.Conflict(new { error = $"'{req.Value}' değeri zaten kullanılıyor." });

            var maxSort = await db.CustomerTypeConfigs.MaxAsync(t => (int?)t.SortOrder) ?? 0;

            var entity = new CustomerTypeConfig
            {
                Value     = req.Value,
                Name      = req.Name.Trim(),
                ColorHex  = req.ColorHex?.Trim() ?? "#6b7280",
                IsActive  = true,
                SortOrder = maxSort + 1
            };

            db.CustomerTypeConfigs.Add(entity);
            await db.SaveChangesAsync();

            return Results.Created($"/api/customer-types/{entity.Id}", entity);
        }).RequireAuthorization("AdminOnly");

        // PUT /api/customer-types/reorder — toplu sıralama güncelle (drag & drop)
        group.MapPut("/reorder", async (CustomerTypeConfigReorderItem[] req, AppDbContext db) =>
        {
            foreach (var item in req)
            {
                var entity = await db.CustomerTypeConfigs.FindAsync(item.Id);
                if (entity is not null)
                    entity.SortOrder = item.SortOrder;
            }
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization("AdminOnly");

        // PUT /api/customer-types/{id} — müşteri tipini güncelle
        group.MapPut("/{id:guid}", async (Guid id, CustomerTypeConfigUpdateRequest req, AppDbContext db) =>
        {
            var entity = await db.CustomerTypeConfigs.FindAsync(id);
            if (entity is null)
                return Results.NotFound(new { error = "Müşteri tipi bulunamadı." });

            // Value değişiyorsa benzersizlik kontrol et
            if (entity.Value != req.Value)
            {
                var valueExists = await db.CustomerTypeConfigs.AnyAsync(t => t.Value == req.Value && t.Id != id);
                if (valueExists)
                    return Results.Conflict(new { error = $"'{req.Value}' değeri zaten kullanılıyor." });
            }

            entity.Value    = req.Value;
            entity.Name     = req.Name.Trim();
            entity.ColorHex = req.ColorHex?.Trim() ?? "#6b7280";

            await db.SaveChangesAsync();
            return Results.Ok(entity);
        }).RequireAuthorization("AdminOnly");

        // PUT /api/customer-types/{id}/toggle-active — aktif/pasif geçişi
        group.MapPut("/{id:guid}/toggle-active", async (Guid id, AppDbContext db) =>
        {
            var entity = await db.CustomerTypeConfigs.FindAsync(id);
            if (entity is null)
                return Results.NotFound(new { error = "Müşteri tipi bulunamadı." });

            entity.IsActive = !entity.IsActive;
            await db.SaveChangesAsync();
            return Results.Ok(entity);
        }).RequireAuthorization("AdminOnly");

        // DELETE /api/customer-types/{id} — akıllı silme
        group.MapDelete("/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var entity = await db.CustomerTypeConfigs.FindAsync(id);
            if (entity is null)
                return Results.NotFound(new { error = "Müşteri tipi bulunamadı." });

            // Bu type değeriyle kayıtlı müşteri var mı?
            var usedByCustomers = await db.Customers.AnyAsync(c => (int)c.Type == entity.Value);

            if (!usedByCustomers)
            {
                db.CustomerTypeConfigs.Remove(entity);
                await db.SaveChangesAsync();
                return Results.Ok(new { action = "hard_delete", message = $"'{entity.Name}' kalıcı olarak silindi." });
            }
            else
            {
                entity.IsActive = false;
                await db.SaveChangesAsync();
                return Results.Ok(new { action = "soft_delete", message = $"'{entity.Name}' müşterilerde kullanıldığı için pasife alındı." });
            }
        }).RequireAuthorization("AdminOnly");
    }
}

// ── DTO'lar ──────────────────────────────────────────────────────
public record CustomerTypeConfigCreateRequest(
    int Value,
    string Name,
    string? ColorHex
);

public record CustomerTypeConfigUpdateRequest(
    int Value,
    string Name,
    string? ColorHex
);

public record CustomerTypeConfigReorderItem(Guid Id, int SortOrder);
