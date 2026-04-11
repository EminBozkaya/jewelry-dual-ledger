import api from "./axios";

export const reportApi = {
  getPortfolio: () => api.get("/reports/portfolio").then((r) => r.data),

  getDaily: (date?: string) =>
    api.get("/reports/daily", { params: { date } }).then((r) => r.data),

  getStatement: (customerId: string, from?: string, to?: string) =>
    api
      .get(`/reports/statement/${customerId}`, { params: { from, to } })
      .then((r) => r.data),
};
