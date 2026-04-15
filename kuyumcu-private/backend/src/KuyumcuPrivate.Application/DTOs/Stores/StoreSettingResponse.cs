namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreSettingResponse(
    Guid Id,
    string Key,
    string Value,
    string? Description
);
