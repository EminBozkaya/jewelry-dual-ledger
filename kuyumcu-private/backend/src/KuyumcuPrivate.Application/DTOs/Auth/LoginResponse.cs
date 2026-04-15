namespace KuyumcuPrivate.Application.DTOs.Auth;

public record LoginResponse(
    string Token,
    string FullName,
    string Role,
    DateTime ExpiresAt,
    string StoreSlug,     // Frontend redirect için
    Guid StoreId          // Frontend context için
);
