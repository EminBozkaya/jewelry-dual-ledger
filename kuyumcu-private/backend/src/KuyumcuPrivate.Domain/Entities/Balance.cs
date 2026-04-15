using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

// Müşteri bazında anlık bakiye — her işlemden sonra güncellenir
public class Balance : BaseEntity, IStoreScoped
{
    public Guid CustomerId { get; set; }
    public Guid AssetTypeId { get; set; }
    public decimal Amount { get; set; } = 0;   // Ondalıklı — 13.07 çeyrek yazılabilir
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid StoreId { get; set; }

    // Navigation
    public Store Store { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public AssetType AssetType { get; set; } = null!;
}
