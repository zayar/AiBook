/**
 * 🚀 Financial Event Streaming Types
 * Comprehensive type definitions for real-time financial event processing
 */

// ===========================================
// CORE EVENT TYPES
// ===========================================

export interface BaseFinancialEvent {
  eventId: string;
  eventType: FinancialEventType;
  tenantId: string;
  userId?: string;
  timestamp: string; // ISO string
  version: string;
  source: string; // e.g., 'aibook-backend', 'mobile-app'
  correlationId?: string;
  metadata: {
    environment: 'development' | 'staging' | 'production';
    clientVersion?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  data?: any; // Allow data property for DLQ and other flexible events
}

export type FinancialEventType =
  // Transaction Events
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.deleted'
  | 'transaction.reconciled'
  
  // Payment Events
  | 'payment.received'
  | 'payment.sent'
  | 'payment.failed'
  | 'payment.refunded'
  
  // Invoice Events
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'invoice.cancelled'
  
  // Account Events
  | 'account.created'
  | 'account.updated'
  | 'account.closed'
  | 'account.balance_changed'
  
  // AI Events
  | 'ai.categorization_completed'
  | 'ai.anomaly_detected'
  | 'ai.insight_generated'
  | 'ai.prediction_made'
  | 'ai.user_feedback_received'
  
  // Business Events
  | 'business.customer_added'
  | 'business.vendor_added'
  | 'business.fiscal_year_changed'
  | 'business.settings_updated'
  
  // System Events
  | 'system.backup_completed'
  | 'system.error_occurred'
  | 'system.maintenance_started';

// ===========================================
// SPECIFIC EVENT PAYLOADS
// ===========================================

export interface TransactionCreatedEvent extends BaseFinancialEvent {
  eventType: 'transaction.created';
  data: {
    transactionId: string;
    journalId: string;
    entries: Array<{
      entryId: string;
      accountId: string;
      accountCode: string;
      accountName: string;
      amount: number;
      type: 'DEBIT' | 'CREDIT';
      currency: string;
      exchangeRate: number;
    }>;
    totalAmount: number;
    currency: string;
    memo?: string;
    reference?: string;
    postedAt: string;
    fiscalPeriod: {
      year: number;
      quarter: number;
      month: number;
    };
    businessContext?: {
      customerId?: string;
      vendorId?: string;
      projectId?: string;
      departmentId?: string;
    };
  };
}

export interface PaymentReceivedEvent extends BaseFinancialEvent {
  eventType: 'payment.received';
  data: {
    paymentId: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentDate: string;
    invoices?: Array<{
      invoiceId: string;
      allocatedAmount: number;
    }>;
    bankAccount?: {
      accountId: string;
      accountName: string;
    };
    fees?: number;
    notes?: string;
  };
}

export interface InvoiceCreatedEvent extends BaseFinancialEvent {
  eventType: 'invoice.created';
  data: {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      taxRate?: number;
    }>;
    terms?: string;
    recurring?: boolean;
  };
}

export interface AIAnomalyDetectedEvent extends BaseFinancialEvent {
  eventType: 'ai.anomaly_detected';
  data: {
    anomalyId: string;
    anomalyType: 'amount' | 'frequency' | 'pattern' | 'timing' | 'category';
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    description: string;
    affectedEntity: {
      type: 'transaction' | 'account' | 'customer' | 'vendor';
      id: string;
      name: string;
    };
    detectionModel: {
      name: string;
      version: string;
      threshold: number;
    };
    suggestedAction?: string;
    historicalData?: {
      averageAmount?: number;
      standardDeviation?: number;
      lastSimilarOccurrence?: string;
    };
  };
}

export interface AIInsightGeneratedEvent extends BaseFinancialEvent {
  eventType: 'ai.insight_generated';
  data: {
    insightId: string;
    insightType: 'cash_flow' | 'expense_optimization' | 'revenue_opportunity' | 'risk_assessment';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    confidence: number;
    impact: {
      financial?: number; // Estimated financial impact
      timeframe?: string; // When impact expected
      probability?: number; // Likelihood of impact
    };
    recommendations: Array<{
      action: string;
      effort: 'low' | 'medium' | 'high';
      expectedOutcome: string;
    }>;
    dataPoints: Array<{
      metric: string;
      value: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      period: string;
    }>;
  };
}

// ===========================================
// STREAMING CONFIGURATION
// ===========================================

export interface KafkaTopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  retention: {
    ms: number; // Retention time in milliseconds
    bytes: number; // Max size in bytes
  };
  compression: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
}

export const FINANCIAL_TOPICS: Record<string, KafkaTopicConfig> = {
  // High-volume transaction events
  'financial.transactions': {
    name: 'financial.transactions',
    partitions: 6,
    replicationFactor: 1,
    retention: {
      ms: 7 * 24 * 60 * 60 * 1000, // 7 days
      bytes: 5 * 1024 * 1024 * 1024, // 5GB
    },
    compression: 'lz4',
  },
  
  // Payment events
  'financial.payments': {
    name: 'financial.payments',
    partitions: 3,
    replicationFactor: 1,
    retention: {
      ms: 30 * 24 * 60 * 60 * 1000, // 30 days
      bytes: 2 * 1024 * 1024 * 1024, // 2GB
    },
    compression: 'gzip',
  },
  
  // AI-generated events
  'financial.ai-events': {
    name: 'financial.ai-events',
    partitions: 3,
    replicationFactor: 1,
    retention: {
      ms: 90 * 24 * 60 * 60 * 1000, // 90 days
      bytes: 1 * 1024 * 1024 * 1024, // 1GB
    },
    compression: 'snappy',
  },
  
  // Business events
  'financial.business-events': {
    name: 'financial.business-events',
    partitions: 2,
    replicationFactor: 1,
    retention: {
      ms: 365 * 24 * 60 * 60 * 1000, // 1 year
      bytes: 500 * 1024 * 1024, // 500MB
    },
    compression: 'gzip',
  },
  
  // Dead letter queue for failed events
  'financial.dlq': {
    name: 'financial.dlq',
    partitions: 1,
    replicationFactor: 1,
    retention: {
      ms: 30 * 24 * 60 * 60 * 1000, // 30 days
      bytes: 100 * 1024 * 1024, // 100MB
    },
    compression: 'gzip',
  },
};

// ===========================================
// STREAM PROCESSING TYPES
// ===========================================

export interface StreamProcessor {
  name: string;
  inputTopics: string[];
  outputTopics: string[];
  processingType: 'filter' | 'transform' | 'aggregate' | 'join' | 'window';
  config: {
    windowSize?: string; // e.g., "5 minutes", "1 hour"
    groupBy?: string[];
    outputFormat?: 'json' | 'avro' | 'protobuf';
    errorHandling?: 'skip' | 'dlq' | 'retry';
  };
}

export interface RealTimeMetric {
  metricName: string;
  value: number;
  timestamp: string;
  tenantId: string;
  dimensions: Record<string, string>;
  tags?: Record<string, string>;
}

export interface FeatureStoreUpdate {
  tenantId: string;
  featureName: string;
  featureValue: any;
  computedAt: string;
  version: string;
  metadata: {
    sourceEvents: string[];
    computationTime: number;
    confidence?: number;
  };
}

// ===========================================
// ERROR HANDLING
// ===========================================

export interface StreamingError {
  errorId: string;
  timestamp: string;
  eventId: string;
  tenantId: string;
  errorType: 'processing' | 'validation' | 'network' | 'storage';
  message: string;
  stackTrace?: string;
  context: {
    topic: string;
    partition: number;
    offset: number;
    processorName?: string;
  };
  retryCount: number;
  maxRetries: number;
}

// ===========================================
// UTILITY TYPES
// ===========================================

export type FinancialEventUnion = 
  | TransactionCreatedEvent
  | PaymentReceivedEvent
  | InvoiceCreatedEvent
  | AIAnomalyDetectedEvent
  | AIInsightGeneratedEvent;

export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<FinancialEventType, number>;
  errorRate: number;
  averageProcessingTime: number;
  throughput: {
    eventsPerSecond: number;
    bytesPerSecond: number;
  };
}
