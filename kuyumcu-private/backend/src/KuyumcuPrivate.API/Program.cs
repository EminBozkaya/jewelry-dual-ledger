using System.Text;
using System.Text.Json.Serialization;
using KuyumcuPrivate.API.Endpoints;
using KuyumcuPrivate.Infrastructure;
using KuyumcuPrivate.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Hassas anahtarları git'e gitmeyecek yerel config'den yükle
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

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
        policy.RequireRole("Admin"));
});

// CORS — React frontend lokal ağdan erişecek
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));


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
app.UseAuthentication();
app.UseAuthorization();
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

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
