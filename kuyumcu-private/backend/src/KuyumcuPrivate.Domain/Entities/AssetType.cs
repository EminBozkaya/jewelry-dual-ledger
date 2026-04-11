using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

// Varlık birimi tanımları — veritabanında yönetilir, sabit kodlanmaz
public class AssetType : BaseEntity
{
    public string Code { get; set; } = string.Empty;      // Örn: CEYREK, GBP, GOLD22
    public string Name { get; set; } = string.Empty;      // Örn: Çeyrek Altın, Sterlin
    public UnitType UnitType { get; set; }
    public int? Karat { get; set; }                        // Altınlar için: 22 veya 24
    public decimal? GramWeight { get; set; }               // Referans ağırlık — gram bazlı rapor için
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;               // UI sıralama

    // Navigation
    public ICollection<Balance> Balances { get; set; } = [];
    public ICollection<Transaction> Transactions { get; set; } = [];
}
