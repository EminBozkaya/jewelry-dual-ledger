import api from "./axios";
import type { User, UserCreateRequest } from "@/types";

export const userApi = {
  getAll: () => api.get<User[]>("/users").then((r) => r.data),

  create: (data: UserCreateRequest) =>
    api.post<User>("/users", data).then((r) => r.data),

  update: (id: string, data: Partial<UserCreateRequest>) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),

  deactivate: (id: string) => api.post(`/users/${id}/deactivate`),

  activate: (id: string) => api.post(`/users/${id}/activate`),
};
