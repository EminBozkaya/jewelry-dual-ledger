using System.Text.Json.Serialization;

namespace KuyumcuPrivate.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RateSource
{
    Manual, // Kullanıcı tarafından girildi
    Auto    // API'den otomatik çekildi (Faz 2)
}
