import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1', // Use Next.js proxy
  withCredentials: false,
});

// Request interceptor for debugging and auth
api.interceptors.request.use(
  (config) => {
    // Add tenant ID
    const tenantId = (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) || 'default';
    config.headers['x-tenant-id'] = tenantId;
    
    // Add auth token if available
    const token = (typeof window !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('token'))) || undefined;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🔄 Chart of Accounts API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Chart of Accounts API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging  
api.interceptors.response.use(
  (response) => {
    console.log('✅ Chart of Accounts API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Chart of Accounts API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// TypeScript interfaces
export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  currency: string;
  isActive: boolean;
  description?: string;
  parentId?: string;
  parent?: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  children?: Account[];
  childrenCount?: number;
  entriesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountStatistics {
  totalEntries: number;
  totalAmount: number;
  childrenCount: number;
  hasEntries: boolean;
}

export interface AccountActivity {
  type: 'DEBIT' | 'CREDIT';
  totalAmount: number;
  count: number;
}

export interface AccountDetail {
  account: Account;
  statistics: AccountStatistics;
  recentActivity: AccountActivity[];
}

export interface AccountSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
}

export interface AccountsResponse {
  accounts: Account[];
  groupedAccounts: Record<string, Account[]>;
  summary: AccountSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AccountHierarchyResponse {
  hierarchy: Account[];
  total: number;
}

export interface CreateAccountData {
  code: string;
  name: string;
  type: 
    // Asset sub-types
    | 'OTHER_ASSET' | 'OTHER_CURRENT_ASSET' | 'CASH' | 'BANK' | 'FIXED_ASSET' 
    | 'ACCOUNTS_RECEIVABLE' | 'STOCK' | 'PAYMENT_CLEARING_ACCOUNT' | 'INPUT_TAX'
    | 'INTANGIBLE_ASSET' | 'NON_CURRENT_ASSET' | 'DEFERRED_TAX_ASSET'
    // Liability sub-types
    | 'OTHER_CURRENT_LIABILITY' | 'CREDIT_CARD' | 'NON_CURRENT_LIABILITY'
    | 'OTHER_LIABILITY' | 'ACCOUNTS_PAYABLE' | 'OVERSEAS_TAX_PAYABLE'
    | 'OUTPUT_TAX' | 'DEFERRED_TAX_LIABILITY'
    // Equity sub-types
    | 'EQUITY'
    // Income sub-types
    | 'INCOME' | 'OTHER_INCOME'
    // Expense sub-types
    | 'EXPENSE' | 'COST_OF_GOODS_SOLD' | 'OTHER_EXPENSE';
  description?: string;
  isActive?: boolean;
}

export interface UpdateAccountData {
  name?: string;
  type?: 
    // Asset sub-types
    | 'OTHER_ASSET' | 'OTHER_CURRENT_ASSET' | 'CASH' | 'BANK' | 'FIXED_ASSET' 
    | 'ACCOUNTS_RECEIVABLE' | 'STOCK' | 'PAYMENT_CLEARING_ACCOUNT' | 'INPUT_TAX'
    | 'INTANGIBLE_ASSET' | 'NON_CURRENT_ASSET' | 'DEFERRED_TAX_ASSET'
    // Liability sub-types
    | 'OTHER_CURRENT_LIABILITY' | 'CREDIT_CARD' | 'NON_CURRENT_LIABILITY'
    | 'OTHER_LIABILITY' | 'ACCOUNTS_PAYABLE' | 'OVERSEAS_TAX_PAYABLE'
    | 'OUTPUT_TAX' | 'DEFERRED_TAX_LIABILITY'
    // Equity sub-types
    | 'EQUITY'
    // Income sub-types
    | 'INCOME' | 'OTHER_INCOME'
    // Expense sub-types
    | 'EXPENSE' | 'COST_OF_GOODS_SOLD' | 'OTHER_EXPENSE';
  description?: string;
  isActive?: boolean;
}

// Chart of Accounts API Class
export class ChartOfAccountsAPI {
  /**
   * Get all accounts with filtering and pagination
   */
  static async getAccounts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    isActive?: boolean;
    includeHierarchy?: boolean;
    sortBy?: 'code' | 'name' | 'type' | 'balance' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<AccountsResponse> {
    try {
      const response = await api.get('/accounts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Get account by ID with full details
   */
  static async getAccount(id: string): Promise<AccountDetail> {
    try {
      const response = await api.get(`/accounts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  }

  /**
   * Get accounts by type
   */
  static async getAccountsByType(type: string): Promise<{
    accounts: Account[];
    type: string;
    total: number;
    totalBalance: number;
  }> {
    try {
      const response = await api.get(`/accounts/by-type/${type}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching accounts by type:', error);
      throw error;
    }
  }

  /**
   * Get account hierarchy
   */
  static async getAccountHierarchy(type?: string): Promise<AccountHierarchyResponse> {
    try {
      const params = type ? { type } : {};
      const response = await api.get('/accounts/hierarchy', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching account hierarchy:', error);
      throw error;
    }
  }

  /**
   * Create new account
   */
  static async createAccount(data: CreateAccountData): Promise<{
    account: Account;
    message: string;
  }> {
    try {
      const response = await api.post('/accounts', data);
      return response.data;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Update account
   */
  static async updateAccount(id: string, data: UpdateAccountData): Promise<{
    account: Account;
    message: string;
  }> {
    try {
      const response = await api.put(`/accounts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete account (soft delete)
   */
  static async deleteAccount(id: string): Promise<{
    message: string;
    account: Account;
  }> {
    try {
      const response = await api.delete(`/accounts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Utility: Get account type color
   */
  static getAccountTypeColor(type: string): string {
    const colors = {
      ASSET: 'text-green-600 bg-green-50 border-green-200',
      LIABILITY: 'text-red-600 bg-red-50 border-red-200',
      EQUITY: 'text-blue-600 bg-blue-50 border-blue-200',
      REVENUE: 'text-purple-600 bg-purple-50 border-purple-200',
      EXPENSE: 'text-orange-600 bg-orange-50 border-orange-200',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  /**
   * Utility: Get account type icon
   */
  static getAccountTypeIcon(type: string): string {
    const icons = {
      ASSET: '💰',
      LIABILITY: '📋',
      EQUITY: '🏛️',
      REVENUE: '📈',
      EXPENSE: '📊',
    };
    return icons[type as keyof typeof icons] || '📄';
  }

  /**
   * Utility: Format balance with currency
   */
  static formatBalance(balance: number, currency: string = 'MMK'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'MMK' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(balance).replace('$', currency === 'MMK' ? 'MMK ' : '$');
  }
}

// Export a singleton instance
export const chartOfAccountsApi = new ChartOfAccountsAPI();