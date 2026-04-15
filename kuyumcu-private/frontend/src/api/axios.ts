import axios from "axios";
import { toast } from "sonner";
import i18n from "@/i18n";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — token ekle
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth");
  if (stored) {
    const auth = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// Response interceptor — hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      toast.error(i18n.t("api.unauthorized"));
      return Promise.reject(error);
    }

    if (error.response?.status >= 500) {
      toast.error(i18n.t("api.serverError"));
      return Promise.reject(error);
    }

    if (!error.response) {
      toast.error(i18n.t("api.networkError"));
    }

    return Promise.reject(error);
  }
);

export default api;
