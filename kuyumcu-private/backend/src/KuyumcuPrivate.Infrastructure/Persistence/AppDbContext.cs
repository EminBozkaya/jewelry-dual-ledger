using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<AssetType> AssetTypes => Set<AssetType>();
    public DbSet<Balance> Balances => Set<Balance>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Conversion> Conversions => Set<Conversion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Role).HasConversion<string>();
        });

        // Customer
        modelBuilder.Entity<Customer>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasQueryFilter(x => !x.IsDeleted); // Soft delete global filtresi
        });

        // AssetType
        modelBuilder.Entity<AssetType>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.UnitType).HasConversion<string>();
            e.Property(x => x.GramWeight).HasPrecision(10, 4);
        });

        // Balance — bir müşterinin her varlık biriminden tek satırı olur
        modelBuilder.Entity<Balance>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CustomerId, x.AssetTypeId }).IsUnique();
            e.Property(x => x.Amount).HasPrecision(18, 6);
            e.HasOne(x => x.Customer).WithMany(x => x.Balances).HasForeignKey(x => x.CustomerId);
            e.HasOne(x => x.AssetType).WithMany(x => x.Balances).HasForeignKey(x => x.AssetTypeId);
        });

        // Transaction
        modelBuilder.Entity<Transaction>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Type).HasConversion<string>();
            e.Property(x => x.Amount).HasPrecision(18, 6);
            e.HasOne(x => x.Customer).WithMany(x => x.Transactions).HasForeignKey(x => x.CustomerId);
            e.HasOne(x => x.AssetType).WithMany(x => x.Transactions).HasForeignKey(x => x.AssetTypeId).IsRequired(false);
            e.HasOne(x => x.CreatedByUser).WithMany(x => x.Transactions).HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        });

        // Conversion
        modelBuilder.Entity<Conversion>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.FromAmount).HasPrecision(18, 6);
            e.Property(x => x.FromRateTry).HasPrecision(18, 6);
            e.Property(x => x.TryEquivalent).HasPrecision(18, 6);
            e.Property(x => x.ToAmount).HasPrecision(18, 6);
            e.Property(x => x.ToRateTry).HasPrecision(18, 6);
            e.Property(x => x.RateSource).HasConversion<string>();
            e.HasOne(x => x.Transaction).WithOne(x => x.Conversion).HasForeignKey<Conversion>(x => x.TransactionId);
            e.HasOne(x => x.FromAsset).WithMany().HasForeignKey(x => x.FromAssetId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ToAsset).WithMany().HasForeignKey(x => x.ToAssetId).OnDelete(DeleteBehavior.Restrict);
        });

        // Seed: Varsayılan varlık birimleri
        SeedAssetTypes(modelBuilder);
        SeedUsers(modelBuilder);
    }

    private static void SeedUsers(ModelBuilder modelBuilder)
    {
        // Varsayılan admin kullanıcısı — ilk girişten sonra şifre değiştirilmeli
        modelBuilder.Entity<User>().HasData(new User
        {
            Id           = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            FullName     = "Sistem Yöneticisi",
            Username     = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role         = UserRole.Admin,
            IsActive     = true
        });
    }

    private static void SeedAssetTypes(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AssetType>().HasData(
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Code = "TRY",    Name = "Türk Lirası",    UnitType = UnitType.Currency, SortOrder = 1 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Code = "USD",    Name = "Dolar",          UnitType = UnitType.Currency, SortOrder = 2 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000003"), Code = "EUR",    Name = "Euro",           UnitType = UnitType.Currency, SortOrder = 3 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000004"), Code = "GBP",    Name = "Sterlin",        UnitType = UnitType.Currency, SortOrder = 4 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000005"), Code = "GOLD22", Name = "22 Ayar Altın",  UnitType = UnitType.Gram,     Karat = 22, GramWeight = 1m,     SortOrder = 5 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000006"), Code = "GOLD24", Name = "24 Ayar Altın",  UnitType = UnitType.Gram,     Karat = 24, GramWeight = 1m,     SortOrder = 6 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000007"), Code = "CEYREK", Name = "Çeyrek Altın",   UnitType = UnitType.Piece,    Karat = 22, GramWeight = 1.75m,  SortOrder = 7 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000008"), Code = "YARIM",  Name = "Yarım Altın",    UnitType = UnitType.Piece,    Karat = 22, GramWeight = 3.50m,  SortOrder = 8 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000009"), Code = "LIRA",   Name = "Tam Altın",      UnitType = UnitType.Piece,    Karat = 22, GramWeight = 7.02m,  SortOrder = 9 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000010"), Code = "ATA",    Name = "Ata Altın",      UnitType = UnitType.Piece,    Karat = 22, GramWeight = 7.21m,  SortOrder = 10 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000011"), Code = "GREMSE", Name = "Gremse Altın",   UnitType = UnitType.Piece,    Karat = 22, GramWeight = 17.54m, SortOrder = 11 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000012"), Code = "BESLI",  Name = "Beşli Altın",    UnitType = UnitType.Piece,    Karat = 22, GramWeight = 35.08m, SortOrder = 12 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000013"), Code = "SILVER", Name = "Gümüş",          UnitType = UnitType.Gram,     GramWeight = 1m,                 SortOrder = 13 }
        );
    }
}
