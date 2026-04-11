using KuyumcuPrivate.Domain.Enums;

namespace KuyumcuPrivate.Application.DTOs.Transactions;

public record TransactionResponse(
    Guid Id,
    Guid CustomerId,
    string CustomerFullName,
    TransactionType Type,
    string? AssetTypeCode,
    string? AssetTypeName,
    decimal? Amount,
    string? Description,
    string CreatedByFullName,
    DateTime CreatedAt,
    bool IsCancelled,
    string? CancelReason,
    ConversionDetail? Conversion
);

public record ConversionDetail(
    string FromAssetCode,
    string FromAssetName,
    decimal FromAmount,
    decimal FromRateTry,
    decimal TryEquivalent,
    string ToAssetCode,
    string ToAssetName,
    decimal ToAmount,
    decimal ToRateTry,
    string RateSource,
    string? RateNote
);
