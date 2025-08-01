const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-domain.com/api/v1' 
  : 'http://localhost:3001/api/v1';

export interface PaymentReceived {
  id: string;
  paymentNumber: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_PAYMENT' | 'ONLINE_TRANSFER' | 'OTHER';
  depositType: 'CASH_IN_HAND' | 'BANK_DEPOSIT' | 'PETTY_CASH' | 'UNDEPOSITED_FUNDS';
  bankCharges?: number;
  referenceNumber?: string;
  taxDeducted: boolean;
  taxAmount?: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  internalNotes?: string;
  sendThankYouEmail: boolean;
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  invoicePayments?: InvoicePayment[];
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amountAllocated: number;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
  };
}

export interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  amountDue: number;
  currency: string;
  status: string;
  isOverdue: boolean;
}

export interface PaymentReceivedCreateRequest {
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  depositType: string;
  bankCharges?: number;
  referenceNumber?: string;
  taxDeducted: boolean;
  taxAmount?: number;
  notes?: string;
  internalNotes?: string;
  sendThankYouEmail: boolean;
  invoiceAllocations?: {
    invoiceId: string;
    amountAllocated: number;
  }[];
}

export interface PaymentsReceivedResponse {
  success: boolean;
  data: PaymentReceived[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class PaymentReceivedAPI {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default-tenant',
    };
  }

  async getPaymentsReceived(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentMode?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaymentsReceivedResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.paymentMode) queryParams.append('paymentMode', params.paymentMode);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(
      `${API_BASE_URL}/payments-received?${queryParams.toString()}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch payments received: ${response.statusText}`);
    }

    return response.json();
  }

  async getPaymentReceivedById(id: string): Promise<{ success: boolean; data: PaymentReceived }> {
    const response = await fetch(`${API_BASE_URL}/payments-received/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment received: ${response.statusText}`);
    }

    return response.json();
  }

  async createPaymentReceived(data: PaymentReceivedCreateRequest): Promise<{ success: boolean; data: PaymentReceived; message: string }> {
    const response = await fetch(`${API_BASE_URL}/payments-received`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create payment received: ${response.statusText}`);
    }

    return response.json();
  }

  async updatePaymentReceived(id: string, data: PaymentReceivedCreateRequest): Promise<{ success: boolean; data: PaymentReceived; message: string }> {
    const response = await fetch(`${API_BASE_URL}/payments-received/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update payment received: ${response.statusText}`);
    }

    return response.json();
  }

  async deletePaymentReceived(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/payments-received/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete payment received: ${response.statusText}`);
    }

    return response.json();
  }

  async getUnpaidInvoices(customerId: string): Promise<{ success: boolean; data: UnpaidInvoice[] }> {
    const response = await fetch(
      `${API_BASE_URL}/payments-received/customer/${customerId}/unpaid-invoices`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch unpaid invoices: ${response.statusText}`);
    }

    return response.json();
  }

  async getCustomers(): Promise<{ customers: any[]; pagination: any }> {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customers: ${response.statusText}`);
    }

    return response.json();
  }
}

export const paymentReceivedAPI = new PaymentReceivedAPI();