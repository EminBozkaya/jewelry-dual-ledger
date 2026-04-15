using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace KuyumcuPrivate.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<ICurrentStoreContext, CurrentStoreContext>();
        services.AddScoped<IStoreService, StoreService>();
        services.AddScoped<IStoreSettingService, StoreSettingService>();
        return services;
    }
}
