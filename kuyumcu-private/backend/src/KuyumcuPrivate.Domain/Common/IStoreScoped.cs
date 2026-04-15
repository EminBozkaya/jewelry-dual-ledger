namespace KuyumcuPrivate.Domain.Common;

/// <summary>
/// Store bazlı izolasyon gerektiren tüm entity'ler bu interface'i implemente eder.
/// DbContext bu interface'i kullanan entity'lere otomatik global query filter uygular.
/// </summary>
public interface IStoreScoped
{
    Guid StoreId { get; set; }
}
