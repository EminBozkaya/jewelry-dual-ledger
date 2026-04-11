using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace KuyumcuPrivate.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ITransactionService, TransactionService>();
        return services;
    }
}
