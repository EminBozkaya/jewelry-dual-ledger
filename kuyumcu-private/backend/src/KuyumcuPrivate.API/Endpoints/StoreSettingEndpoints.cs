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
