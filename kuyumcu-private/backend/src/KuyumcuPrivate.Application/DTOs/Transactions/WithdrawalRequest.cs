namespace KuyumcuPrivate.Application.DTOs.Transactions;

public record WithdrawalRequest(
    Guid CustomerId,
    Guid AssetTypeId,
    decimal Amount,
    string? Description
);
