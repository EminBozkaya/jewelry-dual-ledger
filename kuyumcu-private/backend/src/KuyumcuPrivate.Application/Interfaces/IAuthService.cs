using KuyumcuPrivate.Application.DTOs.Auth;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}
