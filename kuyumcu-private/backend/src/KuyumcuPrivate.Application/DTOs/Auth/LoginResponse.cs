namespace KuyumcuPrivate.Application.DTOs.Auth;

public record LoginResponse(
    string Token,
    string FullName,
    string Role,
    DateTime ExpiresAt
);
