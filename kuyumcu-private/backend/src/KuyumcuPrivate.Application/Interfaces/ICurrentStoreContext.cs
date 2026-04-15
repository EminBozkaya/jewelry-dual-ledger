namespace KuyumcuPrivate.Application.Interfaces;

/// <summary>
/// Mevcut HTTP isteğinin ait olduğu mağazayı sağlar.
/// Middleware tarafından subdomain'den veya JWT'den resolve edilir.
/// Tüm servisler bu interface üzerinden store_id'ye erişir.
/// </summary>
public interface ICurrentStoreContext
{
    Guid StoreId { get; }
    string StoreSlug { get; }
}
