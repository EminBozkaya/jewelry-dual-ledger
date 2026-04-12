using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Customers;

public record CustomerUpdateRequest(
    string FirstName,
    string LastName,
    string? Phone,
    string? Address,
    string? Email,
    string? NationalId,
    CustomerType Type,
    string? Notes,
    bool IgnorePhoneWarning = false
);
