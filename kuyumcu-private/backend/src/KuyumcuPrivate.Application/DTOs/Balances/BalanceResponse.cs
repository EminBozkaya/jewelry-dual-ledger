using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Balances;

public record BalanceResponse(
    Guid AssetTypeId,
    string AssetTypeCode,
    string AssetTypeName,
    UnitType UnitType,
    decimal Amount
);
