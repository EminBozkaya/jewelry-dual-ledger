using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Middleware;

/// <summary>
/// Gelen isteğin hangi mağazaya ait olduğunu çözümler.
/// Öncelik sırası:
///   1. X-Store-Slug header (Caddy tarafından subdomain'den eklenir)
///   2. JWT'deki store_id claim'i (authenticated istekler için)
///   3. Query string: ?store=slug (geliştirme ortamı için)
///
/// Çözümlenen store_id ve slug HttpContext.Items'a yazılır.
/// Çözümlenemezse 404 döner.
///
/// Muaf yollar: /health, /api/auth/login, /api/platform/* (SuperAdmin endpointleri)
/// </summary>
public class StoreResolutionMiddleware(RequestDelegate next)
{
    // Bu path'ler store resolution'dan muaftır
    private static readonly string[] ExemptPaths =
    [
        "/health",
        "/api/auth/login",
        "/api/platform",
        "/swagger",
        "/_framework"
    ];

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var path = context.Request.Path.Value ?? "";

        // Muaf path kontrolü
        if (ExemptPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await next(context);
            return;
        }

        string? slug = null;

        // 1. Caddy'den gelen header
        if (context.Request.Headers.TryGetValue("X-Store-Slug", out var headerSlug))
        {
            slug = headerSlug.ToString().ToLowerInvariant().Trim();
        }

        // 2. Query string (geliştirme ortamı fallback)
        if (string.IsNullOrEmpty(slug))
        {
            slug = context.Request.Query["store"].ToString().ToLowerInvariant().Trim();
        }

        // 3. JWT'deki store_id claim'i (token zaten varsa)
        if (string.IsNullOrEmpty(slug) && context.User.Identity?.IsAuthenticated == true)
        {
            var storeIdClaim = context.User.FindFirst("store_id")?.Value;
            if (Guid.TryParse(storeIdClaim, out var claimStoreId))
            {
                // Direkt ID üzerinden çözümle
                var storeById = await db.Stores
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == claimStoreId && s.IsActive);

                if (storeById is not null)
                {
                    context.Items["StoreId"] = storeById.Id;
                    context.Items["StoreSlug"] = storeById.Slug;
                    await next(context);
                    return;
                }
            }
        }

        if (string.IsNullOrEmpty(slug))
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = "Mağaza bilgisi bulunamadı. Subdomain veya store parametresi gerekli." });
            return;
        }

        // Slug → Store çözümleme (IgnoreQueryFilters: global filter StoreId arar, burada henüz yok)
        var store = await db.Stores
            .AsNoTracking()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Slug == slug && s.IsActive);

        if (store is null)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = $"'{slug}' mağazası bulunamadı veya aktif değil." });
            return;
        }

        // Abonelik kontrolü
        if (store.SubscriptionExpiresAt.HasValue && store.SubscriptionExpiresAt.Value < DateTime.UtcNow)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new { error = "Mağaza aboneliği sona ermiş. Lütfen yönetici ile iletişime geçin." });
            return;
        }

        context.Items["StoreId"] = store.Id;
        context.Items["StoreSlug"] = store.Slug;

        await next(context);
    }
}
