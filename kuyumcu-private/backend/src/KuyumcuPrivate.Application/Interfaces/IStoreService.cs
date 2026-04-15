using KuyumcuPrivate.Application.DTOs.Stores;

namespace KuyumcuPrivate.Application.Interfaces;

/// <summary>
/// Mağaza CRUD işlemleri — sadece süper admin (platform seviyesi) kullanır.
/// Yeni mağaza oluşturulurken admin kullanıcısı da otomatik yaratılır.
/// </summary>
public interface IStoreService
{
    Task<StoreResponse> CreateAsync(StoreCreateRequest request);
    Task<StoreResponse?> GetBySlugAsync(string slug);
    Task<StoreResponse?> GetByIdAsync(Guid id);
    Task<List<StoreResponse>> GetAllAsync();
    Task<bool> DeactivateAsync(Guid id);
}
