using KuyumcuPrivate.Application.DTOs.Auth;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        // POST /api/auth/login
        group.MapPost("/login", async (LoginRequest request, IAuthService authService) =>
        {
            var result = await authService.LoginAsync(request);
            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        }).AllowAnonymous();
    }
}
