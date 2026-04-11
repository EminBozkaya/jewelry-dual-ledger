using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class CustomerService(AppDbContext db) : ICustomerService
{
    public async Task<List<CustomerResponse>> GetAllAsync()
    {
        return await db.Customers
            .OrderBy(c => c.LastName).ThenBy(c => c.FirstName)
            .Select(c => ToResponse(c))
            .ToListAsync();
    }

    public async Task<CustomerResponse?> GetByIdAsync(Guid id)
    {
        var c = await db.Customers.FindAsync(id);
        return c is null ? null : ToResponse(c);
    }

    public async Task<CustomerResponse> CreateAsync(CustomerCreateRequest request)
    {
        var customer = new Customer
        {
            FirstName  = request.FirstName.Trim(),
            LastName   = request.LastName.Trim(),
            Phone      = request.Phone.Trim(),
            Address    = request.Address?.Trim(),
            Email      = request.Email?.Trim(),
            NationalId = request.NationalId?.Trim(),
            Notes      = request.Notes?.Trim()
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        return ToResponse(customer);
    }

    public async Task<CustomerResponse?> UpdateAsync(Guid id, CustomerUpdateRequest request)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return null;

        customer.FirstName  = request.FirstName.Trim();
        customer.LastName   = request.LastName.Trim();
        customer.Phone      = request.Phone.Trim();
        customer.Address    = request.Address?.Trim();
        customer.Email      = request.Email?.Trim();
        customer.NationalId = request.NationalId?.Trim();
        customer.Notes      = request.Notes?.Trim();

        await db.SaveChangesAsync();
        return ToResponse(customer);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return false;

        customer.IsDeleted = true; // Soft delete — kayıt silinmez
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UploadPhotoAsync(Guid id, byte[] photoBytes)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return false;

        customer.Photo = photoBytes;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]?> GetPhotoAsync(Guid id)
    {
        var customer = await db.Customers.FindAsync(id);
        return customer?.Photo;
    }

    private static CustomerResponse ToResponse(Customer c) => new(
        Id:          c.Id,
        FirstName:   c.FirstName,
        LastName:    c.LastName,
        FullName:    $"{c.FirstName} {c.LastName}",
        Phone:       c.Phone,
        Address:     c.Address,
        Email:       c.Email,
        NationalId:  c.NationalId,
        Notes:       c.Notes,
        HasPhoto:    c.Photo is not null,
        CreatedAt:   c.CreatedAt
    );
}
