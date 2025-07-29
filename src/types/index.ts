// Local type definitions (will be replaced by Prisma types once DB is set up)
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export interface TenantContext {
  tenantId: string;
  userId?: string;
  role?: UserRole;
  tenantName?: string;
  tenantDomain?: string | null;
  tenantSettings?: Record<string, any>;
}

export interface CreateJournalEntryRequest {
  memo: string;
  reference?: string;
  entries: CreateEntryRequest[];
}

export interface CreateEntryRequest {
  accountCode: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
  type: 'DEBIT' | 'CREDIT';
  metadata?: Record<string, any>;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
  currency: string;
  type: AccountType;
}

export interface TransactionSummary {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  entriesCount: number;
}

export interface AICategorizationResult {
  category: string;
  confidence: number;
  reasoning?: string;
}

export interface CashFlowForecast {
  period: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  confidence: number;
} 