using KuyumcuPrivate.Application.DTOs.Users;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class UserService(AppDbContext db) : IUserService
{
    public async Task<IEnumerable<UserResponse>> GetAllAsync()
    {
        return await db.Users
            .OrderBy(u => u.FullName)
            .Select(u => new UserResponse(u.Id, u.FullName, u.Username, u.Role.ToString(), u.IsActive))
            .ToListAsync();
    }

    public async Task<UserResponse> CreateAsync(UserCreateRequest request)
    {
        // Kullanıcı adı benzersizlik kontrolü
        var exists = await db.Users.AnyAsync(u => u.Username == request.Username);
        if (exists)
            throw new InvalidOperationException($"'{request.Username}' kullanıcı adı zaten kullanılıyor.");

        var user = new User
        {
            FullName     = request.FullName,
            Username     = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = request.Role,
            IsActive     = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return new UserResponse(user.Id, user.FullName, user.Username, user.Role.ToString(), user.IsActive);
    }

    public async Task<UserResponse> UpdateAsync(Guid id, UserUpdateRequest request)
    {
        var user = await db.Users.FindAsync(id)
            ?? throw new KeyNotFoundException("Kullanıcı bulunamadı.");

        // Kullanıcı adı değiştiyse benzersizlik kontrolü
        if (user.Username != request.Username)
        {
            var exists = await db.Users.AnyAsync(u => u.Username == request.Username && u.Id != id);
            if (exists)
                throw new InvalidOperationException($"'{request.Username}' kullanıcı adı zaten kullanılıyor.");
        }

        user.FullName = request.FullName;
        user.Username = request.Username;
        user.Role     = request.Role;
        user.IsActive = request.IsActive;

        await db.SaveChangesAsync();
        return new UserResponse(user.Id, user.FullName, user.Username, user.Role.ToString(), user.IsActive);
    }

    public async Task ChangePasswordAsync(Guid id, string newPassword)
    {
        var user = await db.Users.FindAsync(id)
            ?? throw new KeyNotFoundException("Kullanıcı bulunamadı.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
    }

    public async Task ToggleActiveAsync(Guid id, Guid requestingUserId)
    {
        if (id == requestingUserId)
            throw new InvalidOperationException("Kendi hesabınızı pasif yapamazsınız.");

        var user = await db.Users.FindAsync(id)
            ?? throw new KeyNotFoundException("Kullanıcı bulunamadı.");

        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync();
    }
}
