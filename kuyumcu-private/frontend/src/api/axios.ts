import axios from "axios";
import { toast } from "sonner";
import i18n from "@/i18n";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — token ekle ve geliştirme ortamında store parametresi gönder
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth");
  if (stored) {
    const auth = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  // Geliştirme ortamında store bilgisini query string ile gönder
  // Production'da Caddy, subdomain'den X-Store-Slug header'ı ekler
  if (window.location.hostname === "localhost") {
    const storeSlug = localStorage.getItem("storeSlug") ?? "demo";
    const base = config.baseURL ?? "";
    const url = new URL(config.url!, base.startsWith("http") ? base : window.location.origin + base);
    url.searchParams.set("store", storeSlug);
    config.url = url.pathname + url.search;
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
