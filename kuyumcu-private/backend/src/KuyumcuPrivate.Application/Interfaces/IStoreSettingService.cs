using KuyumcuPrivate.Application.DTOs.Stores;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IStoreSettingService
{
    Task<List<StoreSettingResponse>> GetAllAsync();
    Task<StoreSettingResponse> UpsertAsync(StoreSettingUpsertRequest request);
    Task<bool> DeleteAsync(string key);
}
