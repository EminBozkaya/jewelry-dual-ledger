namespace KuyumcuPrivate.Application.DTOs.Transactions;

// Dönüşüm her zaman TL üzerinden yapılır.
// Örnek: 500 GBP → çeyrek
//   FromAssetTypeId = GBP id
//   FromAmount      = 500
//   FromRateTry     = 42.30  (1 GBP = 42.30 TL)
//   ToAssetTypeId   = CEYREK id
//   ToRateTry       = 1620   (1 çeyrek = 1620 TL)
//   ToAmount sistem tarafından hesaplanır: (500 * 42.30) / 1620 = 13.06
public record ConversionRequest(
    Guid CustomerId,
    Guid FromAssetTypeId,
    decimal FromAmount,
    decimal FromRateTry,
    Guid ToAssetTypeId,
    decimal ToRateTry,
    string? Description,
    string? RateNote
);
