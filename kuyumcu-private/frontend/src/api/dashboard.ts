import api from "./axios";
import type { Transaction } from "@/types";

export interface DashboardSummary {
  totalCustomers: number;
  totalActiveUsers: number;
  todayTransactionCount: number;
  recentTransactions: Transaction[];
}

export const dashboardApi = {
  getSummary: () =>
    api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
};
