// API base URL - use frontend proxy for consistent authentication
const API_URL = '/api/v1';

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId') || 'default';
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// TypeScript interfaces
export interface BillItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  taxRate: number;
  accountCode?: string;
}

export interface Vendor {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  currency?: string;
}

export interface BillPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor?: Vendor;
  billDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount?: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  currency: string;
  exchangeRate: number;
  notes?: string;
  items?: BillItem[];
  payments?: BillPayment[];
  isOverdue?: boolean;
  daysOverdue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillData {
  vendorId: string;
  billDate: string;
  dueDate: string;
  billNumber?: string;
  currency?: string;
  exchangeRate?: number;
  notes?: string;
  items: BillItem[];
}

export interface UpdateBillData extends CreateBillData {
  id: string;
}

export interface BillStats {
  totalBills: number;
  pendingBills: number;
  paidBills: number;
  overdueBills: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  recentBills: Bill[];
}

export interface BillsResponse {
  bills: Bill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API functions
export const billApi = {
  // Get all bills with filtering and pagination
  async getBills(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    vendorId?: string;
  }): Promise<BillsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.vendorId) searchParams.append('vendorId', params.vendorId);

    const url = `${API_URL}/bills${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bills: ${response.statusText}`);
    }

    return response.json();
  },

  // Get bill by ID
  async getBillById(id: string): Promise<{ bill: Bill }> {
    const response = await fetch(`${API_URL}/bills/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bill: ${response.statusText}`);
    }

    return response.json();
  },

  // Create new bill
  async createBill(data: CreateBillData): Promise<{ bill: Bill; message: string }> {
    // Clean up the data - convert empty strings to null for optional fields
    const cleanedData = {
      ...data,
      billNumber: data.billNumber || null,
      notes: data.notes || null,
      currency: data.currency || 'MMK',
      exchangeRate: data.exchangeRate || 1,
      items: data.items.map(item => ({
        ...item,
        accountCode: item.accountCode || null,
      })),
    };

    const response = await fetch(`${API_URL}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
      },
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle validation errors with detailed field information
      if (errorData.error === 'Validation failed' && errorData.details) {
        const validationErrors = errorData.details.map((detail: any) => {
          const field = detail.path?.join('.') || 'unknown';
          return `${field}: ${detail.message}`;
        }).join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }

      throw new Error(errorData.error || `Failed to create bill: ${response.statusText}`);
    }

    return response.json();
  },

  // Update bill
  async updateBill(id: string, data: CreateBillData): Promise<{ bill: Bill; message: string }> {
    // Clean up the data - convert empty strings to null for optional fields
    const cleanedData = {
      ...data,
      billNumber: data.billNumber || null,
      notes: data.notes || null,
      currency: data.currency || 'MMK',
      exchangeRate: data.exchangeRate || 1,
      items: data.items.map(item => ({
        ...item,
        accountCode: item.accountCode || null,
      })),
    };

    const response = await fetch(`${API_URL}/bills/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
      },
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle validation errors with detailed field information
      if (errorData.error === 'Validation failed' && errorData.details) {
        const validationErrors = errorData.details.map((detail: any) => {
          const field = detail.path?.join('.') || 'unknown';
          return `${field}: ${detail.message}`;
        }).join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      }

      throw new Error(errorData.error || `Failed to update bill: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete bill
  async deleteBill(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/bills/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete bill: ${response.statusText}`);
    }

    return response.json();
  },

  // Get bills statistics
  async getBillStats(): Promise<BillStats> {
    const response = await fetch(`${API_URL}/bills/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bill stats: ${response.statusText}`);
    }

    return response.json();
  },

  // Get next bill number
  async getNextBillNumber(): Promise<{ billNumber: string }> {
    const response = await fetch(`${API_URL}/bills/next-number`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get next bill number: ${response.statusText}`);
    }

    return response.json();
  },
};