/**
 * 🚀 Cache Type Definitions
 * Type definitions for Redis caching and feature store
 */

export interface FinancialMetrics {
  tenantId: string;
  period: string; // e.g., "2024-01", "2024-Q1", "2024"
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossProfit: number;
  operatingExpenses: number;
  cashFlow: number;
  averageInvoiceValue: number;
  totalCustomers: number;
  activeCustomers: number;
  totalTransactions: number;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  kpis: {
    profitMargin: number;
    revenueGrowth: number;
    customerGrowth: number;
    averagePaymentDays: number;
    cashFlowRatio: number;
  };
  generatedAt: string;
  dataFreshness: number; // minutes since last update
}

export interface CachedReport {
  reportId: string;
  tenantId: string;
  reportType: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'trial_balance' | 'general_ledger';
  period: string;
  data: any; // The actual report data structure
  metadata: {
    generatedAt: string;
    executionTime: number;
    recordCount: number;
    filters: Record<string, any>;
  };
  aiInsights?: {
    summary: string;
    trends: string[];
    recommendations: string[];
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
}

export interface FeatureStore {
  tenantId: string;
  version: string;
  updatedAt: string;
  features: {
    // Financial Features
    monthly_revenue: number;
    monthly_expenses: number;
    cash_flow_velocity: number;
    invoice_payment_velocity: number;
    customer_lifetime_value: number;
    
    // Trend Features
    revenue_trend_3m: number[];
    expense_trend_3m: number[];
    seasonal_factors: number[];
    
    // Risk Features
    overdue_invoice_ratio: number;
    cash_burn_rate: number;
    customer_concentration_risk: number;
    
    // AI Features
    transaction_embeddings: number[][]; // Vector embeddings
    category_predictions: Record<string, number>;
    anomaly_scores: number[];
    
    // Behavioral Features
    user_interaction_patterns: Record<string, any>;
    business_context_scores: Record<string, number>;
    
    // Predictive Features
    next_month_revenue_forecast: number;
    cash_flow_forecast_30d: number[];
    churn_probability: number;
  };
  metadata: {
    feature_count: number;
    last_training_date: string;
    model_versions: Record<string, string>;
    confidence_scores: Record<string, number>;
  };
}

export interface CacheKey {
  tenant: string;
  type: 'metrics' | 'features' | 'report' | 'prediction';
  identifier: string;
  period?: string;
}

export interface CacheConfig {
  ttl: {
    financial_metrics: number; // 5 minutes
    ai_features: number; // 10 minutes
    reports: number; // 30 minutes
    predictions: number; // 60 minutes
  };
  maxMemory: string;
  evictionPolicy: string;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalKeys: number;
  memoryUsage: string;
  uptime: number;
  tenantStats: Record<string, {
    keyCount: number;
    hitRate: number;
    lastAccess: string;
  }>;
}

export interface AIFeatureRequest {
  tenantId: string;
  features: string[]; // List of feature names to retrieve
  includeMetadata?: boolean;
  freshness?: number; // Max age in minutes
}

export interface AIFeatureResponse {
  tenantId: string;
  features: Record<string, any>;
  metadata: {
    cachedAt: string;
    freshness: number;
    confidence: number;
  };
  fromCache: boolean;
}
