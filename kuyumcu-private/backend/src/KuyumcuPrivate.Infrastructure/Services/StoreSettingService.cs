using KuyumcuPrivate.Application.DTOs.Stores;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

/// <summary>
/// Mağaza bazlı ayar yönetimi.
/// Global query filter sayesinde sadece mevcut mağazanın ayarları döner.
/// </summary>
public class StoreSettingService(AppDbContext db, ICurrentStoreContext storeContext) : IStoreSettingService
{
    public async Task<List<StoreSettingResponse>> GetAllAsync()
    {
        return await db.StoreSettings
            .OrderBy(s => s.Key)
            .Select(s => new StoreSettingResponse(s.Id, s.Key, s.Value, s.Description))
            .ToListAsync();
    }

    public async Task<StoreSettingResponse> UpsertAsync(StoreSettingUpsertRequest request)
    {
        var existing = await db.StoreSettings
            .FirstOrDefaultAsync(s => s.Key == request.Key);

        if (existing is not null)
        {
            existing.Value = request.Value;
            existing.Description = request.Description;
        }
        else
        {
            existing = new StoreSetting
            {
                StoreId     = storeContext.StoreId,
                Key         = request.Key.Trim(),
                Value       = request.Value,
                Description = request.Description
            };
            db.StoreSettings.Add(existing);
        }

        await db.SaveChangesAsync();
        return new StoreSettingResponse(existing.Id, existing.Key, existing.Value, existing.Description);
    }

    public async Task<bool> DeleteAsync(string key)
    {
        var setting = await db.StoreSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting is null) return false;
        db.StoreSettings.Remove(setting);
        await db.SaveChangesAsync();
        return true;
    }
}
