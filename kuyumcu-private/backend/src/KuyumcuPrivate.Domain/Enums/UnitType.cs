using System.Text.Json.Serialization;

namespace KuyumcuPrivate.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UnitType
{
    Currency,  // Para birimi (TL, USD, EUR, GBP)
    Piece,     // Adet bazlı (çeyrek, yarım, ata, beşli, gremse)
    Gram       // Gram bazlı (22 ayar, 24 ayar, gümüş)
}
