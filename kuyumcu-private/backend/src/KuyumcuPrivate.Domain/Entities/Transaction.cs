using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

public class Transaction : BaseEntity
{
    public Guid CustomerId { get; set; }
    public TransactionType Type { get; set; }

    // Deposit ve Withdrawal için dolu, Conversion için null — detay conversions tablosunda
    public Guid? AssetTypeId { get; set; }
    public decimal? Amount { get; set; }

    public string? Description { get; set; }  // Serbest açıklama — "eniştesi geldi" tarzı
    public Guid CreatedBy { get; set; }        // İşlemi yapan kullanıcı
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsCancelled { get; set; } = false;  // Soft delete — işlem silinmez, iptal edilir
    public string? CancelReason { get; set; }

    // Navigation
    public Customer Customer { get; set; } = null!;
    public AssetType? AssetType { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public Conversion? Conversion { get; set; }
}
