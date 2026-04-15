using KuyumcuPrivate.Domain.Common;

namespace KuyumcuPrivate.Domain.Entities;

/// <summary>
/// Mağaza bazlı key-value ayar deposu.
/// Örnek: "ui.customer_label" → "Müşteri" veya "Alıcı"
/// Örnek: "ui.report_title" → "Hesap Ekstresi"
/// Örnek: "report.show_logo" → "true"
/// Örnek: "ui.primary_color" → "#1a5276"
/// Mağaza admini kendi panelinden ayar ekleyip düzenleyebilir.
/// Frontend, login sonrası tüm ayarları çekip Context'e yükler.
/// </summary>
public class StoreSetting : BaseEntity
{
    public Guid StoreId { get; set; }
    public string Key { get; set; } = string.Empty;     // Dot-notation: "ui.report_title"
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }             // Admin panelinde gösterilecek açıklama
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Store Store { get; set; } = null!;
}
