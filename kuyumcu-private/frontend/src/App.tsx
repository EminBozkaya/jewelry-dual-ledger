import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomerListPage } from "@/pages/customers/CustomerListPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { TransactionPage } from "@/pages/transactions/TransactionPage";
import { PortfolioReportPage } from "@/pages/reports/PortfolioReportPage";
import { DailyReportPage } from "@/pages/reports/DailyReportPage";
import { CustomerStatementPage } from "@/pages/reports/CustomerStatementPage";
import { UserManagementPage } from "@/pages/admin/UserManagementPage";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login — layout dışı */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated routes */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/transactions" element={<TransactionPage />} />
        <Route path="/reports/portfolio" element={<PortfolioReportPage />} />
        <Route path="/reports/daily" element={<DailyReportPage />} />
        <Route path="/reports/statement" element={<CustomerStatementPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <UserManagementPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Bilinmeyen route'ları ana sayfaya yönlendir */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
