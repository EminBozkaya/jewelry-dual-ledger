using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

public class Customer : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? NationalId { get; set; }   // TC kimlik — aynı isimli müşterileri ayırt eder
    public byte[]? Photo { get; set; }         // Fotoğraf binary olarak saklanır
    public string? Notes { get; set; }         // Genel müşteri notu — serbest metin
    public bool IsDeleted { get; set; } = false; // Soft delete
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Balance> Balances { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
}
