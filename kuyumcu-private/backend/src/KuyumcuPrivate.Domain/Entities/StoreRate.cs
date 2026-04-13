namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Mağazanın varlık bazında tuttuğu kendi alış/satış kurları.
/// Code (assetTypeCode) primary key olarak kullanılır.
/// </summary>
public class StoreRate
{
    /// <summary>AssetType.Code ile eşleşir (örn: "USD", "GOLD22").</summary>
    public string Code { get; set; } = default!;

    public decimal? BuyingRate  { get; set; }
    public decimal? SellingRate { get; set; }

    public DateTime UpdatedAt  { get; set; } = DateTime.UtcNow;
    public string   UpdatedBy  { get; set; } = default!;
}
