using KuyumcuPrivate.Domain.Entities;
using KuyumcuPrivate.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace KuyumcuPrivate.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<AssetType> AssetTypes => Set<AssetType>();
    public DbSet<CustomerTypeConfig> CustomerTypeConfigs => Set<CustomerTypeConfig>();
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

        // CustomerTypeConfig
        modelBuilder.Entity<CustomerTypeConfig>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Value).IsUnique();
        });

        // Seed: Varsayılan varlık birimleri ve müşteri tipleri
        SeedAssetTypes(modelBuilder);
        SeedCustomerTypeConfigs(modelBuilder);
        SeedUsers(modelBuilder);
    }

    private static void SeedCustomerTypeConfigs(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CustomerTypeConfig>().HasData(
            new CustomerTypeConfig { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), Value = 0, Name = "Özel Müşteri",  ColorHex = "#3b82f6", IsActive = true, SortOrder = 1 },
            new CustomerTypeConfig { Id = Guid.Parse("10000000-0000-0000-0000-000000000002"), Value = 1, Name = "Kuyumcu",       ColorHex = "#8b5cf6", IsActive = true, SortOrder = 2 },
            new CustomerTypeConfig { Id = Guid.Parse("10000000-0000-0000-0000-000000000003"), Value = 2, Name = "Tedarikçi",     ColorHex = "#f59e0b", IsActive = true, SortOrder = 3 }
        );
    }

    private static void SeedUsers(ModelBuilder modelBuilder)
    {
        // Varsayılan admin kullanıcısı — ilk girişten sonra şifre değiştirilmeli
        modelBuilder.Entity<User>().HasData(new User
        {
            Id           = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            FullName     = "Sistem Yöneticisi",
            Username     = "admin",
            PasswordHash = "$2a$11$Hlu3yqAS8.BJeHGwZmW06eSSS7dZnaVQNyHwgbN.AbW9G0ly4waj2",
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
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000014"), Code = "SAR",    Name = "Suudi Riyali",   UnitType = UnitType.Currency, SortOrder = 5 },
            // Gram altın
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000005"), Code = "GOLD22",    Name = "22 Ayar Altın",        UnitType = UnitType.Gram,  Karat = 22, GramWeight = 1.0000m,  SortOrder = 6 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000006"), Code = "GOLD24",    Name = "24 Ayar Altın",        UnitType = UnitType.Gram,  Karat = 24, GramWeight = 1.0000m,  SortOrder = 7 },
            // Cumhuriyet serisi (adet) — mevcut ID'ler korunuyor
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000007"), Code = "C_CEYREK",  Name = "Cumhuriyet Çeyrek",    UnitType = UnitType.Piece, Karat = 22, GramWeight = 1.7540m,  SortOrder = 8 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000008"), Code = "C_YARIM",   Name = "Cumhuriyet Yarım",     UnitType = UnitType.Piece, Karat = 22, GramWeight = 3.5080m,  SortOrder = 9 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000009"), Code = "C_TAM",     Name = "Cumhuriyet Tam",       UnitType = UnitType.Piece, Karat = 22, GramWeight = 7.0160m,  SortOrder = 10 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000011"), Code = "C_GREMSE",  Name = "Cumhuriyet Gremse",    UnitType = UnitType.Piece, Karat = 22, GramWeight = 17.5400m, SortOrder = 11 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000012"), Code = "C_BESLI",   Name = "Cumhuriyet Beşli",     UnitType = UnitType.Piece, Karat = 22, GramWeight = 35.0800m, SortOrder = 12 },
            // Reşat serisi (adet)
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000015"), Code = "R_CEYREK",  Name = "Reşat Çeyrek",         UnitType = UnitType.Piece, Karat = 22, GramWeight = 1.8040m,  SortOrder = 13 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000016"), Code = "R_YARIM",   Name = "Reşat Yarım",          UnitType = UnitType.Piece, Karat = 22, GramWeight = 3.6080m,  SortOrder = 14 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000010"), Code = "R_TAM",     Name = "Reşat Tam",            UnitType = UnitType.Piece, Karat = 22, GramWeight = 7.2160m,  SortOrder = 15 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000017"), Code = "R_GREMSE",  Name = "Reşat Gremse",         UnitType = UnitType.Piece, Karat = 22, GramWeight = 18.0400m, SortOrder = 16 },
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000018"), Code = "R_BESLI",   Name = "Reşat Beşli",          UnitType = UnitType.Piece, Karat = 22, GramWeight = 36.0800m, SortOrder = 17 },
            // Gümüş
            new AssetType { Id = Guid.Parse("00000000-0000-0000-0000-000000000013"), Code = "SILVER",    Name = "Gümüş",                UnitType = UnitType.Gram,  GramWeight = 1.0000m,              SortOrder = 18 }
        );
    }
}
