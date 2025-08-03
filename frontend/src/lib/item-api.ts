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
    console.log('🔄 Item API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Item API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging  
api.interceptors.response.use(
  (response) => {
    console.log('✅ Item API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Item API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: string;
  unitCost: number;
  unitPrice: number;
  quantityOnHand: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  assetAccountId: string;
  cogsAccountId: string;
  isActive: boolean;
  tenantId: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ItemsResponse {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
  categories: string[];
  insights?: any;
}

export interface ItemTransaction {
  id: string;
  type: 'invoice' | 'bill';
  documentNumber: string;
  date: string;
  dueDate: string;
  customer?: { id: string; name: string; email: string };
  vendor?: { id: string; name: string; displayName?: string; email: string };
  salesperson?: { id: string; name: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  status: string;
  currency: string;
  invoiceTotal?: number;
  billTotal?: number;
  paidAmount: number;
  createdAt: string;
}

export interface ItemTransactionStats {
  totalInvoices: number;
  totalBills: number;
  totalQuantitySold: number;
  totalQuantityPurchased: number;
  totalSalesRevenue: number;
  totalPurchaseCost: number;
}

export interface ItemTransactionsResponse {
  item: {
    id: string;
    name: string;
    sku: string;
    description?: string;
  };
  transactions: ItemTransaction[];
  stats: ItemTransactionStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ItemAPI {
  /**
   * Get all inventory items
   */
  static async getItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<ItemsResponse> {
    try {
      const response = await api.get('/items', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  /**
   * Get a single inventory item by ID
   */
  static async getItem(id: string): Promise<InventoryItem> {
    try {
      const response = await api.get(`/items/${id}`);
      return response.data.item;
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  }

  /**
   * Create a new inventory item
   */
  static async createItem(itemData: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await api.post('/items', itemData);
      return response.data.item;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  /**
   * Update an existing inventory item
   */
  static async updateItem(id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const response = await api.put(`/items/${id}`, itemData);
      return response.data.item;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  /**
   * Delete an inventory item
   */
  static async deleteItem(id: string): Promise<void> {
    try {
      await api.delete(`/items/${id}`);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Search items for dropdown/autocomplete
   */
  static async searchItems(query: string): Promise<InventoryItem[]> {
    try {
      const response = await api.get('/items', {
        params: {
          search: query,
          limit: 20,
          isActive: true
        }
      });
      return response.data.items;
    } catch (error) {
      console.error('Error searching items:', error);
      return [];
    }
  }

  /**
   * Get item transactions (invoices and bills)
   */
  static async getItemTransactions(
    itemId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'invoices' | 'bills';
    }
  ): Promise<ItemTransactionsResponse> {
    try {
      const response = await api.get(`/items/${itemId}/transactions`, {
        params: params || {}
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching item transactions:', error);
      throw error;
    }
  }
} 