using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Customers;

public record CustomerResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string? Phone,
    string? Address,
    string? Email,
    string? NationalId,
    CustomerType Type,
    string? Notes,
    bool HasPhoto,
    DateTime CreatedAt
);
