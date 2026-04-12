using KuyumcuPrivate.Application.DTOs.Reports;
using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IReportService
{
    Task<IEnumerable<PortfolioAssetDto>> GetPortfolioAsync(IEnumerable<CustomerType>? types = null);
    Task<DailyReportDto> GetDailyReportAsync(DateOnly fromDate, DateOnly toDate);
    Task<CustomerStatementDto> GetCustomerStatementAsync(Guid customerId, DateOnly from, DateOnly to);
    Task<IEnumerable<AssetDetailCustomerDto>> GetAssetDetailAsync(Guid assetTypeId);
}
