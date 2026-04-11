using KuyumcuPrivate.Application.DTOs.Reports;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IReportService
{
    Task<IEnumerable<PortfolioAssetDto>> GetPortfolioAsync();
    Task<DailyReportDto> GetDailyReportAsync(DateOnly date);
    Task<CustomerStatementDto> GetCustomerStatementAsync(Guid customerId, DateOnly from, DateOnly to);
    Task<IEnumerable<AssetDetailCustomerDto>> GetAssetDetailAsync(Guid assetTypeId);
}
