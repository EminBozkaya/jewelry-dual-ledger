using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KuyumcuPrivate.Application.DTOs.Auth;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace KuyumcuPrivate.Infrastructure.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await db.Users
            .IgnoreQueryFilters()  // Login store filter'dan muaf — kullanıcı tüm mağazalarda aranır
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        var expiryHours = config.GetValue<int>("Jwt:ExpiryHours");
        var expiresAt = DateTime.UtcNow.AddHours(expiryHours);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("store_id", user.StoreId.ToString())   // Mağaza claim'i
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        // Kullanıcının store'unu çek (slug için)
        var store = await db.Stores
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == user.StoreId);

        return new LoginResponse(
            Token: new JwtSecurityTokenHandler().WriteToken(token),
            FullName: user.FullName,
            Role: user.Role.ToString(),
            ExpiresAt: expiresAt,
            StoreSlug: store?.Slug ?? "",
            StoreId: user.StoreId
        );
    }
}
