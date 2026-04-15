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
  storeSlug: string;
  storeId: string;
}

export interface AuthUser {
  id?: string;
  token: string;
  fullName: string;
  role: "SuperAdmin" | "Admin" | "Staff";
  expiresAt: Date;
  storeSlug: string;
  storeId: string;
}

// ── Customer ──────────────────────────────────────────────────
export type CustomerType = number; // Customer.type int değeri — CustomerTypeConfig.value'ya karşılık gelir

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  address?: string;
  email?: string;
  nationalId?: string;
  type: CustomerType;
  notes?: string;
  hasPhoto: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface CustomerCreateRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  email?: string;
  nationalId?: string;
  type: CustomerType;
  notes?: string;
  ignorePhoneWarning?: boolean;
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
  customerType: CustomerType;
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

// ── CustomerTypeConfig ────────────────────────────────────────
export interface CustomerTypeConfig {
  id: string;
  value: number;       // Customer.type int karşılığı (0, 1, 2, …)
  name: string;        // "Özel Müşteri"
  colorHex: string;    // "#3b82f6"
  isActive: boolean;
  sortOrder: number;
}

// ── User Management ───────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  username: string;
  role: "SuperAdmin" | "Admin" | "Staff";
  isActive: boolean;
}

export interface UserCreateRequest {
  fullName: string;
  username: string;
  password: string;
  role: "SuperAdmin" | "Admin" | "Staff";
}

// ── Report Types ──────────────────────────────────────────────
export interface PortfolioAsset {
  assetTypeId: string;
  assetTypeCode: string;
  assetTypeName: string;
  unitType: UnitType;
  totalPositive: number;
  totalNegative: number;
  netAmount: number;
  customerCount: number;
}

export interface DailyAssetSummary {
  assetTypeCode: string;
  assetTypeName: string;
  totalAmount: number;
  count: number;
}

export interface DailyConversionSummary {
  fromAssetCode: string;
  toAssetCode: string;
  totalFromAmount: number;
  totalToAmount: number;
  count: number;
}

export interface DailyReport {
  date: string;
  totalTransactions: number;
  deposits: DailyAssetSummary[];
  withdrawals: DailyAssetSummary[];
  conversions: DailyConversionSummary[];
  transactions: Transaction[];
}

export interface CustomerStatement {
  customer: Customer;
  period: { from: string; to: string };
  openingBalances: Balance[];
  closingBalances: Balance[];
  transactions: Transaction[];
}

export interface AssetDetailCustomer {
  customerId: string;
  customerFullName: string;
  amount: number;
}
