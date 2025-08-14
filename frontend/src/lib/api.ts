import axios from 'axios';

// API Configuration - Use Next.js proxy
const API_BASE_URL = '/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant ID
    const tenantId = (typeof window !== 'undefined' && (localStorage.getItem('tenantId') || 'default')) || 'default';
    config.headers['x-tenant-id'] = tenantId;
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  date: string;
  merchant?: string;
  aiConfidence?: number;
  status: 'pending' | 'categorized' | 'reviewed';
}

export interface AIInsight {
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  data?: any;
  estimatedSavings?: number;
  timeframe?: string;
}

export interface CashFlowForecast {
  period: string;
  expectedInflow: number;
  expectedOutflow: number;
  netFlow: number;
  confidence: number;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'error';
  lastActivity: string;
  capabilities: string[];
}

export interface TransactionCategorizationRequest {
  description: string;
  amount: number;
  merchant?: string;
  date: string;
  currency?: string;
  exchangeRate?: number;
}

export interface TransactionCategorizationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  reasoning: string;
  suggestedAccount: string;
  tags: string[];
}

// API Service Class
export class ApiService {
  // Health and Status
  static async getHealth() {
    const response = await api.get('/health');
    return response.data;
  }

  static async getStatus() {
    const response = await api.get('/status');
    return response.data;
  }

  // Authentication
  static async register(userData: { email: string; password: string; name: string }) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  }

  static async login(credentials: { email: string; password: string }) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  }

  static async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }

  // Transactions
  static async getTransactions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const response = await api.get('/transactions', { params });
    return response.data;
  }

  static async createTransaction(transaction: {
    memo: string;
    reference?: string;
    entries: Array<{
      accountCode: string;
      amount: number;
      type: 'DEBIT' | 'CREDIT';
      currency?: string;
      exchangeRate?: number;
    }>;
  }) {
    const response = await api.post('/transactions/journal-entries', transaction);
    return response.data;
  }

  static async getTrialBalance() {
    const response = await api.get('/transactions/trial-balance');
    return response.data;
  }

  static async getAccountBalance(accountCode: string) {
    const response = await api.get(`/transactions/accounts/${accountCode}/balance`);
    return response.data;
  }

  static async getAccountLedger(accountCode: string) {
    const response = await api.get(`/transactions/accounts/${accountCode}/ledger`);
    return response.data;
  }

  // AI Services
  static async categorizeTransaction(request: TransactionCategorizationRequest): Promise<TransactionCategorizationResult> {
    const response = await api.post('/ai/categorize-transaction', request);
    return response.data.data;
  }

  static async getAIInsights(period: string = '3m'): Promise<AIInsight[]> {
    const response = await api.get(`/ai/insights?period=${period}`);
    return response.data.data.insights;
  }

  static async getCashFlowForecast(periods: number = 6): Promise<CashFlowForecast[]> {
    const response = await api.get(`/ai/forecast-cashflow?periods=${periods}`);
    return response.data.data.forecast.periods;
  }

  static async detectAnomalies(): Promise<any[]> {
    const response = await api.get('/ai/detect-anomalies');
    return response.data.data.anomalies;
  }

  static async processNaturalLanguageQuery(query: string): Promise<{
    type: string;
    answer: string;
    data?: any;
    confidence: number;
    followUpQuestions?: string[];
  }> {
    const response = await api.post('/ai/query', { query });
    return response.data.data;
  }

  static async getAISuggestions(context: string = 'general'): Promise<any[]> {
    const response = await api.get(`/ai/suggestions?context=${context}`);
    return response.data.data;
  }

  static async getAIAgents(): Promise<AIAgent[]> {
    const response = await api.get('/ai/agents');
    return response.data.data.agents;
  }

  // Accounts
  static async getAccounts() {
    const response = await api.get('/accounts');
    return response.data;
  }

  // Tenants
  static async getCurrentTenant() {
    const response = await api.get('/tenants/current');
    return response.data;
  }

  static async getTenantStats() {
    const response = await api.get('/tenants/stats');
    return response.data;
  }

  // Users
  static async getUsers() {
    const response = await api.get('/auth/users');
    return response.data;
  }

  // File Upload for Receipt Processing
  static async uploadReceipt(file: File): Promise<{
    transactionData: TransactionCategorizationRequest;
    confidence: number;
  }> {
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await api.post('/ai/process-receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  // Inventory Management
  static async getInventoryItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    lowStock?: boolean;
  }) {
    const response = await api.get('/inventory/items', { params });
    return response.data;
  }

  static async createInventoryItem(item: {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    unit?: string;
    costPrice: number;
    sellingPrice: number;
    initialStock?: number;
    reorderPoint?: number;
    supplierId?: string;
    barcode?: string;
    dimensions?: string;
    weight?: number;
  }) {
    const response = await api.post('/inventory/items', item);
    return response.data;
  }

  static async getInventoryReport(type: string = 'summary', period?: string) {
    const response = await api.get(`/inventory/reports?type=${type}&period=${period}`);
    return response.data;
  }

  // Tax Management
  static async calculateTax(data: {
    amount: number;
    jurisdiction: string;
    taxType?: string;
    documentType?: string;
    documentId?: string;
    customerId?: string;
    vendorId?: string;
    applyExemptions?: boolean;
    exemptions?: string[];
  }) {
    const response = await api.post('/taxes/calculate', data);
    return response.data;
  }

  static async getTaxRates(params?: {
    jurisdiction?: string;
    taxType?: string;
    active?: boolean;
  }) {
    const response = await api.get('/taxes/rates', { params });
    return response.data;
  }

  static async createTaxRate(rate: {
    name: string;
    rate: number;
    jurisdiction: string;
    taxType: string;
    accountId: string;
    effectiveDate: string;
    expiryDate?: string;
    metadata?: any;
  }) {
    const response = await api.post('/taxes/rates', rate);
    return response.data;
  }

  static async getTaxReport(type: string = 'summary', jurisdiction?: string, period?: string) {
    const response = await api.get(`/taxes/reports?type=${type}&jurisdiction=${jurisdiction}&period=${period}`);
    return response.data;
  }

  // Financial Reporting
  static async getProfitLossReport(params?: {
    startDate?: string;
    endDate?: string;
    bookId?: string;
    includeAI?: boolean;
    format?: string;
  }) {
    const response = await api.get('/reports/profit-loss', { params });
    return response.data;
  }

  static async getCashFlowReport(period?: string, params?: {
    startDate?: string;
    endDate?: string;
    bookId?: string;
    includeForecast?: boolean;
    forecastPeriods?: number;
  }) {
    const response = await api.get('/reports/cash-flow', { 
      params: { period, ...params }
    });
    return response.data;
  }

  static async getBalanceSheetReport(params?: {
    asOfDate?: string;
    bookId?: string;
    includeAI?: boolean;
    format?: string;
  }) {
    const response = await api.get('/reports/balance-sheet', { params });
    return response.data;
  }
}

export default api; 