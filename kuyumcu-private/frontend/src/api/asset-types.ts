import api from "./axios";
import type { AssetType } from "@/types";

export interface AssetTypeCreateRequest {
  code: string;
  name: string;
  unitType: string;
  karat?: number | null;
  gramWeight?: number | null;
}

export interface AssetTypeUpdateRequest {
  code: string;
  name: string;
  unitType: string;
  karat?: number | null;
  gramWeight?: number | null;
  sortOrder: number;
}

export const assetTypeApi = {
  /** Aktif varlık tipleri — select listelerde vs. kullanılır */
  getAll: () => api.get<AssetType[]>("/asset-types").then((r) => r.data),

  /** Tümü (pasifler dahil) — admin yönetim paneli */
  getAllIncludingInactive: () =>
    api.get<AssetType[]>("/asset-types/all").then((r) => r.data),

  /** Yeni varlık tipi oluştur */
  create: (data: AssetTypeCreateRequest) =>
    api.post<AssetType>("/asset-types", data).then((r) => r.data),

  /** Mevcut varlık tipini güncelle */
  update: (id: string, data: AssetTypeUpdateRequest) =>
    api.put<AssetType>(`/asset-types/${id}`, data).then((r) => r.data),

  /** Aktif/Pasif durumunu değiştir (soft delete) */
  toggleActive: (id: string) =>
    api.put<AssetType>(`/asset-types/${id}/toggle-active`).then((r) => r.data),

  /** Akıllı silme: kullanılmıyorsa hard delete, kullanılıyorsa soft delete */
  delete: (id: string) =>
    api
      .delete<{ action: string; message: string }>(`/asset-types/${id}`)
      .then((r) => r.data),

  /** Toplu sıralama güncelle (drag & drop) */
  reorder: (items: { id: string; sortOrder: number }[]) =>
    api.put("/asset-types/reorder", items).then((r) => r.data),
};
