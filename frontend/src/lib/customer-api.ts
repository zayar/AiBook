import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Add request interceptor to include tenant ID for development
api.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === 'development') {
    config.headers['X-Tenant-ID'] = 'default';
  }
  console.log('🔍 Making API request:', config.method?.toUpperCase(), config.url);
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  workPhone?: string;
  receivables: number;
  currency: string;
  customerType: 'Business' | 'Individual';
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface CustomerFormData {
  customerType: 'Business' | 'Individual';
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  displayName: string;
  email: string;
  workPhone?: string;
  mobile?: string;
  
  // Address
  billingAttention?: string;
  billingCountry?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  
  shippingAttention?: string;
  shippingCountry?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  
  // Other Details
  taxRate?: string;
  companyId?: string;
  currency?: string;
  openingBalance?: number;
  openingBalanceType?: string;
  paymentTerms?: string;
  enablePortal?: boolean;
  portalLanguage?: string;
}

export class CustomerAPI {
  /**
   * Get all customers with filtering and pagination
   */
  static async getCustomers(params?: {
    search?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ customers: Customer[]; pagination: any }> {
    const response = await api.get('/customers', { params });
    return response.data;
  }

  /**
   * Get a specific customer by ID
   */
  static async getCustomer(id: string): Promise<Customer> {
    const response = await api.get(`/customers/${id}`);
    return response.data.customer;
  }

  /**
   * Create a new customer
   */
  static async createCustomer(customerData: CustomerFormData): Promise<Customer> {
    const response = await api.post('/customers', customerData);
    return response.data.customer;
  }

  /**
   * Update an existing customer
   */
  static async updateCustomer(id: string, customerData: Partial<CustomerFormData>): Promise<Customer> {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data.customer;
  }

  /**
   * Delete a customer
   */
  static async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  }

  /**
   * Toggle customer status (Active/Inactive)
   */
  static async toggleCustomerStatus(id: string, status: 'Active' | 'Inactive'): Promise<Customer> {
    const response = await api.patch(`/customers/${id}/status`, { status });
    return response.data.customer;
  }
} 