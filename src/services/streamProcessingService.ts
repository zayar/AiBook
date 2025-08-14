import { Kafka, Consumer, KafkaConfig } from 'kafkajs';
import { 
  FinancialEventUnion, 
  RealTimeMetric, 
  FeatureStoreUpdate,
  FINANCIAL_TOPICS 
} from '../types/streaming';
import { redisCacheService } from './redisCacheService';

/**
 * 🔄 Stream Processing Service
 * Real-time processing of financial event streams
 * 
 * Features:
 * • Real-time financial metrics computation
 * • AI feature extraction and updates
 * • Anomaly detection pipeline
 * • Business rule processing
 * • Feature store updates
 * • Performance monitoring
 */
export class StreamProcessingService {
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  private isRunning: boolean = false;
  private processedEventCount: number = 0;
  private errorCount: number = 0;
  private metrics: Map<string, RealTimeMetric[]> = new Map();

  constructor(config?: Partial<KafkaConfig>) {
    const defaultConfig: KafkaConfig = {
      clientId: 'aibook-stream-processor',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 5,
        maxRetryTime: 30000,
        factor: 2,
      },
    };

    this.kafka = new Kafka({ ...defaultConfig, ...config });
    this.setupProcessors();
  }

  /**
   * 🚀 START STREAM PROCESSING
   * Initialize all stream processors
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting stream processing service...');
      
      // Start all consumers
      const startPromises = Array.from(this.consumers.entries()).map(([name, consumer]) => 
        this.startConsumer(name, consumer)
      );
      
      await Promise.all(startPromises);
      
      this.isRunning = true;
      console.log('✅ Stream processing service started successfully');
      
      // Start metrics reporting
      this.startMetricsReporting();
      
    } catch (error) {
      console.error('❌ Failed to start stream processing:', error);
      throw error;
    }
  }

  /**
   * 🏗️ SETUP PROCESSORS
   * Configure stream processors for different event types
   */
  private setupProcessors(): void {
    // Transaction Stream Processor
    this.createConsumer('transaction-processor', 
      [FINANCIAL_TOPICS['financial.transactions'].name],
      this.processTransactionEvents.bind(this)
    );

    // Payment Stream Processor
    this.createConsumer('payment-processor',
      [FINANCIAL_TOPICS['financial.payments'].name],
      this.processPaymentEvents.bind(this)
    );

    // AI Events Stream Processor
    this.createConsumer('ai-processor',
      [FINANCIAL_TOPICS['financial.ai-events'].name],
      this.processAIEvents.bind(this)
    );

    // Real-time Metrics Aggregator
    this.createConsumer('metrics-aggregator',
      [
        FINANCIAL_TOPICS['financial.transactions'].name,
        FINANCIAL_TOPICS['financial.payments'].name,
      ],
      this.aggregateMetrics.bind(this)
    );
  }

  /**
   * 👥 CREATE CONSUMER
   * Factory method for creating Kafka consumers
   */
  private createConsumer(name: string, topics: string[], processor: Function): void {
    const consumer = this.kafka.consumer({
      groupId: `aibook-${name}`,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      minBytes: 1,
      maxBytes: 10485760, // 10MB
      maxWaitTimeInMs: 5000,
    });

    // Setup message handler
    const messageHandler = async ({ topic, partition, message }: any) => {
      try {
        const startTime = Date.now();
        
        if (!message.value) {
          console.warn(`⚠️ Empty message received from ${topic}`);
          return;
        }

        const event = JSON.parse(message.value.toString()) as FinancialEventUnion;
        await processor(event, { topic, partition, offset: message.offset });
        
        this.processedEventCount++;
        const processingTime = Date.now() - startTime;
        
        // Log slow processing
        if (processingTime > 1000) {
          console.warn(`🐌 Slow processing: ${name} took ${processingTime}ms for ${event.eventType}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing message in ${name}:`, error);
        this.errorCount++;
      }
    };

    // Store consumer with its configuration
    this.consumers.set(name, consumer);
    
    // Setup consumer event handlers
    consumer.on('consumer.group_join', (payload: any) => {
      console.log(`👥 Consumer ${name} joined group ${payload.groupId || 'undefined'} as ${payload.memberId || 'undefined'}`);
    });

    consumer.on('consumer.crash', (payload: any) => {
      console.error(`💥 Consumer ${name} crashed in group ${payload.groupId || 'unknown'}:`, payload.error || payload);
    });

    // Store the message handler for this consumer
    (consumer as any)._messageHandler = messageHandler;
    (consumer as any)._topics = topics;
  }

  /**
   * ▶️ START CONSUMER
   * Start individual consumer with error handling
   */
  private async startConsumer(name: string, consumer: Consumer): Promise<void> {
    try {
      await consumer.connect();
      console.log(`🔌 Connected consumer: ${name}`);
      
      const topics = (consumer as any)._topics;
      await consumer.subscribe({ topics, fromBeginning: false });
      console.log(`📺 Subscribed ${name} to topics:`, topics);
      
      await consumer.run({
        eachMessage: (consumer as any)._messageHandler,
      });
      
      console.log(`▶️ Started consumer: ${name}`);
      
    } catch (error) {
      console.error(`❌ Failed to start consumer ${name}:`, error);
      throw error;
    }
  }

  /**
   * 💳 PROCESS TRANSACTION EVENTS
   * Handle transaction-related events
   */
  private async processTransactionEvents(event: FinancialEventUnion, context: any): Promise<void> {
    if (event.eventType === 'transaction.created') {
      console.log(`💳 Processing transaction: ${event.eventId} for tenant: ${event.tenantId}`);
      
      // Update real-time account balances
      await this.updateAccountBalances(event);
      
      // Trigger AI categorization
      await this.triggerAICategorization(event);
      
      // Update financial metrics
      await this.updateFinancialMetrics(event);
      
      // Check for anomalies
      await this.checkForAnomalies(event);
    }
  }

  /**
   * 💰 PROCESS PAYMENT EVENTS
   * Handle payment-related events
   */
  private async processPaymentEvents(event: FinancialEventUnion, context: any): Promise<void> {
    if (event.eventType === 'payment.received') {
      console.log(`💰 Processing payment: ${event.eventId} for tenant: ${event.tenantId}`);
      
      // Update cash flow metrics
      await this.updateCashFlowMetrics(event);
      
      // Update customer metrics
      await this.updateCustomerMetrics(event);
      
      // Trigger payment insights
      await this.generatePaymentInsights(event);
    }
  }

  /**
   * 🤖 PROCESS AI EVENTS
   * Handle AI-generated events
   */
  private async processAIEvents(event: FinancialEventUnion, context: any): Promise<void> {
    if (event.eventType === 'ai.anomaly_detected') {
      console.log(`🚨 Processing anomaly: ${event.eventId} for tenant: ${event.tenantId}`);
      
      // Store anomaly in cache for quick access
      await this.cacheAnomalyData(event);
      
      // Trigger alerts if severity is high
      await this.triggerAnomalyAlerts(event);
    }
    
    if (event.eventType === 'ai.insight_generated') {
      console.log(`💡 Processing insight: ${event.eventId} for tenant: ${event.tenantId}`);
      
      // Update insight cache
      await this.cacheInsightData(event);
    }
  }

  /**
   * 📊 AGGREGATE METRICS
   * Real-time metrics computation
   */
  private async aggregateMetrics(event: FinancialEventUnion, context: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const tenantId = event.tenantId;

    try {
      // Create real-time metrics
      const metrics: RealTimeMetric[] = [];

      if (event.eventType === 'transaction.created') {
        const txEvent = event as any;
        
        metrics.push({
          metricName: 'transaction_count',
          value: 1,
          timestamp,
          tenantId,
          dimensions: {
            event_type: event.eventType,
            currency: txEvent.data?.currency || 'USD',
          },
        });

        if (txEvent.data?.totalAmount) {
          metrics.push({
            metricName: 'transaction_volume',
            value: txEvent.data.totalAmount,
            timestamp,
            tenantId,
            dimensions: {
              currency: txEvent.data.currency || 'USD',
            },
          });
        }
      }

      if (event.eventType === 'payment.received') {
        const payEvent = event as any;
        
        metrics.push({
          metricName: 'payment_received_count',
          value: 1,
          timestamp,
          tenantId,
          dimensions: {
            payment_method: payEvent.data?.paymentMethod || 'unknown',
            currency: payEvent.data?.currency || 'USD',
          },
        });

        if (payEvent.data?.amount) {
          metrics.push({
            metricName: 'payment_received_volume',
            value: payEvent.data.amount,
            timestamp,
            tenantId,
            dimensions: {
              currency: payEvent.data.currency || 'USD',
            },
          });
        }
      }

      // Store metrics for batch processing
      const tenantMetrics = this.metrics.get(tenantId) || [];
      tenantMetrics.push(...metrics);
      this.metrics.set(tenantId, tenantMetrics);

      // Flush metrics every 100 events or 5 minutes
      if (tenantMetrics.length >= 100) {
        await this.flushMetrics(tenantId);
      }

    } catch (error) {
      console.error('❌ Error aggregating metrics:', error);
    }
  }

  /**
   * 🔄 UPDATE ACCOUNT BALANCES
   * Real-time balance updates
   */
  private async updateAccountBalances(event: any): Promise<void> {
    try {
      const { tenantId, data } = event;
      
      if (data?.entries) {
        for (const entry of data.entries) {
          const balanceKey = `balance:${tenantId}:${entry.accountId}`;
          const balanceChange = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
          
          // Update cached balance
          await redisCacheService.invalidateTenantCache(tenantId, `*balance*`);
          
          // Store real-time balance update
          const balanceUpdate: FeatureStoreUpdate = {
            tenantId,
            featureName: `account_balance_${entry.accountId}`,
            featureValue: balanceChange,
            computedAt: new Date().toISOString(),
            version: '1.0',
            metadata: {
              sourceEvents: [event.eventId],
              computationTime: Date.now(),
            },
          };
          
          await this.updateFeatureStore(balanceUpdate);
        }
      }
    } catch (error) {
      console.error('❌ Error updating account balances:', error);
    }
  }

  /**
   * 🤖 TRIGGER AI CATEGORIZATION
   * Initiate AI processing for new transactions
   */
  private async triggerAICategorization(event: any): Promise<void> {
    // TODO: Integrate with AI categorization service
    console.log(`🤖 Triggering AI categorization for transaction ${event.eventId}`);
  }

  /**
   * 📊 UPDATE FINANCIAL METRICS
   * Real-time financial KPI updates
   */
  private async updateFinancialMetrics(event: any): Promise<void> {
    try {
      const { tenantId } = event;
      
      // Invalidate cached financial metrics to force refresh
      await redisCacheService.invalidateTenantCache(tenantId, '*metrics*');
      
      console.log(`📊 Invalidated financial metrics cache for tenant ${tenantId}`);
    } catch (error) {
      console.error('❌ Error updating financial metrics:', error);
    }
  }

  /**
   * 🚨 CHECK FOR ANOMALIES
   * Real-time anomaly detection
   */
  private async checkForAnomalies(event: any): Promise<void> {
    // TODO: Implement real-time anomaly detection
    console.log(`🔍 Checking for anomalies in transaction ${event.eventId}`);
  }

  /**
   * 💧 UPDATE CASH FLOW METRICS
   * Real-time cash flow tracking
   */
  private async updateCashFlowMetrics(event: any): Promise<void> {
    try {
      const { tenantId, data } = event;
      
      if (data?.amount) {
        const cashFlowUpdate: FeatureStoreUpdate = {
          tenantId,
          featureName: 'daily_cash_inflow',
          featureValue: data.amount,
          computedAt: new Date().toISOString(),
          version: '1.0',
          metadata: {
            sourceEvents: [event.eventId],
            computationTime: Date.now(),
          },
        };
        
        await this.updateFeatureStore(cashFlowUpdate);
      }
    } catch (error) {
      console.error('❌ Error updating cash flow metrics:', error);
    }
  }

  /**
   * 👥 UPDATE CUSTOMER METRICS
   * Customer behavior and payment patterns
   */
  private async updateCustomerMetrics(event: any): Promise<void> {
    // TODO: Implement customer metrics updates
    console.log(`👥 Updating customer metrics for payment ${event.eventId}`);
  }

  /**
   * 💡 GENERATE PAYMENT INSIGHTS
   * Payment pattern analysis
   */
  private async generatePaymentInsights(event: any): Promise<void> {
    // TODO: Implement payment insights generation
    console.log(`💡 Generating payment insights for ${event.eventId}`);
  }

  /**
   * 🗂️ UPDATE FEATURE STORE
   * Store computed features for AI models
   */
  private async updateFeatureStore(update: FeatureStoreUpdate): Promise<void> {
    try {
      const key = `feature:${update.tenantId}:${update.featureName}`;
      const data = JSON.stringify(update);
      
      // Store in Redis with 1 hour TTL
      await redisCacheService.cacheAIFeatures(update.tenantId, {
        tenantId: update.tenantId,
        version: update.version,
        updatedAt: update.computedAt,
        features: { [update.featureName]: update.featureValue } as any,
        metadata: {
          feature_count: 1,
          last_training_date: update.computedAt,
          model_versions: {},
          confidence_scores: {},
        },
      });
      
    } catch (error) {
      console.error('❌ Error updating feature store:', error);
    }
  }

  /**
   * 📊 FLUSH METRICS
   * Batch write metrics to storage
   */
  private async flushMetrics(tenantId: string): Promise<void> {
    try {
      const metrics = this.metrics.get(tenantId) || [];
      if (metrics.length === 0) return;

      console.log(`📊 Flushing ${metrics.length} metrics for tenant ${tenantId}`);
      
      // TODO: Write to time-series database (InfluxDB, CloudWatch, etc.)
      // For now, just log aggregated metrics
      const metricSummary = metrics.reduce((acc, metric) => {
        const key = `${metric.metricName}:${JSON.stringify(metric.dimensions)}`;
        acc[key] = (acc[key] || 0) + metric.value;
        return acc;
      }, {} as Record<string, number>);

      console.log(`📊 Metric summary for ${tenantId}:`, metricSummary);
      
      // Clear processed metrics
      this.metrics.set(tenantId, []);
      
    } catch (error) {
      console.error('❌ Error flushing metrics:', error);
    }
  }

  /**
   * 🗂️ CACHE ANOMALY DATA
   */
  private async cacheAnomalyData(event: any): Promise<void> {
    // TODO: Cache anomaly data for quick dashboard access
    console.log(`🗂️ Caching anomaly data for ${event.eventId}`);
  }

  /**
   * 🚨 TRIGGER ANOMALY ALERTS
   */
  private async triggerAnomalyAlerts(event: any): Promise<void> {
    // TODO: Send alerts for high-severity anomalies
    console.log(`🚨 Triggering anomaly alerts for ${event.eventId}`);
  }

  /**
   * 🗂️ CACHE INSIGHT DATA
   */
  private async cacheInsightData(event: any): Promise<void> {
    // TODO: Cache insight data for dashboard
    console.log(`🗂️ Caching insight data for ${event.eventId}`);
  }

  /**
   * 📊 START METRICS REPORTING
   * Periodic metrics reporting
   */
  private startMetricsReporting(): void {
    setInterval(() => {
      const errorRate = this.processedEventCount > 0 ? 
        (this.errorCount / this.processedEventCount) * 100 : 0;

      console.log('📊 Stream Processing Metrics:', {
        processedEvents: this.processedEventCount,
        errorCount: this.errorCount,
        errorRate: `${errorRate.toFixed(2)}%`,
        activeConsumers: this.consumers.size,
        isRunning: this.isRunning,
      });
    }, 60000); // Every minute
  }

  /**
   * 🛑 STOP STREAM PROCESSING
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping stream processing service...');
      
      // Flush all pending metrics
      for (const tenantId of this.metrics.keys()) {
        await this.flushMetrics(tenantId);
      }
      
      // Disconnect all consumers
      const disconnectPromises = Array.from(this.consumers.values()).map(consumer => 
        consumer.disconnect()
      );
      
      await Promise.all(disconnectPromises);
      
      this.isRunning = false;
      console.log('✅ Stream processing service stopped gracefully');
      
    } catch (error) {
      console.error('❌ Error stopping stream processing:', error);
    }
  }

  /**
   * 📊 GET STATUS
   * Return current service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processedEvents: this.processedEventCount,
      errorCount: this.errorCount,
      errorRate: this.processedEventCount > 0 ? 
        (this.errorCount / this.processedEventCount) * 100 : 0,
      activeConsumers: Array.from(this.consumers.keys()),
      pendingMetrics: Array.from(this.metrics.entries()).map(([tenantId, metrics]) => ({
        tenantId,
        count: metrics.length,
      })),
    };
  }
}

// Export singleton instance
export const streamProcessingService = new StreamProcessingService();
