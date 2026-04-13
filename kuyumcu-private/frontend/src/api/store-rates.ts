import api from "./axios";

export interface StoreRateItem {
  buyingRate:  number | null;
  sellingRate: number | null;
  updatedAt:   string;
  updatedBy:   string;
}

export type StoreRatesMap = Record<string, StoreRateItem>;

export interface StoreRateUpsertPayload {
  [code: string]: { buyingRate: number | null; sellingRate: number | null };
}

export const storeRatesApi = {
  getAll: () =>
    api.get<StoreRatesMap>("/store-rates").then((r) => r.data),

  saveAll: (payload: StoreRateUpsertPayload) =>
    api.put<{ saved: number }>("/store-rates", payload).then((r) => r.data),
};
