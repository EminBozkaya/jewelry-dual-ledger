import api from "./axios";
import type { CustomerTypeConfig } from "@/types";

export interface CustomerTypeConfigCreateRequest {
  value: number;
  name: string;
  colorHex?: string;
}

export interface CustomerTypeConfigUpdateRequest {
  value: number;
  name: string;
  colorHex?: string;
}

export const customerTypeApi = {
  /** Aktif müşteri tipleri — select listelerde vb. kullanılır */
  getAll: () => api.get<CustomerTypeConfig[]>("/customer-types").then((r) => r.data),

  /** Tümü (pasifler dahil) — admin yönetim paneli */
  getAllIncludingInactive: () =>
    api.get<CustomerTypeConfig[]>("/customer-types/all").then((r) => r.data),

  /** Yeni müşteri tipi oluştur */
  create: (data: CustomerTypeConfigCreateRequest) =>
    api.post<CustomerTypeConfig>("/customer-types", data).then((r) => r.data),

  /** Mevcut müşteri tipini güncelle */
  update: (id: string, data: CustomerTypeConfigUpdateRequest) =>
    api.put<CustomerTypeConfig>(`/customer-types/${id}`, data).then((r) => r.data),

  /** Aktif/Pasif durumunu değiştir */
  toggleActive: (id: string) =>
    api.put<CustomerTypeConfig>(`/customer-types/${id}/toggle-active`).then((r) => r.data),

  /** Akıllı silme: kullanılmıyorsa hard delete, kullanılıyorsa soft delete */
  delete: (id: string) =>
    api
      .delete<{ action: string; message: string }>(`/customer-types/${id}`)
      .then((r) => r.data),

  /** Toplu sıralama güncelle (drag & drop) */
  reorder: (items: { id: string; sortOrder: number }[]) =>
    api.put("/customer-types/reorder", items).then((r) => r.data),
};
