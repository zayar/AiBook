import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: false,
  headers: {
    'X-Tenant-ID': 'default',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🔄 Vendor Payment API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Vendor Payment API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging  
api.interceptors.response.use(
  (response) => {
    console.log('✅ Vendor Payment API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Vendor Payment API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// TypeScript interfaces
export interface VendorPayment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  amount: number;
  bankCharges: number;
  taxAmount: number;
  currency: string;
  exchangeRate: number;
  paymentDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_PAYMENT' | 'OTHER';
  paidThroughId: string;
  referenceNumber?: string;
  taxDeducted: boolean;
  notes?: string;
  internalNotes?: string;
  branch?: string;
  journalId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  vendor?: {
    id: string;
    name: string;
    displayName: string;
    email?: string;
    phone?: string;
  };
  paidThrough?: {
    id: string;
    code: string;
    name: string;
    type: string;
    balance?: number;
  };
  billPayments?: BillPayment[];
}

export interface BillPayment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  bill?: {
    id: string;
    billNumber: string;
    totalAmount: number;
    paidAmount?: number;
    billDate?: string;
    dueDate?: string;
    status?: string;
  };
}

export interface PendingBill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  currency: string;
  remainingAmount: number;
  isOverdue: boolean;
  daysPastDue: number;
}

export interface JournalEntry {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  memo: string;
  reference: string;
  journalId: string;
  postedAt: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export interface VendorPaymentDetail {
  vendorPayment: VendorPayment;
  journalEntries: JournalEntry[] | null;
  doubleEntry: {
    debits: JournalEntry[];
    credits: JournalEntry[];
    totalDebits: number;
    totalCredits: number;
  } | null;
}

export interface VendorPaymentsResponse {
  vendorPayments: VendorPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalPayments: number;
    totalAmount: number;
    totalBankCharges: number;
    totalTaxAmount: number;
    paymentModeBreakdown: {
      paymentMode: string;
      count: number;
      totalAmount: number;
    }[];
  };
}

export interface CreateVendorPaymentData {
  vendorId: string;
  amount: number;
  bankCharges?: number;
  paymentDate?: string;
  paymentMode?: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_PAYMENT' | 'OTHER';
  paidThroughId: string;
  referenceNumber?: string;
  taxDeducted?: boolean;
  taxAmount?: number;
  notes?: string;
  internalNotes?: string;
  billPayments?: {
    billId: string;
    amount: number;
  }[];
  branch?: string;
}

export interface VendorPaymentStats {
  totalStats: {
    totalPayments: number;
    totalAmount: number;
    totalBankCharges: number;
    totalTaxAmount: number;
    averageAmount: number;
  };
  paymentModeBreakdown: {
    paymentMode: string;
    count: number;
    totalAmount: number;
  }[];
  monthlyTrends: {
    month: string;
    count: number;
    total: number;
  }[];
  topVendors: {
    vendor: {
      id: string;
      name: string;
      displayName: string;
    };
    count: number;
    totalAmount: number;
  }[];
}

export interface PendingBillsResponse {
  pendingBills: PendingBill[];
  summary: {
    totalBills: number;
    totalPendingAmount: number;
    overdueBills: number;
    overdueAmount: number;
  };
}

// Vendor Payment API Class
export class VendorPaymentAPI {
  /**
   * Get all vendor payments with filtering and pagination
   */
  static async getVendorPayments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    vendorId?: string;
    paymentMode?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'paymentDate' | 'amount' | 'paymentNumber' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<VendorPaymentsResponse> {
    try {
      const response = await api.get('/vendor-payments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor payments:', error);
      throw error;
    }
  }

  /**
   * Get vendor payment by ID with full details
   */
  static async getVendorPayment(id: string): Promise<VendorPaymentDetail> {
    try {
      const response = await api.get(`/vendor-payments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor payment:', error);
      throw error;
    }
  }

  /**
   * Create new vendor payment
   */
  static async createVendorPayment(data: CreateVendorPaymentData): Promise<{
    vendorPayment: VendorPayment;
    message: string;
  }> {
    try {
      const response = await api.post('/vendor-payments', data);
      return response.data;
    } catch (error) {
      console.error('Error creating vendor payment:', error);
      throw error;
    }
  }

  /**
   * Delete vendor payment
   */
  static async deleteVendorPayment(id: string): Promise<{
    message: string;
  }> {
    try {
      const response = await api.delete(`/vendor-payments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting vendor payment:', error);
      throw error;
    }
  }

  /**
   * Get vendor payment statistics
   */
  static async getVendorPaymentStats(): Promise<VendorPaymentStats> {
    try {
      const response = await api.get('/vendor-payments/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor payment stats:', error);
      throw error;
    }
  }

  /**
   * Get next payment number
   */
  static async getNextPaymentNumber(): Promise<{ paymentNumber: string }> {
    try {
      const response = await api.get('/vendor-payments/next-number');
      return response.data;
    } catch (error) {
      console.error('Error fetching next payment number:', error);
      throw error;
    }
  }

  /**
   * Get payment methods for vendor payments
   */
  static async getPaymentMethods(): Promise<{ paymentMethods: any[] }> {
    try {
      const response = await api.get('/banking/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Get vendor pending bills
   */
  static async getVendorPendingBills(vendorId: string): Promise<PendingBillsResponse> {
    try {
      const response = await api.get(`/vendor-payments/vendor/${vendorId}/pending-bills`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor pending bills:', error);
      throw error;
    }
  }

  /**
   * Utility: Get payment mode color
   */
  static getPaymentModeColor(mode: string): string {
    const colors = {
      CASH: 'text-green-600 bg-green-50 border-green-200',
      BANK_TRANSFER: 'text-blue-600 bg-blue-50 border-blue-200',
      CHECK: 'text-purple-600 bg-purple-50 border-purple-200',
      CREDIT_CARD: 'text-red-600 bg-red-50 border-red-200',
      DEBIT_CARD: 'text-orange-600 bg-orange-50 border-orange-200',
      MOBILE_PAYMENT: 'text-teal-600 bg-teal-50 border-teal-200',
      OTHER: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colors[mode as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  /**
   * Utility: Get payment mode icon
   */
  static getPaymentModeIcon(mode: string): string {
    const icons = {
      CASH: '💵',
      BANK_TRANSFER: '🏦',
      CHECK: '📝',
      CREDIT_CARD: '💳',
      DEBIT_CARD: '💳',
      MOBILE_PAYMENT: '📱',
      OTHER: '💰',
    };
    return icons[mode as keyof typeof icons] || '💰';
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
export const vendorPaymentApi = new VendorPaymentAPI();