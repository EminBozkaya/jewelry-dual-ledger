namespace KuyumcuPrivate.Application.DTOs.Stores;

public record StoreCreateRequest(
    string Name,
    string Slug,
    string? Phone,
    string? Email,
    string? Address,
    string? TaxNumber,
    string? TaxOffice,
    string AdminFullName,
    string AdminUsername,
    string AdminPassword
);
