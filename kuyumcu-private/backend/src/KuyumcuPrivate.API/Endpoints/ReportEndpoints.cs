using KuyumcuPrivate.Application.Interfaces;

namespace KuyumcuPrivate.API.Endpoints;

public static class ReportEndpoints
{
    public static void MapReportEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/reports")
            .WithTags("Reports")
            .RequireAuthorization();

        // GET /api/reports/portfolio
        group.MapGet("/portfolio", async (IReportService svc) =>
        {
            var data = await svc.GetPortfolioAsync();
            return Results.Ok(data);
        });

        // GET /api/reports/daily?date=2025-01-15
        group.MapGet("/daily", async (string? date, IReportService svc) =>
        {
            var parsedDate = date is not null && DateOnly.TryParse(date, out var d)
                ? d
                : DateOnly.FromDateTime(DateTime.UtcNow);

            var data = await svc.GetDailyReportAsync(parsedDate);
            return Results.Ok(data);
        });

        // GET /api/reports/customer-statement/{customerId}?from=...&to=...
        group.MapGet("/customer-statement/{customerId:guid}", async (
            Guid customerId, string? from, string? to, IReportService svc) =>
        {
            var today   = DateOnly.FromDateTime(DateTime.UtcNow);
            var fromDate = from is not null && DateOnly.TryParse(from, out var f) ? f : new DateOnly(today.Year, today.Month, 1);
            var toDate   = to   is not null && DateOnly.TryParse(to,   out var t) ? t : today;

            try
            {
                var data = await svc.GetCustomerStatementAsync(customerId, fromDate, toDate);
                return Results.Ok(data);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        // GET /api/reports/asset-detail/{assetTypeId}
        group.MapGet("/asset-detail/{assetTypeId:guid}", async (Guid assetTypeId, IReportService svc) =>
        {
            var data = await svc.GetAssetDetailAsync(assetTypeId);
            return Results.Ok(data);
        });
    }
}
