using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Users;

public record UserResponse(
    Guid Id,
    string FullName,
    string Username,
    string Role,
    bool IsActive
);

public record UserCreateRequest(
    string FullName,
    string Username,
    string Password,
    UserRole Role
);

public record UserUpdateRequest(
    string FullName,
    string Username,
    UserRole Role,
    bool IsActive
);

public record ChangePasswordRequest(string NewPassword);
