import api from "./axios";

export const ratesApi = {
  /** TCMB günlük ForexSelling kurları: { "USD": 38.52, "EUR": 42.10, ... } */
  getTcmb: () =>
    api.get<Record<string, number>>("/rates/tcmb").then((r) => r.data),

  /** Döviz kurları (TCMB) + altın/gümüş fiyatları (gold-api.com). API erişimi başarısız olursa null olabilir. */
  getAll: (rateType: "Selling" | "Buying" | "Average" = "Selling") =>
    api.get<AllRatesResponse>("/rates/all", { params: { rateType } }).then((r) => r.data),
};

export interface AllRatesResponse {
  currencies: Record<string, number>;
  goldGramTry24k: number | null;
  goldOunceUsd: number | null;
  silverGramTry: number | null;
  silverOunceUsd: number | null;
  usdTry: number | null;
}
