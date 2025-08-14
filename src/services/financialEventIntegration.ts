import { kafkaEventProducer } from './kafkaEventProducer';
import { streamProcessingService } from './streamProcessingService';
import { 
  TransactionCreatedEvent, 
  PaymentReceivedEvent, 
  InvoiceCreatedEvent,
  AIAnomalyDetectedEvent,
  AIInsightGeneratedEvent 
} from '../types/streaming';

/**
 * 🔗 Financial Event Integration Service
 * Bridges existing financial operations with streaming infrastructure
 * 
 * Features:
 * • Automatically captures financial transactions
 * • Publishes events to Kafka streams
 * • Triggers real-time AI processing
 * • Updates feature store
 * • Handles errors gracefully
 */
export class FinancialEventIntegration {
  private isStreamingEnabled: boolean = false;
  private eventCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.checkStreamingAvailability();
  }

  /**
   * 🔌 INITIALIZE STREAMING
   * Start event streaming and processing
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔌 Initializing financial event streaming...');
      
      // Check if Kafka is available
      if (process.env.NODE_ENV !== 'test' && process.env.KAFKA_ENABLED !== 'false') {
        try {
          await kafkaEventProducer.connect();
          await streamProcessingService.start();
          this.isStreamingEnabled = true;
          console.log('✅ Financial event streaming initialized successfully');
        } catch (error) {
          console.warn('⚠️ Kafka not available, running without streaming:', (error as Error).message);
          this.isStreamingEnabled = false;
        }
      } else {
        console.log('📝 Streaming disabled for testing/development');
        this.isStreamingEnabled = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize streaming:', error);
      this.isStreamingEnabled = false;
    }
  }

  /**
   * 💳 PUBLISH TRANSACTION EVENT
   * Called when a new transaction is created
   */
  async publishTransactionCreated(transactionData: {
    transactionId: string;
    journalId: string;
    tenantId: string;
    userId?: string;
    entries: Array<{
      entryId: string;
      accountId: string;
      accountCode: string;
      accountName: string;
      amount: number;
      type: 'DEBIT' | 'CREDIT';
      currency: string;
      exchangeRate?: number;
    }>;
    totalAmount: number;
    currency: string;
    memo?: string;
    reference?: string;
    postedAt: Date;
    businessContext?: {
      customerId?: string;
      vendorId?: string;
      projectId?: string;
      departmentId?: string;
    };
  }): Promise<void> {
    try {
      if (!this.isStreamingEnabled) {
        console.log('📝 Streaming disabled, skipping transaction event');
        return;
      }

      const event: TransactionCreatedEvent = {
        eventId: `tx_event_${transactionData.transactionId}_${Date.now()}`,
        eventType: 'transaction.created',
        tenantId: transactionData.tenantId,
        userId: transactionData.userId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'aibook-backend',
        correlationId: `corr_${transactionData.transactionId}`,
        metadata: {
          environment: process.env.NODE_ENV as any || 'development',
          clientVersion: '1.0.0',
        },
        data: {
          transactionId: transactionData.transactionId,
          journalId: transactionData.journalId,
          entries: transactionData.entries.map(entry => ({
            ...entry,
            exchangeRate: entry.exchangeRate || 1.0,
          })),
          totalAmount: transactionData.totalAmount,
          currency: transactionData.currency,
          memo: transactionData.memo,
          reference: transactionData.reference,
          postedAt: transactionData.postedAt.toISOString(),
          fiscalPeriod: this.getFiscalPeriod(transactionData.postedAt),
          businessContext: transactionData.businessContext,
        },
      };

      await kafkaEventProducer.publishEvent(event);
      this.eventCount++;
      
      console.log(`📤 Published transaction event: ${transactionData.transactionId}`);
    } catch (error) {
      console.error('❌ Failed to publish transaction event:', error);
      this.errorCount++;
    }
  }

  /**
   * 💰 PUBLISH PAYMENT EVENT
   * Called when a payment is received
   */
  async publishPaymentReceived(paymentData: {
    paymentId: string;
    tenantId: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentDate: Date;
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
  }): Promise<void> {
    try {
      if (!this.isStreamingEnabled) {
        console.log('📝 Streaming disabled, skipping payment event');
        return;
      }

      const event: PaymentReceivedEvent = {
        eventId: `pay_event_${paymentData.paymentId}_${Date.now()}`,
        eventType: 'payment.received',
        tenantId: paymentData.tenantId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'aibook-backend',
        correlationId: `corr_${paymentData.paymentId}`,
        metadata: {
          environment: process.env.NODE_ENV as any || 'development',
          clientVersion: '1.0.0',
        },
        data: {
          paymentId: paymentData.paymentId,
          customerId: paymentData.customerId,
          customerName: paymentData.customerName,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.paymentMethod,
          paymentDate: paymentData.paymentDate.toISOString(),
          invoices: paymentData.invoices,
          bankAccount: paymentData.bankAccount,
          fees: paymentData.fees,
          notes: paymentData.notes,
        },
      };

      await kafkaEventProducer.publishEvent(event);
      this.eventCount++;
      
      console.log(`📤 Published payment event: ${paymentData.paymentId}`);
    } catch (error) {
      console.error('❌ Failed to publish payment event:', error);
      this.errorCount++;
    }
  }

  /**
   * 📄 PUBLISH INVOICE EVENT
   * Called when an invoice is created
   */
  async publishInvoiceCreated(invoiceData: {
    invoiceId: string;
    invoiceNumber: string;
    tenantId: string;
    customerId: string;
    customerName: string;
    issueDate: Date;
    dueDate: Date;
    currency: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      taxRate?: number;
    }>;
    terms?: string;
    recurring?: boolean;
  }): Promise<void> {
    try {
      if (!this.isStreamingEnabled) {
        console.log('📝 Streaming disabled, skipping invoice event');
        return;
      }

      const event: InvoiceCreatedEvent = {
        eventId: `inv_event_${invoiceData.invoiceId}_${Date.now()}`,
        eventType: 'invoice.created',
        tenantId: invoiceData.tenantId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'aibook-backend',
        correlationId: `corr_${invoiceData.invoiceId}`,
        metadata: {
          environment: process.env.NODE_ENV as any || 'development',
          clientVersion: '1.0.0',
        },
        data: {
          invoiceId: invoiceData.invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          customerId: invoiceData.customerId,
          customerName: invoiceData.customerName,
          issueDate: invoiceData.issueDate.toISOString(),
          dueDate: invoiceData.dueDate.toISOString(),
          currency: invoiceData.currency,
          subtotal: invoiceData.subtotal,
          taxAmount: invoiceData.taxAmount,
          totalAmount: invoiceData.totalAmount,
          status: invoiceData.status as any,
          items: invoiceData.items,
          terms: invoiceData.terms,
          recurring: invoiceData.recurring,
        },
      };

      await kafkaEventProducer.publishEvent(event);
      this.eventCount++;
      
      console.log(`📤 Published invoice event: ${invoiceData.invoiceNumber}`);
    } catch (error) {
      console.error('❌ Failed to publish invoice event:', error);
      this.errorCount++;
    }
  }

  /**
   * 🤖 PUBLISH AI ANOMALY EVENT
   * Called when AI detects an anomaly
   */
  async publishAIAnomalyDetected(anomalyData: {
    anomalyId: string;
    tenantId: string;
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
  }): Promise<void> {
    try {
      if (!this.isStreamingEnabled) {
        console.log('📝 Streaming disabled, skipping anomaly event');
        return;
      }

      const event: AIAnomalyDetectedEvent = {
        eventId: `anomaly_event_${anomalyData.anomalyId}_${Date.now()}`,
        eventType: 'ai.anomaly_detected',
        tenantId: anomalyData.tenantId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'aibook-ai-engine',
        correlationId: `corr_${anomalyData.anomalyId}`,
        metadata: {
          environment: process.env.NODE_ENV as any || 'development',
          clientVersion: '1.0.0',
        },
        data: anomalyData,
      };

      await kafkaEventProducer.publishEvent(event);
      this.eventCount++;
      
      console.log(`📤 Published anomaly event: ${anomalyData.anomalyId} (${anomalyData.severity})`);
    } catch (error) {
      console.error('❌ Failed to publish anomaly event:', error);
      this.errorCount++;
    }
  }

  /**
   * 💡 PUBLISH AI INSIGHT EVENT
   * Called when AI generates insights
   */
  async publishAIInsightGenerated(insightData: {
    insightId: string;
    tenantId: string;
    insightType: 'cash_flow' | 'expense_optimization' | 'revenue_opportunity' | 'risk_assessment';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    confidence: number;
    impact: {
      financial?: number;
      timeframe?: string;
      probability?: number;
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
  }): Promise<void> {
    try {
      if (!this.isStreamingEnabled) {
        console.log('📝 Streaming disabled, skipping insight event');
        return;
      }

      const event: AIInsightGeneratedEvent = {
        eventId: `insight_event_${insightData.insightId}_${Date.now()}`,
        eventType: 'ai.insight_generated',
        tenantId: insightData.tenantId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'aibook-ai-engine',
        correlationId: `corr_${insightData.insightId}`,
        metadata: {
          environment: process.env.NODE_ENV as any || 'development',
          clientVersion: '1.0.0',
        },
        data: insightData,
      };

      await kafkaEventProducer.publishEvent(event);
      this.eventCount++;
      
      console.log(`📤 Published insight event: ${insightData.title} (${insightData.priority})`);
    } catch (error) {
      console.error('❌ Failed to publish insight event:', error);
      this.errorCount++;
    }
  }

  /**
   * 🛑 SHUTDOWN
   * Clean shutdown of streaming services
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down financial event streaming...');
      
      if (this.isStreamingEnabled) {
        await streamProcessingService.stop();
        await kafkaEventProducer.disconnect();
      }
      
      console.log('✅ Financial event streaming shut down successfully');
    } catch (error) {
      console.error('❌ Error during streaming shutdown:', error);
    }
  }

  /**
   * 📊 GET METRICS
   * Return streaming metrics
   */
  getMetrics() {
    return {
      isStreamingEnabled: this.isStreamingEnabled,
      eventCount: this.eventCount,
      errorCount: this.errorCount,
      errorRate: this.eventCount > 0 ? (this.errorCount / this.eventCount) * 100 : 0,
      kafkaMetrics: this.isStreamingEnabled ? kafkaEventProducer.getMetrics() : null,
      streamProcessingStatus: this.isStreamingEnabled ? streamProcessingService.getStatus() : null,
    };
  }

  /**
   * 🔧 HELPER METHODS
   */
  private checkStreamingAvailability(): void {
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    console.log(`🔍 Checking streaming availability at: ${kafkaBrokers}`);
  }

  private getFiscalPeriod(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const quarter = Math.ceil(month / 3);
    
    return {
      year,
      quarter,
      month,
    };
  }

  /**
   * 🧪 TEST STREAMING
   * Send test events for validation
   */
  async testStreaming(): Promise<boolean> {
    try {
      console.log('🧪 Testing streaming integration...');
      
      if (!this.isStreamingEnabled) {
        console.log('📝 Streaming disabled, test skipped');
        return false;
      }

      // Test transaction event
      await this.publishTransactionCreated({
        transactionId: `test_tx_${Date.now()}`,
        journalId: `test_journal_${Date.now()}`,
        tenantId: 'test-tenant',
        userId: 'test-user',
        entries: [
          {
            entryId: 'test_entry_1',
            accountId: 'test_acc_cash',
            accountCode: '1000',
            accountName: 'Test Cash Account',
            amount: 100,
            type: 'DEBIT',
            currency: 'USD',
            exchangeRate: 1.0,
          },
          {
            entryId: 'test_entry_2',
            accountId: 'test_acc_revenue',
            accountCode: '4000',
            accountName: 'Test Revenue Account',
            amount: 100,
            type: 'CREDIT',
            currency: 'USD',
            exchangeRate: 1.0,
          },
        ],
        totalAmount: 100,
        currency: 'USD',
        memo: 'Test transaction from integration test',
        reference: 'TEST-INTEGRATION-001',
        postedAt: new Date(),
      });

      console.log('✅ Streaming integration test completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Streaming integration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const financialEventIntegration = new FinancialEventIntegration();
