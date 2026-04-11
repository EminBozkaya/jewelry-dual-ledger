namespace KuyumcuPrivate.Application.DTOs.Transactions;

public record DepositRequest(
    Guid CustomerId,
    Guid AssetTypeId,
    decimal Amount,
    string? Description
);
