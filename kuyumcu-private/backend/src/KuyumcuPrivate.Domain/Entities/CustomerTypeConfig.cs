using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

public class CustomerTypeConfig : BaseEntity
{
    /// <summary>Customer.Type int karşılığı — benzersiz (0=Standard, 1=Jeweler, 2=Supplier, …)</summary>
    public int Value { get; set; }

    /// <summary>Görüntülenecek ad — "Özel Müşteri", "Kuyumcu" vb.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Badge rengi — HEX kodu (#3b82f6 gibi)</summary>
    public string ColorHex { get; set; } = "#6b7280";

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; } = 0;
}
