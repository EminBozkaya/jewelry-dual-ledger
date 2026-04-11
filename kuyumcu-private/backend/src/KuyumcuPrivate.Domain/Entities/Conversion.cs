using KuyumcuPrivate.Domain.Common;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Domain.Entities;

// Virman / dönüşüm detayı — her zaman TL ara birim olarak kullanılır
// Örnek: 500 GBP → çeyrek altın
//   from_rate_try : 1 GBP = 42.30 TL
//   try_equivalent: 21.150 TL
//   to_rate_try   : 1 çeyrek = 1.620 TL
//   to_amount     : 13.06 çeyrek
public class Conversion : BaseEntity
{
    public Guid TransactionId { get; set; }

    public Guid FromAssetId { get; set; }
    public decimal FromAmount { get; set; }
    public decimal FromRateTry { get; set; }    // Kaynak varlığın TL kuru

    public decimal TryEquivalent { get; set; }  // Ara TL tutarı — kayıt ve raporlama için

    public Guid ToAssetId { get; set; }
    public decimal ToAmount { get; set; }
    public decimal ToRateTry { get; set; }      // Hedef varlığın TL kuru

    public RateSource RateSource { get; set; } = RateSource.Manual;
    public string? RateNote { get; set; }       // Örn: "Borsa kapanış kuru", "Anlaşmalı kur"

    // Navigation
    public Transaction Transaction { get; set; } = null!;
    public AssetType FromAsset { get; set; } = null!;
    public AssetType ToAsset { get; set; } = null!;
}
