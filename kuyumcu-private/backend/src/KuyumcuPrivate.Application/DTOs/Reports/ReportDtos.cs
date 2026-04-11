using KuyumcuPrivate.Application.DTOs.Balances;
using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.DTOs.Transactions;

namespace KuyumcuPrivate.Application.DTOs.Reports;

// GET /api/reports/portfolio
public record PortfolioAssetDto(
    Guid AssetTypeId,
    string AssetTypeCode,
    string AssetTypeName,
    string UnitType,
    decimal TotalPositive,
    decimal TotalNegative,
    decimal NetAmount,
    int CustomerCount
);

// GET /api/reports/daily
public record DailyReportDto(
    string Date,
    int TotalTransactions,
    IEnumerable<DailyAssetSummary> Deposits,
    IEnumerable<DailyAssetSummary> Withdrawals,
    IEnumerable<DailyConversionSummary> Conversions,
    IEnumerable<TransactionResponse> Transactions
);

public record DailyAssetSummary(
    string AssetTypeCode,
    string AssetTypeName,
    decimal TotalAmount,
    int Count
);

public record DailyConversionSummary(
    string FromAssetCode,
    string ToAssetCode,
    decimal TotalFromAmount,
    decimal TotalToAmount,
    int Count
);

// GET /api/reports/customer-statement
public record CustomerStatementDto(
    CustomerResponse Customer,
    StatementPeriod Period,
    IEnumerable<BalanceResponse> OpeningBalances,
    IEnumerable<BalanceResponse> ClosingBalances,
    IEnumerable<TransactionResponse> Transactions
);

public record StatementPeriod(string From, string To);

// GET /api/reports/asset-detail
public record AssetDetailCustomerDto(
    Guid CustomerId,
    string CustomerFullName,
    decimal Amount
);
