using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

public class User : BaseEntity, IStoreScoped
{
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Staff;
    public bool IsActive { get; set; } = true;
    public Guid StoreId { get; set; }

    // Navigation
    public Store Store { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = [];
}
