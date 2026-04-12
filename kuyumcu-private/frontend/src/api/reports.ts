import api from "./axios";

export const reportApi = {
  getPortfolio: (types?: number[]) => 
    api.get("/reports/portfolio", { params: { types } }).then((r) => r.data),

  getDaily: (from?: string, to?: string) =>
    api.get("/reports/daily", { params: { from, to } }).then((r) => r.data),

  getStatement: (customerId: string, from?: string, to?: string) =>
    api
      .get(`/reports/customer-statement/${customerId}`, { params: { from, to } })
      .then((r) => r.data),

  getAssetDetail: (assetTypeId: string) =>
    api.get(`/reports/asset-detail/${assetTypeId}`).then((r) => r.data),
};
