using System.Security.Claims;
using KuyumcuPrivate.Application.DTOs.Users;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization("AdminOnly");

        // GET /api/users
        group.MapGet("/", async (IUserService svc) =>
        {
            var users = await svc.GetAllAsync();
            return Results.Ok(users);
        });

        // POST /api/users
        group.MapPost("/", async (UserCreateRequest req, IUserService svc) =>
        {
            try
            {
                var user = await svc.CreateAsync(req);
                return Results.Created($"/api/users/{user.Id}", user);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        });

        // PUT /api/users/{id}
        group.MapPut("/{id:guid}", async (Guid id, UserUpdateRequest req, IUserService svc) =>
        {
            try
            {
                var user = await svc.UpdateAsync(id, req);
                return Results.Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        });

        // PUT /api/users/{id}/password
        group.MapPut("/{id:guid}/password", async (Guid id, ChangePasswordRequest req, IUserService svc) =>
        {
            try
            {
                await svc.ChangePasswordAsync(id, req.NewPassword);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        // PUT /api/users/{id}/toggle-active
        group.MapPut("/{id:guid}/toggle-active", async (Guid id, ClaimsPrincipal principal, IUserService svc) =>
        {
            var requestingUserId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
            try
            {
                await svc.ToggleActiveAsync(id, requestingUserId);
                return Results.NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });
    }
}
