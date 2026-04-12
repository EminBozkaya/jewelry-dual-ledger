using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace KuyumcuPrivate.Infrastructure.Services;

/// <summary>
/// TCMB EVDS (Elektronik Veri Dağıtım Sistemi) serisi verilerini çeken servis.
/// Nisan 2024 sonrası EVDS3 API: key header olarak gönderilir, URL parametresi olarak değil.
/// </summary>
public class EvdsService
{
    private readonly string? _apiKey;
    private readonly IHttpClientFactory _httpClientFactory;

    // EVDS3 API — evds2 artık evds3'e yönlendiriliyor
    private const string BaseUrl = "https://evds3.tcmb.gov.tr/igmevdsms-dis/";

    public EvdsService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _apiKey = configuration["Evds:ApiKey"];
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// Belirtilen EVDS seri kodunun en son değerini döndürür.
    /// Hafta sonu/tatil nedeniyle bugün veri yoksa son 10 günlük pencereye bakılır.
    /// </summary>
    public async Task<decimal?> GetLatestValueAsync(string seriesCode)
    {
        var (value, _) = await GetLatestValueWithDiagnosticsAsync(seriesCode);
        return value;
    }

    /// <summary>
    /// Değeri ve tanı bilgisini birlikte döndürür (debug endpoint için).
    /// </summary>
    public async Task<(decimal? Value, string Diagnostics)> GetLatestValueWithDiagnosticsAsync(string seriesCode)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            return (null, "API anahtarı yapılandırılmamış (Evds:ApiKey eksik)");

        var endDate   = DateTime.Today.ToString("dd-MM-yyyy");
        var startDate = DateTime.Today.AddDays(-10).ToString("dd-MM-yyyy");

        // EVDS3: parametreler ? olmadan doğrudan path'e eklenir, key header olarak gönderilir
        var url = $"{BaseUrl}series={seriesCode}&startDate={startDate}&endDate={endDate}&type=json";

        string rawResponse;
        try
        {
            var client = _httpClientFactory.CreateClient("evds");
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation("key", _apiKey);

            var response = await client.SendAsync(request);
            rawResponse = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return (null, $"URL: {url} | HTTP {(int)response.StatusCode}: {rawResponse[..Math.Min(300, rawResponse.Length)]}");
        }
        catch (Exception ex)
        {
            return (null, $"URL: {url} | HTTP hatası: {ex.GetType().Name} — {ex.Message}");
        }

        try
        {
            using var doc = JsonDocument.Parse(rawResponse);
            var root      = doc.RootElement;

            if (!root.TryGetProperty("items", out var items))
                return (null, $"URL: {url} | 'items' alanı bulunamadı. Ham yanıt: {rawResponse[..Math.Min(500, rawResponse.Length)]}");

            if (items.ValueKind != JsonValueKind.Array || items.GetArrayLength() == 0)
                return (null, "'items' dizisi boş veya dizi değil");

            var fieldName = seriesCode.Replace('.', '_');

            for (int i = items.GetArrayLength() - 1; i >= 0; i--)
            {
                var item = items[i];

                if (!item.TryGetProperty(fieldName, out var valueEl))
                {
                    // Alan hiç yoksa mevcut alanları listele
                    if (i == items.GetArrayLength() - 1)
                    {
                        var keys = string.Join(", ", item.EnumerateObject().Select(p => p.Name));
                        return (null, $"'{fieldName}' alanı bulunamadı. Mevcut alanlar: {keys}");
                    }
                    continue;
                }

                var rawValue = valueEl.ValueKind == JsonValueKind.String
                    ? valueEl.GetString()
                    : valueEl.GetRawText();

                if (string.IsNullOrWhiteSpace(rawValue) || rawValue == "ND")
                    continue;

                // EVDS3 null döndürebilir
                if (rawValue == "null")
                    continue;

                if (decimal.TryParse(rawValue,
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out var result))
                {
                    return (result, $"OK — {fieldName} = {result}");
                }

                return (null, $"Değer parse edilemedi: '{rawValue}'");
            }

            return (null, "Tüm kayıtlarda değer 'ND' veya boş");
        }
        catch (Exception ex)
        {
            return (null, $"URL: {url} | JSON parse hatası: {ex.Message} | Ham yanıt: {rawResponse[..Math.Min(300, rawResponse.Length)]}");
        }
    }
}
