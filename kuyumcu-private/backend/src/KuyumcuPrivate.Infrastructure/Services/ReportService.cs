using KuyumcuPrivate.Application.DTOs.Balances;
using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.DTOs.Reports;
using KuyumcuPrivate.Application.DTOs.Transactions;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Enums;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class ReportService(AppDbContext db) : IReportService
{
    // ── Genel Portföy: varlık tipine göre bakiye özeti ───────────────────────
    public async Task<IEnumerable<PortfolioAssetDto>> GetPortfolioAsync(IEnumerable<CustomerType>? types = null)
    {
        var query = db.Balances
            .Include(b => b.AssetType)
            .Include(b => b.Customer)
            .Where(b => b.Amount != 0);

        if (types != null && types.Any())
        {
            query = query.Where(b => types.Contains(b.Customer.Type));
        }

        var balances = await query.ToListAsync();

        var result = balances
            .GroupBy(b => b.AssetType)
            .OrderBy(g => g.Key.SortOrder)
            .Select(g =>
            {
                var totalPositive = g.Where(b => b.Amount > 0).Sum(b => b.Amount);
                var totalNegative = Math.Abs(g.Where(b => b.Amount < 0).Sum(b => b.Amount));
                return new PortfolioAssetDto(
                    g.Key.Id,
                    g.Key.Code,
                    g.Key.Name,
                    g.Key.UnitType.ToString(),
                    totalPositive,
                    totalNegative,
                    totalPositive - totalNegative,
                    g.Count()
                );
            })
            .ToList();

        return result;
    }

    // ── Günlük Rapor ─────────────────────────────────────────────────────────
    public async Task<DailyReportDto> GetDailyReportAsync(DateOnly fromDate, DateOnly toDate)
    {
        var from = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var to   = toDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var transactions = await db.Transactions
            .Where(t => t.CreatedAt >= from && t.CreatedAt <= to && !t.IsCancelled)
            .Include(t => t.Customer)
            .Include(t => t.AssetType)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Conversion)
                .ThenInclude(c => c!.FromAsset)
            .Include(t => t.Conversion)
                .ThenInclude(c => c!.ToAsset)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

        var deposits = transactions
            .Where(t => t.Type == TransactionType.Deposit)
            .GroupBy(t => t.AssetType!)
            .Select(g => new DailyAssetSummary(
                g.Key.Code, g.Key.Name,
                g.Sum(t => t.Amount ?? 0), g.Count()))
            .ToList();

        var withdrawals = transactions
            .Where(t => t.Type == TransactionType.Withdrawal)
            .GroupBy(t => t.AssetType!)
            .Select(g => new DailyAssetSummary(
                g.Key.Code, g.Key.Name,
                g.Sum(t => t.Amount ?? 0), g.Count()))
            .ToList();

        var conversions = transactions
            .Where(t => t.Type == TransactionType.Conversion && t.Conversion is not null)
            .GroupBy(t => new { FromCode = t.Conversion!.FromAsset.Code, ToCode = t.Conversion.ToAsset.Code })
            .Select(g => new DailyConversionSummary(
                g.Key.FromCode, g.Key.ToCode,
                g.Sum(t => t.Conversion!.FromAmount),
                g.Sum(t => t.Conversion!.ToAmount),
                g.Count()))
            .ToList();

        var mapped = transactions.Select(MapTransaction).ToList();

        return new DailyReportDto(
            fromDate == toDate ? fromDate.ToString("yyyy-MM-dd") : $"{fromDate:yyyy-MM-dd} / {toDate:yyyy-MM-dd}",
            transactions.Count,
            deposits,
            withdrawals,
            conversions,
            mapped
        );
    }

    // ── Müşteri Ekstre ────────────────────────────────────────────────────────
    public async Task<CustomerStatementDto> GetCustomerStatementAsync(Guid customerId, DateOnly from, DateOnly to)
    {
        var customer = await db.Customers.FindAsync(customerId)
            ?? throw new KeyNotFoundException("Müşteri bulunamadı.");

        var fromDt = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toDt   = to.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        // Dönem içi işlemler
        var transactions = await db.Transactions
            .Where(t => t.CustomerId == customerId &&
                        t.CreatedAt >= fromDt &&
                        t.CreatedAt <= toDt &&
                        !t.IsCancelled)
            .Include(t => t.Customer)
            .Include(t => t.AssetType)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Conversion)
                .ThenInclude(c => c!.FromAsset)
            .Include(t => t.Conversion)
                .ThenInclude(c => c!.ToAsset)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

        // Kapanış bakiyeleri = mevcut bakiyeler
        var currentBalances = await db.Balances
            .Where(b => b.CustomerId == customerId)
            .Include(b => b.AssetType)
            .ToListAsync();

        var closingBalances = currentBalances
            .Select(b => new BalanceResponse(
                b.AssetTypeId, b.AssetType.Code, b.AssetType.Name,
                b.AssetType.UnitType, b.Amount))
            .ToList();

        // Açılış bakiyeleri = kapanış - dönem içi işlemler
        var movementByAsset = new Dictionary<Guid, decimal>();
        foreach (var t in transactions)
        {
            if (t.Type == TransactionType.Deposit && t.AssetTypeId.HasValue)
                movementByAsset[t.AssetTypeId.Value] =
                    movementByAsset.GetValueOrDefault(t.AssetTypeId.Value) + (t.Amount ?? 0);
            else if (t.Type == TransactionType.Withdrawal && t.AssetTypeId.HasValue)
                movementByAsset[t.AssetTypeId.Value] =
                    movementByAsset.GetValueOrDefault(t.AssetTypeId.Value) - (t.Amount ?? 0);
            else if (t.Type == TransactionType.Conversion && t.Conversion is not null)
            {
                movementByAsset[t.Conversion.FromAssetId] =
                    movementByAsset.GetValueOrDefault(t.Conversion.FromAssetId) - t.Conversion.FromAmount;
                movementByAsset[t.Conversion.ToAssetId] =
                    movementByAsset.GetValueOrDefault(t.Conversion.ToAssetId) + t.Conversion.ToAmount;
            }
        }

        var openingBalances = closingBalances
            .Select(cb =>
            {
                var movement = movementByAsset.GetValueOrDefault(cb.AssetTypeId);
                return new BalanceResponse(
                    cb.AssetTypeId, cb.AssetTypeCode, cb.AssetTypeName,
                    cb.UnitType, cb.Amount - movement);
            })
            .ToList();

        var customerResponse = new CustomerResponse(
            customer.Id, customer.FirstName, customer.LastName,
            $"{customer.FirstName} {customer.LastName}",
            customer.Phone, customer.Address, customer.Email,
            customer.NationalId, customer.Type, customer.Notes,
            customer.Photo is not null && customer.Photo.Length > 0,
            customer.CreatedAt);

        return new CustomerStatementDto(
            customerResponse,
            new StatementPeriod(from.ToString("yyyy-MM-dd"), to.ToString("yyyy-MM-dd")),
            openingBalances,
            closingBalances,
            transactions.Select(MapTransaction)
        );
    }

    // ── Varlık Detayı: müşteri bazında dağılım ───────────────────────────────
    public async Task<IEnumerable<AssetDetailCustomerDto>> GetAssetDetailAsync(Guid assetTypeId)
    {
        return await db.Balances
            .Where(b => b.AssetTypeId == assetTypeId && b.Amount != 0)
            .Include(b => b.Customer)
            .OrderByDescending(b => b.Amount)
            .Select(b => new AssetDetailCustomerDto(
                b.CustomerId,
                $"{b.Customer.FirstName} {b.Customer.LastName}",
                b.Amount))
            .ToListAsync();
    }

    // ── Yardımcı: Transaction → TransactionResponse ───────────────────────────
    private static TransactionResponse MapTransaction(Domain.Entities.Transaction t)
    {
        ConversionDetail? conv = null;
        if (t.Conversion is not null)
        {
            conv = new ConversionDetail(
                t.Conversion.FromAsset.Code, t.Conversion.FromAsset.Name,
                t.Conversion.FromAmount, t.Conversion.FromRateTry, t.Conversion.TryEquivalent,
                t.Conversion.ToAsset.Code, t.Conversion.ToAsset.Name,
                t.Conversion.ToAmount, t.Conversion.ToRateTry,
                t.Conversion.RateSource.ToString(), t.Conversion.RateNote);
        }

        return new TransactionResponse(
            t.Id, t.CustomerId,
            $"{t.Customer.FirstName} {t.Customer.LastName}",
            t.Customer.Type,
            t.Type, t.AssetType?.Code, t.AssetType?.Name,
            t.Amount, t.Description, t.CreatedByUser.FullName,
            t.CreatedAt, t.IsCancelled, t.CancelReason, conv);
    }
}
