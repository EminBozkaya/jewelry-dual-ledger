namespace KuyumcuPrivate.Domain.Enums;

public enum TransactionType
{
    Deposit,     // Yatırma — müşteri hesabına varlık ekler
    Withdrawal,  // Çekme — müşteri hesabından varlık çıkar
    Conversion   // Dönüşüm — hesap içi varlık değişimi (virman)
}
