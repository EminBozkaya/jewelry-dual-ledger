using KuyumcuPrivate.Application.DTOs.Users;

namespace KuyumcuPrivate.Application.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserResponse>> GetAllAsync();
    Task<UserResponse> CreateAsync(UserCreateRequest request);
    Task<UserResponse> UpdateAsync(Guid id, UserUpdateRequest request);
    Task ChangePasswordAsync(Guid id, string newPassword);
    Task ToggleActiveAsync(Guid id, Guid requestingUserId);
}
