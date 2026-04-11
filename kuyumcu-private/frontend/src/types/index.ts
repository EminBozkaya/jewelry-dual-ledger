// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export interface AuthUser {
  token: string;
  fullName: string;
  role: "Admin" | "Staff";
  expiresAt: Date;
}

// ── Customer ──────────────────────────────────────────────────
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  address?: string;
  email?: string;
  nationalId?: string;
  notes?: string;
  hasPhoto: boolean;
  createdAt: string;
}

export interface CustomerCreateRequest {
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  email?: string;
  nationalId?: string;
  notes?: string;
}

export interface CustomerUpdateRequest extends CustomerCreateRequest {}

// ── AssetType ─────────────────────────────────────────────────
export type UnitType = "Currency" | "Piece" | "Gram";

export interface AssetType {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  karat?: number;
  gramWeight?: number;
  isActive: boolean;
  sortOrder: number;
}

// ── Balance ───────────────────────────────────────────────────
export interface Balance {
  assetTypeId: string;
  assetTypeCode: string;
  assetTypeName: string;
  unitType: UnitType;
  amount: number;
}

// ── Transaction ───────────────────────────────────────────────
export type TransactionType = "Deposit" | "Withdrawal" | "Conversion";

export interface ConversionDetail {
  fromAssetCode: string;
  fromAssetName: string;
  fromAmount: number;
  fromRateTry: number;
  tryEquivalent: number;
  toAssetCode: string;
  toAssetName: string;
  toAmount: number;
  toRateTry: number;
  rateSource: string;
  rateNote?: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerFullName: string;
  type: TransactionType;
  assetTypeCode?: string;
  assetTypeName?: string;
  amount?: number;
  description?: string;
  createdByFullName: string;
  createdAt: string;
  isCancelled: boolean;
  cancelReason?: string;
  conversion?: ConversionDetail;
}

export interface DepositRequest {
  customerId: string;
  assetTypeId: string;
  amount: number;
  description?: string;
}

export interface WithdrawalRequest {
  customerId: string;
  assetTypeId: string;
  amount: number;
  description?: string;
}

export interface ConversionRequest {
  customerId: string;
  fromAssetTypeId: string;
  fromAmount: number;
  fromRateTry: number;
  toAssetTypeId: string;
  toRateTry: number;
  description?: string;
  rateNote?: string;
}

// ── Tablo / Sayfalama ─────────────────────────────────────────
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

// ── User Management ───────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  username: string;
  role: "Admin" | "Staff";
  isActive: boolean;
}

export interface UserCreateRequest {
  fullName: string;
  username: string;
  password: string;
  role: "Admin" | "Staff";
}
