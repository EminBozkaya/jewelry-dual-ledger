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
