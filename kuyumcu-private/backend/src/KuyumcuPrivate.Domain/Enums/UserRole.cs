using System.Text.Json.Serialization;

namespace KuyumcuPrivate.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    SuperAdmin,  // Platform yöneticisi — tüm mağazalara erişim, mağaza CRUD
    Admin,       // Mağaza sahibi — kendi mağazasının tüm işlemlerine erişim
    Staff        // Mağaza personeli — günlük işlemler
}
