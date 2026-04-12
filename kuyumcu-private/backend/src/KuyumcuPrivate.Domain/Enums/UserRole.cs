using System.Text.Json.Serialization;

namespace KuyumcuPrivate.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    Admin, // Tüm işlemlere erişim
    Staff  // Günlük işlemler — yönetim paneline erişim yok
}
