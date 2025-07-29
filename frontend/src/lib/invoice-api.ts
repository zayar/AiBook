import api from './api';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  accountCode?: string;
}

export interface Invoice {
  id?: string;
  invoiceNumber?: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  issueDate: string;
  dueDate: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  status?: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  currency: string;
  exchangeRate?: number;
  notes?: string;
  termsConditions?: string;
  items: InvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceFilters {
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
  summary: {
    totalInvoices: number;
    totalValue: number;
    paidInvoices: number;
    overdueInvoices: number;
  };
  aiInsights: {
    cashFlowPrediction: {
      expectedInflow: number;
      confidence: number;
      timeframe: string;
    };
    riskAssessment: {
      highRiskInvoices: number;
      overduePattern: string;
      recommendation: string;
    };
    performanceMetrics: {
      averagePaymentTime: number;
      collectionRate: number;
      trendDirection: 'up' | 'down' | 'stable';
    };
  };
}

export interface PaymentData {
  amount: number;
  paymentDate?: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export class InvoiceAPI {
  /**
   * Get all invoices with filtering and pagination
   */
  static async getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/invoices?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific invoice by ID
   */
  static async getInvoice(id: string): Promise<{
    invoice: Invoice;
    aiAnalysis: any;
    paymentStatus: any;
  }> {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>): Promise<{
    message: string;
    invoice: Invoice;
    aiEnhancements: any;
  }> {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  }

  /**
   * Update an existing invoice
   */
  static async updateInvoice(id: string, invoiceData: Partial<Invoice>): Promise<{
    message: string;
    invoice: Invoice;
  }> {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  }

  /**
   * Delete an invoice (soft delete)
   */
  static async deleteInvoice(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  }

  /**
   * Send an invoice via email
   */
  static async sendInvoice(id: string, emailData?: {
    to?: string;
    subject?: string;
    message?: string;
  }): Promise<{ message: string }> {
    const response = await api.post(`/invoices/${id}/send`, emailData || {});
    return response.data;
  }

  /**
   * Process a payment for an invoice
   */
  static async processPayment(id: string, paymentData: PaymentData): Promise<{
    message: string;
    payment: any;
    invoice: Invoice;
  }> {
    const response = await api.post(`/invoices/${id}/pay`, paymentData);
    return response.data;
  }

  /**
   * Get invoice analytics and insights
   */
  static async getAnalytics(): Promise<any> {
    const response = await api.get('/invoices/analytics');
    return response.data;
  }

  /**
   * Get next invoice number
   */
  static async getNextInvoiceNumber(): Promise<{ invoiceNumber: string }> {
    const response = await api.get('/invoices/next-number');
    return response.data;
  }

  /**
   * Get AI suggestions for invoice completion
   */
  static async getAISuggestions(data: {
    customerId: string;
    items: InvoiceItem[];
  }): Promise<{
    suggestions: Array<{
      field: string;
      value: any;
      confidence: number;
      reason: string;
    }>;
  }> {
    const response = await api.post('/invoices/ai-suggestions', data);
    return response.data;
  }

  /**
   * Duplicate an invoice
   */
  static async duplicateInvoice(id: string): Promise<{
    message: string;
    invoice: Invoice;
  }> {
    const response = await api.post(`/invoices/${id}/duplicate`);
    return response.data;
  }

  /**
   * Generate PDF for an invoice
   */
  static async generatePDF(id: string): Promise<Blob> {
    const response = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Update invoice status
   */
  static async updateStatus(id: string, status: string): Promise<{
    message: string;
    invoice: Invoice;
  }> {
    const response = await api.patch(`/invoices/${id}/status`, { status });
    return response.data;
  }

  /**
   * Get payment history for an invoice
   */
  static async getPaymentHistory(id: string): Promise<{
    payments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      reference?: string;
      notes?: string;
    }>;
  }> {
    const response = await api.get(`/invoices/${id}/payments`);
    return response.data;
  }

  /**
   * Export invoices to various formats
   */
  static async exportInvoices(format: 'csv' | 'excel' | 'pdf', filters: InvoiceFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/invoices/export/${format}?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export default InvoiceAPI; 