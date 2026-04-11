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
