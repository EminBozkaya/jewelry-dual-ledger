using System.Security.Claims;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Endpoints;

public static class StoreRateEndpoints
{
    public static void MapStoreRateEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/store-rates").WithTags("StoreRates").RequireAuthorization();

        // GET /api/store-rates
        // Tüm mağaza kurlarını döner: { "USD": { buyingRate, sellingRate, updatedAt, updatedBy } }
        group.MapGet("/", async (AppDbContext db) =>
        {
            var rates = await db.StoreRates.ToListAsync();
            var result = rates.ToDictionary(
                r => r.Code,
                r => new
                {
                    r.BuyingRate,
                    r.SellingRate,
                    r.UpdatedAt,
                    r.UpdatedBy
                });
            return Results.Ok(result);
        });

        // PUT /api/store-rates — batch upsert (Admin only)
        // Body: { "USD": { "buyingRate": 38.5, "sellingRate": 39.0 }, ... }
        group.MapPut("/", async (
            Dictionary<string, StoreRateUpsertItem> payload,
            AppDbContext db,
            ClaimsPrincipal user) =>
        {
            var username = user.FindFirstValue(ClaimTypes.Name) ?? "system";

            foreach (var (code, item) in payload)
            {
                var existing = await db.StoreRates.FindAsync(code);
                if (existing == null)
                {
                    db.StoreRates.Add(new KuyumcuPrivate.Domain.Entities.StoreRate
                    {
                        Code        = code,
                        BuyingRate  = item.BuyingRate,
                        SellingRate = item.SellingRate,
                        UpdatedAt   = DateTime.UtcNow,
                        UpdatedBy   = username
                    });
                }
                else
                {
                    existing.BuyingRate  = item.BuyingRate;
                    existing.SellingRate = item.SellingRate;
                    existing.UpdatedAt   = DateTime.UtcNow;
                    existing.UpdatedBy   = username;
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { saved = payload.Count });

        }).RequireAuthorization("AdminOnly");
    }
}

public record StoreRateUpsertItem(decimal? BuyingRate, decimal? SellingRate);
