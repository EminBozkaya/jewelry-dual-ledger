import api from "./axios";
import type { Balance } from "@/types";

export const balanceApi = {
  getByCustomer: (customerId: string) =>
    api.get<Balance[]>(`/balances/customer/${customerId}`).then((r) => r.data),
};
