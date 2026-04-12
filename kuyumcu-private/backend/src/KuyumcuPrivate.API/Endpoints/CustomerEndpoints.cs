using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class CustomerEndpoints
{
    public static void MapCustomerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/customers").WithTags("Customers").RequireAuthorization();

        // GET /api/customers
        group.MapGet("/", async (ICustomerService svc) =>
            Results.Ok(await svc.GetAllAsync()));

        // GET /api/customers/{id}
        group.MapGet("/{id:guid}", async (Guid id, ICustomerService svc) =>
        {
            var customer = await svc.GetByIdAsync(id);
            return customer is null ? Results.NotFound() : Results.Ok(customer);
        });

        // POST /api/customers
        group.MapPost("/", async (CustomerCreateRequest request, ICustomerService svc) =>
        {
            var created = await svc.CreateAsync(request);
            return Results.Created($"/api/customers/{created.Id}", created);
        });

        // PUT /api/customers/{id}
        group.MapPut("/{id:guid}", async (Guid id, CustomerUpdateRequest request, ICustomerService svc) =>
        {
            var updated = await svc.UpdateAsync(id, request);
            return updated is null ? Results.NotFound() : Results.Ok(updated);
        });

        // DELETE /api/customers/{id}  — soft delete
        group.MapDelete("/{id:guid}", async (Guid id, ICustomerService svc) =>
        {
            var result = await svc.DeleteAsync(id);
            return result ? Results.NoContent() : Results.NotFound();
        });

        // POST /api/customers/{id}/photo
        group.MapPost("/{id:guid}/photo", async (Guid id, IFormFile photo, ICustomerService svc) =>
        {
            if (photo is null || photo.Length == 0) return Results.BadRequest("Fotoğraf boş olamaz.");
            if (photo.Length > 5 * 1024 * 1024) return Results.BadRequest("Fotoğraf 5MB'ı geçemez.");

            using var ms = new MemoryStream();
            await photo.CopyToAsync(ms);
            var bytes = ms.ToArray();

            var result = await svc.UploadPhotoAsync(id, bytes, photo.ContentType);
            return result ? Results.Ok() : Results.NotFound();
        }).DisableAntiforgery();

        // GET /api/customers/{id}/photo
        app.MapGet("/api/customers/{id:guid}/photo", async (Guid id, ICustomerService svc) =>
        {
            var photo = await svc.GetPhotoAsync(id);
            return photo is null ? Results.NotFound() : Results.File(photo.Bytes, photo.ContentType);
        }).WithTags("Customers");
    }
}
