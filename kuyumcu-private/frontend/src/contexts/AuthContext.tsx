import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthUser, LoginRequest } from "@/types";
import { authApi } from "@/api/auth";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Token süresi dolmuşsa temizle
    if (new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem("auth");
      return null;
    }
    return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
  });

  const login = async (request: LoginRequest) => {
    const response = await authApi.login(request);
    const authUser: AuthUser = {
      token: response.token,
      fullName: response.fullName,
      role: response.role as "Admin" | "Staff",
      expiresAt: new Date(response.expiresAt),
    };
    localStorage.setItem("auth", JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setUser(null);
  };

  // Token süre kontrolü — periyodik
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (user.expiresAt < new Date()) {
        logout();
      }
    }, 60_000); // Her dakika kontrol
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "Admin",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
