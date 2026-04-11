import api from "./axios";
import type { AssetType } from "@/types";

export const assetTypeApi = {
  getAll: () => api.get<AssetType[]>("/asset-types").then((r) => r.data),
};
