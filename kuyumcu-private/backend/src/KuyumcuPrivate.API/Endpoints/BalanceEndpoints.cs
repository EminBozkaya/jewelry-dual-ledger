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
            var balances = await db.Balances.IgnoreQueryFilters()
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
