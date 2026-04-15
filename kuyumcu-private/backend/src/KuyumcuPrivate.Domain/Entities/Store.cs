using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Mağaza (tenant) tanımı — her kuyumcu işletmesi bir Store kaydıdır.
/// Subdomain üzerinden erişilir: slug.defteri.app
/// </summary>
public class Store : BaseEntity
{
    public string Name { get; set; } = string.Empty;           // Mağaza görünen adı: "Altınkral Kuyumculuk"
    public string Slug { get; set; } = string.Empty;           // Subdomain slug: "altinkral" → altinkral.defteri.app
    public string? LogoUrl { get; set; }                        // Mağaza logosu URL
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxNumber { get; set; }                      // Vergi numarası
    public string? TaxOffice { get; set; }                      // Vergi dairesi
    public bool IsActive { get; set; } = true;                  // Pasif mağaza erişemez
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubscriptionExpiresAt { get; set; }        // Abonelik bitiş tarihi (null = sınırsız)

    // Navigation
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Balance> Balances { get; set; } = [];
    public ICollection<StoreAssetType> StoreAssetTypes { get; set; } = [];
    public ICollection<StoreSetting> Settings { get; set; } = [];
}
