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
    console.log('🔄 Payment API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Payment API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ Payment API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Payment API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'check' | 'digital_wallet' | 'cryptocurrency' | 'other';
  accountNumber?: string;
  bankName?: string;
  isDefault: boolean;
  isActive: boolean;
  tenantId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodData {
  name: string;
  type: PaymentMethod['type'];
  accountNumber?: string;
  bankName?: string;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentData {
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  paymentDate?: string;
}

export const PaymentAPI = {
  // Payment Methods
  async getPaymentMethods(activeOnly: boolean = true): Promise<{ paymentMethods: PaymentMethod[]; total: number }> {
    const response = await api.get(`/payment-methods?active=${activeOnly ? 'true' : 'all'}`);
    return response.data;
  },

  async getPaymentMethod(id: string): Promise<PaymentMethod> {
    const response = await api.get(`/payment-methods/${id}`);
    return response.data;
  },

  async createPaymentMethod(data: CreatePaymentMethodData): Promise<PaymentMethod> {
    const response = await api.post('/payment-methods', data);
    return response.data;
  },

  async updatePaymentMethod(id: string, data: Partial<CreatePaymentMethodData>): Promise<PaymentMethod> {
    const response = await api.put(`/payment-methods/${id}`, data);
    return response.data;
  },

  async deletePaymentMethod(id: string): Promise<{ message: string; deleted?: boolean; deactivated?: boolean }> {
    const response = await api.delete(`/payment-methods/${id}`);
    return response.data;
  },

  async setDefaultPaymentMethod(id: string): Promise<{ message: string }> {
    const response = await api.patch(`/payment-methods/${id}/default`);
    return response.data;
  },

  // Payment Recording
  async recordPayment(invoiceId: string, data: CreatePaymentData): Promise<PaymentRecord> {
    const response = await api.post(`/invoices/${invoiceId}/payments`, data);
    return response.data;
  },

  async getInvoicePayments(invoiceId: string): Promise<PaymentRecord[]> {
    const response = await api.get(`/invoices/${invoiceId}/payments`);
    return response.data;
  }
};

export default PaymentAPI; 