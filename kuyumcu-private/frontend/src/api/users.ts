import api from "./axios";
import type { User, UserCreateRequest } from "@/types";

export interface UserUpdateRequest {
  fullName: string;
  username: string;
  role: "SuperAdmin" | "Admin" | "Staff";
  isActive: boolean;
}

export const userApi = {
  getAll: () => api.get<User[]>("/users").then((r) => r.data),

  create: (data: UserCreateRequest) =>
    api.post<User>("/users", data).then((r) => r.data),

  update: (id: string, data: UserUpdateRequest) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),

  changePassword: (id: string, newPassword: string) =>
    api.put(`/users/${id}/password`, { newPassword }),

  toggleActive: (id: string) =>
    api.put(`/users/${id}/toggle-active`),
};
