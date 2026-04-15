using KuyumcuPrivate.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace KuyumcuPrivate.Infrastructure.Services;

/// <summary>
/// HTTP context'ten mevcut store bilgisini okur.
/// StoreResolutionMiddleware tarafından HttpContext.Items'a yazılan değerleri kullanır.
/// </summary>
public class CurrentStoreContext(IHttpContextAccessor httpContextAccessor) : ICurrentStoreContext
{
    public Guid StoreId =>
        httpContextAccessor.HttpContext?.Items.TryGetValue("StoreId", out var id) == true && id is Guid guid
            ? guid
            : throw new InvalidOperationException("StoreId HTTP context'te bulunamadı.");

    public string StoreSlug =>
        httpContextAccessor.HttpContext?.Items.TryGetValue("StoreSlug", out var slug) == true && slug is string s
            ? s
            : throw new InvalidOperationException("StoreSlug HTTP context'te bulunamadı.");
}
