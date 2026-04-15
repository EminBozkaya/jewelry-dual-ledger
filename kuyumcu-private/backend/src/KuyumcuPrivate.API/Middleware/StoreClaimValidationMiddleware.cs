namespace KuyumcuPrivate.API.Middleware;

/// <summary>
/// JWT'deki store_id ile subdomain'den resolve edilen store_id eşleşmesini kontrol eder.
/// Bir kullanıcının yanlış subdomain üzerinden erişmesini engeller.
/// Bu middleware, Authentication middleware'den SONRA çalışmalıdır.
/// </summary>
public class StoreClaimValidationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Sadece authenticated isteklerde kontrol et
        if (context.User.Identity?.IsAuthenticated == true
            && context.Items.TryGetValue("StoreId", out var resolvedObj)
            && resolvedObj is Guid resolvedStoreId)
        {
            var claimStoreId = context.User.FindFirst("store_id")?.Value;

            // SuperAdmin tüm mağazalara erişebilir
            var role = context.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role == "SuperAdmin")
            {
                await next(context);
                return;
            }

            if (Guid.TryParse(claimStoreId, out var tokenStoreId) && tokenStoreId != resolvedStoreId)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Bu mağazaya erişim yetkiniz bulunmuyor."
                });
                return;
            }
        }

        await next(context);
    }
}
