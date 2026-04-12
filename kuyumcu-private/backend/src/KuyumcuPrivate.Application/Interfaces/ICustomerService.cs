using KuyumcuPrivate.Application.DTOs.Customers;

namespace KuyumcuPrivate.Application.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerResponse>> GetAllAsync();
    Task<CustomerResponse?> GetByIdAsync(Guid id);
    Task<CustomerResponse> CreateAsync(CustomerCreateRequest request);
    Task<CustomerResponse?> UpdateAsync(Guid id, CustomerUpdateRequest request);
    Task<bool> DeleteAsync(Guid id);                          // Soft delete
    Task<bool> UploadPhotoAsync(Guid id, byte[] photoBytes, string contentType);
    Task<CustomerPhoto?> GetPhotoAsync(Guid id);
}

public record CustomerPhoto(byte[] Bytes, string ContentType);
