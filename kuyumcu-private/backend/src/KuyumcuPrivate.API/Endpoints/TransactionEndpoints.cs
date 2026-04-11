using System.Security.Claims;
using KuyumcuPrivate.Application.DTOs.Transactions;
using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class TransactionEndpoints
{
    public static void MapTransactionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transactions").WithTags("Transactions").RequireAuthorization();

        // GET /api/transactions/customer/{customerId}
        group.MapGet("/customer/{customerId:guid}", async (Guid customerId, ITransactionService svc) =>
            Results.Ok(await svc.GetByCustomerAsync(customerId)));

        // POST /api/transactions/deposit
        group.MapPost("/deposit", async (DepositRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await svc.DepositAsync(request, userId);
            return Results.Ok(result);
        });

        // POST /api/transactions/withdrawal
        group.MapPost("/withdrawal", async (WithdrawalRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            try
            {
                var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var result = await svc.WithdrawAsync(request, userId);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/transactions/conversion
        group.MapPost("/conversion", async (ConversionRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            try
            {
                var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var result = await svc.ConvertAsync(request, userId);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // POST /api/transactions/{id}/cancel
        group.MapPost("/{id:guid}/cancel", async (Guid id, CancelRequest request, ITransactionService svc, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await svc.CancelAsync(id, request.Reason, userId);
            return result ? Results.Ok() : Results.NotFound();
        }).RequireAuthorization("AdminOnly");
    }
}

public record CancelRequest(string Reason);
