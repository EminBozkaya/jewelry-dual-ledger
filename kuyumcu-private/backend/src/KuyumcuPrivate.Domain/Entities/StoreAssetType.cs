using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Hangi mağaza hangi varlık birimlerini kullanıyor?
/// Global AssetType tablosu tüm birimleri tanımlar,
/// bu tablo ise mağaza bazında aktif/pasif kontrolü sağlar.
/// Örnek: Bir kuyumcu gümüş satmıyorsa SILVER'ı kapatabilir.
/// </summary>
public class StoreAssetType : BaseEntity
{
    public Guid StoreId { get; set; }
    public Guid AssetTypeId { get; set; }
    public bool IsActive { get; set; } = true;
    public int? SortOrderOverride { get; set; }  // Mağaza kendi sıralamasını yapabilir

    // Navigation
    public Store Store { get; set; } = null!;
    public AssetType AssetType { get; set; } = null!;
}
