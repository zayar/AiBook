const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  jurisdiction: string;
  taxType: string;
  accountId: string;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  account?: {
    code: string;
    name: string;
    type: string;
  };
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRateRequest {
  name: string;
  rate: number;
  jurisdiction: string;
  taxType: string;
  accountId: string;
  effectiveDate: string;
  expiryDate?: string;
  metadata?: any;
}

export interface UpdateTaxRateRequest {
  name?: string;
  rate?: number;
  jurisdiction?: string;
  taxType?: string;
  accountId?: string;
  effectiveDate?: string;
  expiryDate?: string;
  isActive?: boolean;
  metadata?: any;
}

class TaxAPI {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': 'default', // TODO: Get from auth context
    };
  }

  async getTaxRates(): Promise<{ taxRates: TaxRate[]; pagination: any }> {
    const response = await fetch(`${API_BASE_URL}/taxes/rates`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tax rates: ${response.statusText}`);
    }

    return response.json();
  }

  async createTaxRate(data: CreateTaxRateRequest): Promise<{ message: string; taxRate: TaxRate }> {
    const response = await fetch(`${API_BASE_URL}/taxes/rates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create tax rate');
    }

    return response.json();
  }

  async updateTaxRate(id: string, data: UpdateTaxRateRequest): Promise<{ message: string; taxRate: TaxRate }> {
    const response = await fetch(`${API_BASE_URL}/taxes/rates/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update tax rate');
    }

    return response.json();
  }

  async deleteTaxRate(id: string): Promise<{ message: string; action: string; usageCount?: number }> {
    const response = await fetch(`${API_BASE_URL}/taxes/rates/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete tax rate');
    }

    return response.json();
  }

  async toggleTaxRateStatus(id: string): Promise<{ message: string; taxRate: TaxRate }> {
    const response = await fetch(`${API_BASE_URL}/taxes/rates/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle tax rate status');
    }

    return response.json();
  }

  async getAccounts(): Promise<{ accounts: any[] }> {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }

    return response.json();
  }
}

export const taxAPI = new TaxAPI();