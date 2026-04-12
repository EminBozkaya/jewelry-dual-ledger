GOAL
Create a .NET backend service that fetches exchange rates and precious metal prices
from TCMB and gold-api.com.

DATA SOURCES

1. TCMB EVDS3 API — döviz kurları (daily exchange rates)
2. TCMB today.xml — döviz kurları (XML format)
3. gold-api.com — altın/gümüş ons fiyatları (free, no API key required)

## EVDS3 API

BASE URL
https://evds3.tcmb.gov.tr/igmevdsms-dis/

NOTE: evds2.tcmb.gov.tr artık evds3'e 302 redirect yapıyor.
Nisan 2024'ten itibaren API key URL parametresi yerine HTTP header olarak gönderilmeli.

AUTHENTICATION
HTTP header: key: YOUR_API_KEY

REQUEST FORMAT
GET request returning JSON.
Parametreler ? olmadan doğrudan path'e eklenir (EVDS resmi API formatı).

EXAMPLE REQUEST

GET https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.DK.USD.S.YTL&startDate=01-04-2026&endDate=12-04-2026&type=json
Header: key: YOUR_API_KEY

EXPECTED RESPONSE

{
  "totalCount": 12,
  "items": [
    {
      "Tarih": "01-04-2026",
      "TP_DK_USD_S_YTL": "44.47610000",
      "UNIXTIME": {"$numberLong": "1774990800"}
    }
  ]
}

IMPORTANT NOTES

- TP.ALTIN.S1, TP.ALTIN.A1, TP.GUMUS.S1, TP.GUMUS.A1 serileri
  EVDS3'ten kaldırılmıştır. Bu seriler artık mevcut değil.
- Altın/gümüş ons fiyatları için gold-api.com kullanılmaktadır.

## gold-api.com

BASE URL
https://api.gold-api.com

AUTHENTICATION
Gerektirmez — tamamen ücretsiz, rate limit yok.

ENDPOINTS

GET /price/XAU — Altın ons fiyatı (USD)
GET /price/XAG — Gümüş ons fiyatı (USD)
GET /symbols  — Mevcut semboller

EXAMPLE RESPONSE (XAU)

{
  "currency": "USD",
  "name": "Gold",
  "price": 4749.20,
  "symbol": "XAU",
  "updatedAt": "2026-04-12T14:43:27Z"
}

## CONVERSION FORMULAS

Ons → Gram (24K TRY):
  GramGold24k = (OunceGoldUSD * USDTRY) / 31.1035

Gram → Karat:
  GramGoldXK = GramGold24k * (Karat / 24)

Adet → TL:
  PieceGold = GramGoldXK * GramWeight

TECH STACK

.NET 10
HttpClient
System.Text.Json
