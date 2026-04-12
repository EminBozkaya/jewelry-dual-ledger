using System.Text.Json;
using System.Xml.Linq;
using KuyumcuPrivate.Infrastructure.Services;

namespace KuyumcuPrivate.API.Endpoints;

// ── Response kayıtları ────────────────────────────────────────────────────────

/// <summary>
/// /api/rates/all endpoint response modeli.
/// goldGramTry24k, goldOunceUsd, silverGramTry ve usdTry
/// API erişimi başarısız olursa null olabilir.
/// </summary>
public record AllRatesResponse(
    Dictionary<string, decimal> Currencies,
    decimal? GoldGramTry24k,
    decimal? GoldOunceUsd,
    decimal? SilverGramTry,
    decimal? SilverOunceUsd,
    decimal? UsdTry
);

// ── Endpoint tanımları ────────────────────────────────────────────────────────

public static class RatesEndpoints
{
    public static void MapRatesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/rates").WithTags("Rates").RequireAuthorization();

        // GET /api/rates/tcmb — TCMB günlük döviz kurları (ForexSelling)
        group.MapGet("/tcmb", async (IHttpClientFactory httpFactory) =>
        {
            try
            {
                var client = httpFactory.CreateClient("tcmb");
                var xml = await client.GetStringAsync("https://www.tcmb.gov.tr/kurlar/today.xml");
                var doc = XDocument.Parse(xml);

                var rates = new Dictionary<string, decimal> { ["TRY"] = 1m };

                foreach (var el in doc.Root!.Elements("Currency"))
                {
                    var code       = el.Attribute("CurrencyCode")?.Value;
                    var unitRaw    = el.Element("Unit")?.Value;
                    var sellingRaw = el.Element("ForexSelling")?.Value;

                    if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(sellingRaw))
                        continue;

                    if (!decimal.TryParse(sellingRaw,
                            System.Globalization.NumberStyles.Any,
                            System.Globalization.CultureInfo.InvariantCulture,
                            out var selling))
                        continue;

                    int.TryParse(unitRaw, out var unit);
                    if (unit <= 0) unit = 1;

                    rates[code] = Math.Round(selling / unit, 6);
                }

                return Results.Ok(rates);
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    title: "TCMB kurları alınamadı",
                    statusCode: 502);
            }
        });

        // GET /api/rates/evds-debug?series=TP.DK.USD.S.YTL — EVDS ham yanıtını tanı amaçlı gösterir (auth gerekmez)
        app.MapGet("/api/rates/evds-debug", async (EvdsService evdsService, string series = "TP.DK.USD.S.YTL") =>
        {
            var (value, diagnostics) = await evdsService.GetLatestValueWithDiagnosticsAsync(series);
            return Results.Ok(new { series, value, diagnostics });
        }).AllowAnonymous();

        // GET /api/rates/all?rateType=Selling|Buying|Average
        // Döviz kurları (TCMB) + altın/gümüş fiyatları (gold-api.com)
        group.MapGet("/all", async (
            IHttpClientFactory httpFactory,
            string rateType = "Selling") =>
        {
            // rateType normalizasyonu
            rateType = rateType.Trim();
            if (rateType != "Buying" && rateType != "Average") rateType = "Selling";

            // ── 1. TCMB today.xml — döviz kurları ────────────────────────────
            Dictionary<string, decimal> currencies;
            try
            {
                var client = httpFactory.CreateClient("tcmb");
                var xml = await client.GetStringAsync("https://www.tcmb.gov.tr/kurlar/today.xml");
                var doc = XDocument.Parse(xml);

                currencies = new Dictionary<string, decimal> { ["TRY"] = 1m };

                foreach (var el in doc.Root!.Elements("Currency"))
                {
                    var code       = el.Attribute("CurrencyCode")?.Value;
                    var unitRaw    = el.Element("Unit")?.Value;
                    var buyingRaw  = el.Element("ForexBuying")?.Value;
                    var sellingRaw = el.Element("ForexSelling")?.Value;

                    if (string.IsNullOrWhiteSpace(code)) continue;

                    int.TryParse(unitRaw, out var unit);
                    if (unit <= 0) unit = 1;

                    decimal? buying  = TryParseDecimal(buyingRaw);
                    decimal? selling = TryParseDecimal(sellingRaw);

                    // En az satış kuru zorunlu; bazı çapraz kurlarda alış boş olabilir
                    if (selling == null) continue;

                    decimal rate = rateType switch
                    {
                        "Buying"  => buying ?? selling.Value,
                        "Average" => buying.HasValue
                                         ? (buying.Value + selling.Value) / 2m
                                         : selling.Value,
                        _         => selling.Value     // "Selling" (varsayılan)
                    };

                    currencies[code] = Math.Round(rate / unit, 6);
                }
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    title: "TCMB kurları alınamadı",
                    statusCode: 502);
            }

            // ── 2. USD/TRY al ─────────────────────────────────────────────────
            currencies.TryGetValue("USD", out var usdTry);

            // ── 3. Altın & gümüş fiyatları (gold-api.com — ücretsiz, key gerektirmez)
            //    TP.ALTIN.S1 / TP.GUMUS.S1 serileri EVDS3'ten kaldırıldı.
            //    Alternatif: gold-api.com anlık ons fiyatları (USD).
            decimal? goldOunceUsd   = null;
            decimal? goldGramTry24k = null;
            decimal? silverOunceUsd = null;
            decimal? silverGramTry  = null;

            try
            {
                var metalClient = httpFactory.CreateClient("metals");

                var goldTask   = metalClient.GetStringAsync("https://api.gold-api.com/price/XAU");
                var silverTask = metalClient.GetStringAsync("https://api.gold-api.com/price/XAG");
                await Task.WhenAll(goldTask, silverTask);

                goldOunceUsd   = ParseGoldApiPrice(goldTask.Result);
                silverOunceUsd = ParseGoldApiPrice(silverTask.Result);

                if (goldOunceUsd.HasValue && usdTry > 0)
                    goldGramTry24k = Math.Round((goldOunceUsd.Value * usdTry) / 31.1035m, 4);

                if (silverOunceUsd.HasValue && usdTry > 0)
                    silverGramTry = Math.Round((silverOunceUsd.Value * usdTry) / 31.1035m, 4);
            }
            catch
            {
                // Metal fiyatları alınamadı — graceful degradation
            }

            return Results.Ok(new AllRatesResponse(
                Currencies:     currencies,
                GoldGramTry24k: goldGramTry24k,
                GoldOunceUsd:   goldOunceUsd,
                SilverGramTry:  silverGramTry,
                SilverOunceUsd: silverOunceUsd,
                UsdTry:         usdTry > 0 ? usdTry : null
            ));
        });
    }

    // ── Yardımcı ─────────────────────────────────────────────────────────────

    private static decimal? TryParseDecimal(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return decimal.TryParse(raw,
            System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture,
            out var v) ? v : null;
    }

    /// <summary>
    /// gold-api.com JSON yanıtından "price" alanını parse eder.
    /// Örnek: {"price":4749.20,"symbol":"XAU","currency":"USD",...}
    /// </summary>
    private static decimal? ParseGoldApiPrice(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("price", out var priceEl))
            {
                return priceEl.ValueKind switch
                {
                    JsonValueKind.Number => priceEl.GetDecimal(),
                    JsonValueKind.String => decimal.TryParse(
                        priceEl.GetString(),
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out var v) ? v : null,
                    _ => null
                };
            }
        }
        catch { }
        return null;
    }
}
