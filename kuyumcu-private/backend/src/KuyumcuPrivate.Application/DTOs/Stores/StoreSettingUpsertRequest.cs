namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreSettingUpsertRequest(
    string Key,
    string Value,
    string? Description
);
