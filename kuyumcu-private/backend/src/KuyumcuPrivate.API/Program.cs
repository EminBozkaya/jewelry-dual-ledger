using System.Text;
using System.Text.Json.Serialization;
using KuyumcuPrivate.API.Endpoints;
using KuyumcuPrivate.API.Middleware;
using KuyumcuPrivate.Infrastructure;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Hassas anahtarları git'e gitmeyecek yerel config'den yükle
//builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Veritabanı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Servisler
builder.Services.AddInfrastructure();
builder.Services.AddScoped<KuyumcuPrivate.Infrastructure.Services.EvdsService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin", "SuperAdmin"));

    options.AddPolicy("SuperAdminOnly", policy =>
        policy.RequireRole("SuperAdmin"));
});

// CORS — React frontend lokal ağdan erişecek
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() 
                  ?? [];

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));


// TCMB HTTP istemcisi
builder.Services.AddHttpClient("tcmb", c =>
{
    c.BaseAddress = new Uri("https://www.tcmb.gov.tr");
    c.Timeout = TimeSpan.FromSeconds(10);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
});

// EVDS HTTP istemcisi (TCMB EVDS3 API)
// UseProxy=false: sistem proxy'sinin devreye girmesini engeller
builder.Services.AddHttpClient("evds", c =>
{
    c.Timeout = TimeSpan.FromSeconds(15);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    UseProxy = false
});

// Kıymetli metal fiyatları (gold-api.com — ücretsiz, key gerektirmez)
builder.Services.AddHttpClient("metals", c =>
{
    c.Timeout = TimeSpan.FromSeconds(10);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    UseProxy = false
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAntiforgery();

var app = builder.Build();

app.UseCors();

// 1. Store çözümleme — her şeyden önce
app.UseMiddleware<StoreResolutionMiddleware>();

// 2. Authentication
app.UseAuthentication();
app.UseAuthorization();

// 3. Store claim doğrulama — auth'dan sonra
app.UseMiddleware<StoreClaimValidationMiddleware>();

app.UseAntiforgery();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Migration otomatik uygula
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Endpoint'leri kaydet
app.MapAuthEndpoints();
app.MapCustomerEndpoints();
app.MapTransactionEndpoints();
app.MapBalanceEndpoints();
app.MapAssetTypeEndpoints();
app.MapCustomerTypeConfigEndpoints();

app.MapDashboardEndpoints();
app.MapReportEndpoints();
app.MapUserEndpoints();
app.MapRatesEndpoints();
app.MapStoreSettingEndpoints();
app.MapPlatformEndpoints();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

// ─── Startup Information Log (Development Only) ──────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        var cfg  = app.Configuration;
        var env  = app.Environment;
        
        // Portu dinamik al
        var server = app.Services.GetService<Microsoft.AspNetCore.Hosting.Server.IServer>();
        var addresses = server?.Features.Get<Microsoft.AspNetCore.Hosting.Server.Features.IServerAddressesFeature>()?.Addresses;
        var localUrl  = addresses?.FirstOrDefault(a => a.StartsWith("http:")) 
                        ?? addresses?.FirstOrDefault() 
                        ?? "http://localhost:5000";

        // Connection string'den güvenli bilgileri parse et
        var connStr  = cfg.GetConnectionString("DefaultConnection") ?? "";
        var connParts = connStr.Split(';', StringSplitOptions.RemoveEmptyEntries)
                               .Select(p => p.Split('=', 2))
                               .Where(p => p.Length == 2)
                               .ToDictionary(p => p[0].Trim(), p => p[1].Trim(),
                                             StringComparer.OrdinalIgnoreCase);

        var dbHost = connParts.GetValueOrDefault("Host", "?");
        var dbPort = connParts.GetValueOrDefault("Port", "5432");
        var dbName = connParts.GetValueOrDefault("Database", "?");
        var dbUser = connParts.GetValueOrDefault("Username", "?");

        var jwtIssuer  = cfg["Jwt:Issuer"]      ?? "?";
        var jwtExpiry  = cfg["Jwt:ExpiryHours"] ?? "?";
        var jwtAudience= cfg["Jwt:Audience"]    ?? "?";

        var sep = new string('─', 60);

        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"  ┌{sep}┐");
        Console.WriteLine($"  │{"  🏅  Jeweler Private API — Initial Report",-60}│");
        Console.WriteLine($"  └{sep}┘");
        Console.ResetColor();

        // Ortam
        Console.ForegroundColor = ConsoleColor.Green;
        Console.Write("  ► Environment  : ");
        Console.ResetColor();
        Console.WriteLine(env.EnvironmentName);

        // Veritabanı
        Console.ForegroundColor = ConsoleColor.Magenta;
        Console.WriteLine("  ► Database     : ");
        Console.ResetColor();
        Console.WriteLine($"                   - host     : {dbHost}:{dbPort}");
        Console.WriteLine($"                   - db name  : {dbName}");
        Console.WriteLine($"                   - db owner : {dbUser}");

        // Migration notu
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.WriteLine("                   (Migrations auto-applied)");
        Console.ResetColor();

        // JWT
        Console.ForegroundColor = ConsoleColor.Blue;
        Console.Write("  ► JWT          : ");
        Console.ResetColor();
        Console.WriteLine($"issuer={jwtIssuer}  audience={jwtAudience}  expiry={jwtExpiry}h");

        // Swagger
        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.Write("  ► Swagger UI   : ");
        Console.ResetColor();
        Console.WriteLine($"{localUrl}/swagger");

        // Kayıtlı endpoint grupları
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.WriteLine("  ► Endpoints    : auth · customers · transactions · balance");
        Console.WriteLine("                   assetTypes · customerTypes · dashboard · reports");
        Console.WriteLine("                   users · rates · /health");

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"  {sep}");
        Console.ResetColor();
        Console.WriteLine();
    });
}
// ─────────────────────────────────────────────────────────────────────────────

app.Run();
