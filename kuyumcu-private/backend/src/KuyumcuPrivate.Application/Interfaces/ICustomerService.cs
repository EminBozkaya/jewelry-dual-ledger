using KuyumcuPrivate.Application.DTOs.Customers;

namespace KuyumcuPrivate.Application.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerResponse>> GetAllAsync(bool? includeDeleted = false);
    Task<CustomerResponse?> GetByIdAsync(Guid id);
    Task<CustomerResponse> CreateAsync(CustomerCreateRequest request);
    Task<CustomerResponse?> UpdateAsync(Guid id, CustomerUpdateRequest request);
    Task<bool> DeleteAsync(Guid id);                          // Soft delete
    Task<bool> RestoreAsync(Guid id, bool resetBalances, Guid userId); // Restore soft deleted customer
    Task<bool> UploadPhotoAsync(Guid id, byte[] photoBytes, string contentType);
    Task<CustomerPhoto?> GetPhotoAsync(Guid id);
    Task<bool> DeletePhotoAsync(Guid id);
}

public record CustomerPhoto(byte[] Bytes, string ContentType);
