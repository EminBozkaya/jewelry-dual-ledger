namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreResponse(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? Phone,
    string? Email,
    string? Address,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? SubscriptionExpiresAt
);
