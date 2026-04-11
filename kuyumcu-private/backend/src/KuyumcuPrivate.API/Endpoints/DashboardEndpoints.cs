using KuyumcuPrivate.Application.DTOs.Transactions;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.API.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/dashboard").WithTags("Dashboard").RequireAuthorization();

        // GET /api/dashboard/summary
        // Toplam müşteri, bugünkü işlem sayısı, son 10 işlem
        group.MapGet("/summary", async (AppDbContext db) =>
        {
            var today = DateTime.UtcNow.Date;

            var totalCustomers = await db.Customers.CountAsync();
            var totalActiveUsers = await db.Users.CountAsync(u => u.IsActive);
            var todayTransactionCount = await db.Transactions
                .CountAsync(t => t.CreatedAt >= today && !t.IsCancelled);

            var recentTransactions = await db.Transactions
                .Where(t => !t.IsCancelled)
                .OrderByDescending(t => t.CreatedAt)
                .Take(10)
                .Include(t => t.Customer)
                .Include(t => t.AssetType)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Conversion)
                    .ThenInclude(c => c!.FromAsset)
                .Include(t => t.Conversion)
                    .ThenInclude(c => c!.ToAsset)
                .ToListAsync();

            var recentMapped = recentTransactions.Select(t =>
            {
                ConversionDetail? conv = null;
                if (t.Conversion is not null)
                {
                    conv = new ConversionDetail(
                        t.Conversion.FromAsset.Code,
                        t.Conversion.FromAsset.Name,
                        t.Conversion.FromAmount,
                        t.Conversion.FromRateTry,
                        t.Conversion.TryEquivalent,
                        t.Conversion.ToAsset.Code,
                        t.Conversion.ToAsset.Name,
                        t.Conversion.ToAmount,
                        t.Conversion.ToRateTry,
                        t.Conversion.RateSource.ToString(),
                        t.Conversion.RateNote
                    );
                }
                return new TransactionResponse(
                    t.Id,
                    t.CustomerId,
                    $"{t.Customer.FirstName} {t.Customer.LastName}",
                    t.Type,
                    t.AssetType?.Code,
                    t.AssetType?.Name,
                    t.Amount,
                    t.Description,
                    t.CreatedByUser.FullName,
                    t.CreatedAt,
                    t.IsCancelled,
                    t.CancelReason,
                    conv
                );
            }).ToList();

            return Results.Ok(new
            {
                totalCustomers,
                totalActiveUsers,
                todayTransactionCount,
                recentTransactions = recentMapped
            });
        });
    }
}
