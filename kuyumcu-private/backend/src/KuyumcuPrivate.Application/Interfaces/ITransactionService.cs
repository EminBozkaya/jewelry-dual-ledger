using KuyumcuPrivate.Application.DTOs.Transactions;

namespace KuyumcuPrivate.Application.Interfaces;

public interface ITransactionService
{
    Task<TransactionResponse> DepositAsync(DepositRequest request, Guid userId);
    Task<TransactionResponse> WithdrawAsync(WithdrawalRequest request, Guid userId);
    Task<TransactionResponse> ConvertAsync(ConversionRequest request, Guid userId);
    Task<List<TransactionResponse>> GetByCustomerAsync(Guid customerId);
    Task<bool> CancelAsync(Guid transactionId, string reason, Guid userId);
}
