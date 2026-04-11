import api from "./axios";
import type {
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  ConversionRequest,
} from "@/types";

export const transactionApi = {
  getByCustomer: (customerId: string) =>
    api.get<Transaction[]>(`/transactions/customer/${customerId}`).then((r) => r.data),

  deposit: (data: DepositRequest) =>
    api.post<Transaction>("/transactions/deposit", data).then((r) => r.data),

  withdraw: (data: WithdrawalRequest) =>
    api.post<Transaction>("/transactions/withdrawal", data).then((r) => r.data),

  convert: (data: ConversionRequest) =>
    api.post<Transaction>("/transactions/conversion", data).then((r) => r.data),

  cancel: (id: string, reason: string) =>
    api.post(`/transactions/${id}/cancel`, { reason }),
};
