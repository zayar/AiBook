const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Salesperson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  commission?: number;
  target?: number;
  territory?: string;
  manager?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoices: number;
    salesOrders: number;
  };
  performance?: {
    currentMonthSales: number;
    currentMonthInvoices: number;
    targetProgress?: number;
  };
}

export interface CreateSalespersonRequest {
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  commission?: number;
  target?: number;
  territory?: string;
  manager?: string;
  isActive?: boolean;
}

export interface UpdateSalespersonRequest {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  commission?: number;
  target?: number;
  territory?: string;
  manager?: string;
  isActive?: boolean;
}

export interface SalespersonPerformance {
  period: {
    startDate: string;
    endDate: string;
    year: number;
    month?: number;
  };
  summary: {
    totalSales: number;
    totalPaid: number;
    totalInvoices: number;
    totalSalesOrders: number;
    averageInvoiceAmount: number;
    collectionRate: number;
  };
  target: {
    amount?: number;
    achieved: number;
    progress?: number;
  };
  invoices: any[];
  salesOrders: any[];
}

class SalespersonAPI {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default', // TODO: Get from auth context
    };
  }

  async getSalespeople(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
    department?: string;
    territory?: string;
  }): Promise<{ salespeople: Salesperson[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.territory) queryParams.append('territory', params.territory);

    const response = await fetch(`${API_BASE_URL}/salespeople?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch salespeople: ${response.statusText}`);
    }

    return response.json();
  }

  async getSalesperson(id: string): Promise<{ salesperson: Salesperson }> {
    const response = await fetch(`${API_BASE_URL}/salespeople/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch salesperson: ${response.statusText}`);
    }

    return response.json();
  }

  async createSalesperson(data: CreateSalespersonRequest): Promise<{ message: string; salesperson: Salesperson }> {
    const response = await fetch(`${API_BASE_URL}/salespeople`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create salesperson');
    }

    return response.json();
  }

  async updateSalesperson(id: string, data: UpdateSalespersonRequest): Promise<{ message: string; salesperson: Salesperson }> {
    const response = await fetch(`${API_BASE_URL}/salespeople/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update salesperson');
    }

    return response.json();
  }

  async deleteSalesperson(id: string): Promise<{ message: string; action: string; associations?: any }> {
    const response = await fetch(`${API_BASE_URL}/salespeople/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete salesperson');
    }

    return response.json();
  }

  async toggleSalespersonStatus(id: string): Promise<{ message: string; salesperson: Salesperson }> {
    const response = await fetch(`${API_BASE_URL}/salespeople/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle salesperson status');
    }

    return response.json();
  }

  async getSalespersonPerformance(id: string, params?: {
    year?: number;
    month?: number;
  }): Promise<{ salesperson: any; performance: SalespersonPerformance }> {
    const queryParams = new URLSearchParams();
    
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.month) queryParams.append('month', params.month.toString());

    const response = await fetch(`${API_BASE_URL}/salespeople/${id}/performance?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch salesperson performance: ${response.statusText}`);
    }

    return response.json();
  }
}

export const salespersonAPI = new SalespersonAPI();