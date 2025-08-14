import axios from 'axios';

// Use Next.js rewrite proxy to backend
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: false,
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    // Attach tenant and auth token dynamically
    const tenantId =
      (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) ||
      'default';
    const token =
      (typeof window !== 'undefined' && (localStorage.getItem('authToken') || localStorage.getItem('token'))) ||
      undefined;

    config.headers = config.headers || {};
    (config.headers as any)['x-tenant-id'] = tenantId;
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    console.log('🔄 Expense API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Expense API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging  
api.interceptors.response.use(
  (response) => {
    console.log('✅ Expense API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Expense API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// TypeScript interfaces
export interface Expense {
  id: string;
  expenseNumber: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  expenseDate: string;
  category: string;
  subcategory?: string;
  vendorId?: string;
  customerId?: string;
  taxRateId?: string;
  expenseAccountId: string;
  paidThroughId: string;
  currency: string;
  exchangeRate: number;
  receiptUrl?: string;
  receiptFiles?: string[];
  billable: boolean;
  projectId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  journalId?: string;
  branch?: string;
  reference?: string;
  notes?: string;
  tenantId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  vendor?: {
    id: string;
    name: string;
    displayName?: string;
    email?: string;
    phone?: string;
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  taxRate?: {
    id: string;
    name: string;
    rate: number;
    jurisdiction: string;
    taxType?: string;
  };
  expenseAccount: {
    id: string;
    code: string;
    name: string;
    type: string;
    balance?: number;
  };
  paidThrough: {
    id: string;
    code: string;
    name: string;
    type: string;
    balance?: number;
  };
}

export interface JournalEntry {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  memo?: string;
  reference?: string;
  postedAt: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export interface ExpenseDetail {
  expense: Expense;
  journalEntries?: JournalEntry[];
  doubleEntry?: {
    debits: JournalEntry[];
    credits: JournalEntry[];
    totalDebits: number;
    totalCredits: number;
  };
}

export interface ExpenseStats {
  totalStats: {
    totalExpenses: number;
    totalAmount: number;
    totalBaseAmount: number;
    totalTaxAmount: number;
    averageAmount: number;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
    totalAmount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    total: number;
  }>;
}

export interface ExpensesResponse {
  expenses: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalExpenses: number;
    totalAmount: number;
    totalTax: number;
    statusBreakdown: Array<{
      status: string;
      count: number;
      totalAmount: number;
    }>;
  };
}

export interface CreateExpenseData {
  description: string;
  amount: number;
  taxAmount?: number;
  expenseDate?: string;
  category: string;
  subcategory?: string;
  vendorId?: string;
  customerId?: string;
  taxRateId?: string;
  expenseAccountId: string;
  paidThroughId: string;
  currency?: string;
  exchangeRate?: number;
  billable?: boolean;
  branch?: string;
  reference?: string;
  notes?: string;
  receiptFiles?: string[];
}

export interface UpdateExpenseData {
  description?: string;
  amount?: number;
  taxAmount?: number;
  expenseDate?: string;
  category?: string;
  subcategory?: string;
  vendorId?: string;
  customerId?: string;
  taxRateId?: string;
  expenseAccountId?: string;
  paidThroughId?: string;
  currency?: string;
  exchangeRate?: number;
  billable?: boolean;
  branch?: string;
  reference?: string;
  notes?: string;
  receiptFiles?: string[];
}

// Expense API Class
export class ExpenseAPI {
  /**
   * Get all expenses with filtering and pagination
   */
  static async getExpenses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
    category?: string;
    vendorId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    billable?: boolean;
    sortBy?: 'expenseDate' | 'amount' | 'description' | 'status' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<ExpensesResponse> {
    try {
      const response = await api.get('/expenses', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  /**
   * Get expense by ID with full details
   */
  static async getExpense(id: string): Promise<ExpenseDetail> {
    try {
      const response = await api.get(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  }

  /**
   * Create new expense
   */
  static async createExpense(data: CreateExpenseData): Promise<{
    expense: Expense;
    message: string;
  }> {
    try {
      const response = await api.post('/expenses', data);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  /**
   * Update expense
   */
  static async updateExpense(id: string, data: UpdateExpenseData): Promise<{
    expense: Expense;
    message: string;
  }> {
    try {
      const response = await api.put(`/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  /**
   * Approve expense and create journal entries
   */
  static async approveExpense(id: string): Promise<{
    expense: Expense;
    message: string;
  }> {
    try {
      const response = await api.post(`/expenses/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('Error approving expense:', error);
      throw error;
    }
  }

  /**
   * Delete expense (soft delete)
   */
  static async deleteExpense(id: string): Promise<{
    message: string;
  }> {
    try {
      const response = await api.delete(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  /**
   * Get expense statistics
   */
  static async getExpenseStats(): Promise<ExpenseStats> {
    try {
      const response = await api.get('/expenses/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      throw error;
    }
  }

  /**
   * Get next expense number
   */
  static async getNextExpenseNumber(): Promise<{ expenseNumber: string }> {
    try {
      const response = await api.get('/expenses/next-number');
      return response.data;
    } catch (error) {
      console.error('Error getting next expense number:', error);
      throw error;
    }
  }

  /**
   * Get payment methods (bank accounts) for expense payments
   */
  static async getPaymentMethods(): Promise<{ paymentMethods: Array<{
    id: string;
    name: string;
    type: string;
    accountNumber?: string;
    bankName?: string;
    currency: string;
    isDefault: boolean;
    isActive: boolean;
  }> }> {
    try {
      const response = await api.get('/banking/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Utility: Get status color
   */
  static getStatusColor(status: string): string {
    const colors = {
      PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      APPROVED: 'text-green-600 bg-green-50 border-green-200',
      REJECTED: 'text-red-600 bg-red-50 border-red-200',
      REIMBURSED: 'text-blue-600 bg-blue-50 border-blue-200',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  /**
   * Utility: Get status icon
   */
  static getStatusIcon(status: string): string {
    const icons = {
      PENDING: '⏳',
      APPROVED: '✅',
      REJECTED: '❌',
      REIMBURSED: '💰',
    };
    return icons[status as keyof typeof icons] || '📄';
  }

  /**
   * Utility: Format amount with currency
   */
  static formatAmount(amount: number, currency: string = 'MMK'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'MMK' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount).replace('$', currency === 'MMK' ? 'MMK ' : '$');
  }
}

// Export a singleton instance
export const expenseApi = new ExpenseAPI();