import api from "./axios";
import type { Customer, CustomerCreateRequest, CustomerUpdateRequest } from "@/types";

export const customerApi = {
  getAll: (includeDeleted?: boolean | null) =>
    api.get<Customer[]>("/customers", {
      params: includeDeleted !== undefined ? { includeDeleted } : undefined,
    }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Customer>(`/customers/${id}`).then((r) => r.data),

  create: (data: CustomerCreateRequest) =>
    api.post<Customer>("/customers", data).then((r) => r.data),

  update: (id: string, data: CustomerUpdateRequest) =>
    api.put<Customer>(`/customers/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/customers/${id}`),

  restore: (id: string, resetBalances: boolean) =>
    api.post(`/customers/${id}/restore`, null, { params: { resetBalances } }),

  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return api.post(`/customers/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deletePhoto: (id: string) => api.delete(`/customers/${id}/photo`),

  getPhotoUrl: (id: string) => `/api/customers/${id}/photo`,
};
