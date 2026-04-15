using KuyumcuPrivate.Application.DTOs.Customers;
using KuyumcuPrivate.Application.Interfaces;
using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Services;

public class CustomerService(AppDbContext db, ICurrentStoreContext storeContext) : ICustomerService
{
    public async Task<List<CustomerResponse>> GetAllAsync(bool? includeDeleted = false)
    {
        // includeDeleted: null = tümü, true = sadece silinenler, false = sadece aktifler
        IQueryable<Customer> query = includeDeleted switch
        {
            null  => db.Customers.IgnoreQueryFilters(),           // Tümü (aktif + silinmiş)
            true  => db.Customers.IgnoreQueryFilters().Where(c => c.IsDeleted), // Sadece silinenler
            false => db.Customers,                                 // Sadece aktifler (global filtre geçerli)
        };

        // İnline projeksiyon: EF Core bunu SQL'e çevirebilir ve Photo blob'unu yüklemez
        return await query
            .OrderBy(c => c.LastName).ThenBy(c => c.FirstName)
            .Select(c => new CustomerResponse(
                c.Id,
                c.FirstName,
                c.LastName,
                c.FirstName + " " + c.LastName,
                c.Phone,
                c.Address,
                c.Email,
                c.NationalId,
                c.Type,
                c.Notes,
                c.Photo != null,
                c.IsDeleted,
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CustomerResponse?> GetByIdAsync(Guid id)
    {
        var c = await db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? null : ToResponse(c);
    }

    public async Task<CustomerResponse> CreateAsync(CustomerCreateRequest request)
    {
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var nationalId = string.IsNullOrWhiteSpace(request.NationalId) ? null : request.NationalId.Trim();

        if (phone != null && !request.IgnorePhoneWarning && await db.Customers.AnyAsync(c => c.Phone == phone && !c.IsDeleted))
            throw new InvalidOperationException("PHONE_EXISTS");
            
        if (nationalId != null && await db.Customers.AnyAsync(c => c.NationalId == nationalId && !c.IsDeleted))
            throw new InvalidOperationException("Bu TC Kimlik numarası ile kayıtlı bir müşteri zaten var.");

        var customer = new Customer
        {
            FirstName  = request.FirstName.Trim(),
            LastName   = request.LastName.Trim(),
            Phone      = phone,
            Address    = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
            Email      = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            NationalId = nationalId,
            Type       = request.Type,
            Notes      = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            StoreId    = storeContext.StoreId   // Mağaza izolasyonu
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        return ToResponse(customer);
    }

    public async Task<CustomerResponse?> UpdateAsync(Guid id, CustomerUpdateRequest request)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return null;

        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var nationalId = string.IsNullOrWhiteSpace(request.NationalId) ? null : request.NationalId.Trim();

        if (phone != null && customer.Phone != phone && !request.IgnorePhoneWarning && await db.Customers.AnyAsync(c => c.Phone == phone && !c.IsDeleted))
            throw new InvalidOperationException("PHONE_EXISTS");
            
        if (nationalId != null && customer.NationalId != nationalId && await db.Customers.AnyAsync(c => c.NationalId == nationalId && !c.IsDeleted))
            throw new InvalidOperationException("Bu TC Kimlik numarası ile kayıtlı bir müşteri zaten var.");

        customer.FirstName  = request.FirstName.Trim();
        customer.LastName   = request.LastName.Trim();
        customer.Phone      = phone;
        customer.Address    = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        customer.Email      = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        customer.NationalId = nationalId;
        customer.Type       = request.Type;
        customer.Notes      = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

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

    public async Task<bool> RestoreAsync(Guid id, bool resetBalances, Guid userId)
    {
        var customer = await db.Customers.IgnoreQueryFilters()
            .Include(c => c.Balances)
            .FirstOrDefaultAsync(c => c.Id == id);
            
        if (customer is null || !customer.IsDeleted) return false;

        customer.IsDeleted = false;

        if (resetBalances)
        {
            var activeBalances = customer.Balances.Where(b => b.Amount != 0).ToList();
            foreach (var b in activeBalances)
            {
                // Bakiyeyi sıfırlayacak ters işlem miktarı
                var adjustmentAmount = -b.Amount;
                var type = adjustmentAmount > 0 ? TransactionType.Deposit : TransactionType.Withdrawal;
                var absoluteAmount = Math.Abs(adjustmentAmount);

                var tx = new Transaction
                {
                    CustomerId = id,
                    AssetTypeId = b.AssetTypeId,
                    Amount = absoluteAmount,
                    Type = type,
                    Description = "Hesaba ait varlık durumları, müşterinin pasiften aktife alınmasıyla birlikte sıfırlandı.",
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };

                db.Transactions.Add(tx);

                // Bakiyeyi sıfırla
                b.Amount = 0;
                b.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UploadPhotoAsync(Guid id, byte[] photoBytes, string contentType)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return false;

        customer.Photo = photoBytes;
        customer.PhotoContentType = contentType;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<CustomerPhoto?> GetPhotoAsync(Guid id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer?.Photo == null) return null;
        return new CustomerPhoto(customer.Photo, customer.PhotoContentType ?? "image/jpeg");
    }

    public async Task<bool> DeletePhotoAsync(Guid id)
    {
        var customer = await db.Customers.FindAsync(id);
        if (customer is null) return false;

        if (customer.Photo != null)
        {
            customer.Photo = null;
            customer.PhotoContentType = null;
            await db.SaveChangesAsync();
        }
        
        return true;
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
        Type:        c.Type,
        Notes:       c.Notes,
        HasPhoto:    c.Photo is not null,
        IsDeleted:   c.IsDeleted,
        CreatedAt:   c.CreatedAt
    );
}
