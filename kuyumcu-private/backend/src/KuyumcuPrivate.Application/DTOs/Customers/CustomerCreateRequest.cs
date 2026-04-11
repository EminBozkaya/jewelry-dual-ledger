namespace KuyumcuPrivate.Application.DTOs.Customers;

public record CustomerCreateRequest(
    string FirstName,
    string LastName,
    string Phone,
    string? Address,
    string? Email,
    string? NationalId,
    string? Notes
);
