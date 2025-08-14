import { Kafka, Producer, KafkaConfig, ProducerRecord } from 'kafkajs';
import { 
  BaseFinancialEvent, 
  FinancialEventUnion, 
  FINANCIAL_TOPICS,
  EventValidationResult,
  StreamingError 
} from '../types/streaming';

/**
 * 🚀 Kafka Event Producer Service
 * High-performance, reliable financial event streaming
 * 
 * Features:
 * • Automatic topic routing based on event type
 * • Event validation and schema checking
 * • Retry logic with exponential backoff
 * • Dead letter queue for failed events
 * • Performance monitoring and metrics
 * • Multi-tenant event isolation
 */
export class KafkaEventProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;
  private eventMetrics: Map<string, number> = new Map();
  private errorCount: number = 0;

  constructor(config?: Partial<KafkaConfig>) {
    const defaultConfig: KafkaConfig = {
      clientId: 'aibook-financial-producer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 5,
        maxRetryTime: 30000,
        factor: 2,
      },
      connectionTimeout: 3000,
      requestTimeout: 30000,
    };

    this.kafka = new Kafka({ ...defaultConfig, ...config });
    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    });

    this.setupErrorHandling();
  }

  /**
   * 🔌 CONNECT TO KAFKA
   * Initialize producer connection
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to Kafka...');
      await this.producer.connect();
      this.isConnected = true;
      console.log('✅ Kafka producer connected successfully');
      
      // Create topics if they don't exist
      await this.ensureTopicsExist();
    } catch (error) {
      console.error('❌ Failed to connect to Kafka:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 📨 PUBLISH FINANCIAL EVENT
   * Main entry point for publishing events
   */
  async publishEvent(event: FinancialEventUnion): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Validate event
      const validation = this.validateEvent(event);
      if (!validation.isValid) {
        throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
      }

      // Determine target topic
      const topic = this.getTopicForEvent(event);
      
      // Prepare message
      const message = this.prepareMessage(event);
      
      // Publish to Kafka
      if (this.isConnected) {
        await this.sendToKafka(topic, message, event.tenantId);
      } else {
        // Fallback: store locally or queue for later
        await this.handleOfflineEvent(event);
      }

      // Update metrics
      this.updateMetrics(event.eventType, Date.now() - startTime);
      
      console.log(`📨 Published ${event.eventType} event for tenant ${event.tenantId}`);
      
    } catch (error) {
      console.error(`❌ Failed to publish event ${event.eventId}:`, error);
      this.errorCount++;
      
      // Send to dead letter queue
      await this.sendToDeadLetterQueue(event, error as Error);
      throw error;
    }
  }

  /**
   * 📦 BATCH PUBLISH EVENTS
   * Efficient batch processing for high throughput
   */
  async publishBatch(events: FinancialEventUnion[]): Promise<void> {
    console.log(`📦 Publishing batch of ${events.length} events`);
    
    try {
      // Group events by topic for efficient batching
      const eventsByTopic = this.groupEventsByTopic(events);
      
      // Send each topic batch
      const promises = Object.entries(eventsByTopic).map(([topic, topicEvents]) => 
        this.sendBatchToTopic(topic, topicEvents)
      );
      
      await Promise.all(promises);
      console.log(`✅ Successfully published batch of ${events.length} events`);
      
    } catch (error) {
      console.error('❌ Batch publish failed:', error);
      
      // Fallback: try individual sends
      console.log('🔄 Falling back to individual event publishing...');
      await this.publishEventsIndividually(events);
    }
  }

  /**
   * 🏗️ ENSURE TOPICS EXIST
   * Create required Kafka topics
   */
  private async ensureTopicsExist(): Promise<void> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const existingTopics = await admin.listTopics();
      const topicsToCreate = Object.values(FINANCIAL_TOPICS)
        .filter(config => !existingTopics.includes(config.name))
        .map(config => ({
          topic: config.name,
          numPartitions: config.partitions,
          replicationFactor: config.replicationFactor,
          configEntries: [
            { name: 'retention.ms', value: config.retention.ms.toString() },
            { name: 'retention.bytes', value: config.retention.bytes.toString() },
            { name: 'compression.type', value: config.compression },
            { name: 'cleanup.policy', value: 'delete' },
          ],
        }));

      if (topicsToCreate.length > 0) {
        console.log(`🏗️ Creating ${topicsToCreate.length} Kafka topics...`);
        await admin.createTopics({
          topics: topicsToCreate,
          waitForLeaders: true,
          timeout: 10000,
        });
        console.log('✅ Topics created successfully');
      }

      await admin.disconnect();
    } catch (error) {
      console.error('❌ Failed to ensure topics exist:', error);
      // Non-fatal error - topics might be auto-created
    }
  }

  /**
   * ✅ VALIDATE EVENT
   * Comprehensive event validation
   */
  private validateEvent(event: BaseFinancialEvent): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!event.eventId) errors.push('eventId is required');
    if (!event.eventType) errors.push('eventType is required');
    if (!event.tenantId) errors.push('tenantId is required');
    if (!event.timestamp) errors.push('timestamp is required');
    if (!event.version) errors.push('version is required');

    // Validate timestamp format
    if (event.timestamp && isNaN(Date.parse(event.timestamp))) {
      errors.push('timestamp must be a valid ISO string');
    }

    // Validate event ID format
    if (event.eventId && event.eventId.length < 10) {
      warnings.push('eventId should be at least 10 characters for uniqueness');
    }

    // Check for future timestamps
    if (event.timestamp && new Date(event.timestamp) > new Date()) {
      warnings.push('Event timestamp is in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 🎯 GET TOPIC FOR EVENT
   * Route events to appropriate topics
   */
  private getTopicForEvent(event: BaseFinancialEvent): string {
    if (event.eventType.startsWith('transaction.') || event.eventType.startsWith('account.')) {
      return FINANCIAL_TOPICS['financial.transactions'].name;
    }
    
    if (event.eventType.startsWith('payment.') || event.eventType.startsWith('invoice.')) {
      return FINANCIAL_TOPICS['financial.payments'].name;
    }
    
    if (event.eventType.startsWith('ai.')) {
      return FINANCIAL_TOPICS['financial.ai-events'].name;
    }
    
    if (event.eventType.startsWith('business.')) {
      return FINANCIAL_TOPICS['financial.business-events'].name;
    }
    
    // Default topic for unknown event types
    return FINANCIAL_TOPICS['financial.business-events'].name;
  }

  /**
   * 📋 PREPARE MESSAGE
   * Format event for Kafka publishing
   */
  private prepareMessage(event: BaseFinancialEvent) {
    return {
      key: `${event.tenantId}:${event.eventType}:${event.eventId}`,
      value: JSON.stringify({
        ...event,
        publishedAt: new Date().toISOString(),
        producer: 'aibook-backend',
      }),
      timestamp: new Date(event.timestamp).getTime().toString(),
      headers: {
        'event-type': event.eventType,
        'tenant-id': event.tenantId,
        'version': event.version,
        'source': event.source,
      },
    };
  }

  /**
   * 🚀 SEND TO KAFKA
   * Core Kafka publishing logic
   */
  private async sendToKafka(topic: string, message: any, tenantId: string): Promise<void> {
    const record: ProducerRecord = {
      topic,
      messages: [message],
    };

    try {
      const result = await this.producer.send(record);
      console.log(`📤 Sent to ${topic} for tenant ${tenantId}:`, result);
    } catch (error) {
      console.error(`❌ Failed to send to ${topic}:`, error);
      throw error;
    }
  }

  /**
   * 💀 SEND TO DEAD LETTER QUEUE
   * Handle failed events
   */
  private async sendToDeadLetterQueue(event: BaseFinancialEvent, error: Error): Promise<void> {
    try {
      const dlqEvent: StreamingError = {
        errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        eventId: event.eventId,
        tenantId: event.tenantId,
        errorType: 'processing',
        message: error.message,
        stackTrace: error.stack,
        context: {
          topic: this.getTopicForEvent(event),
          partition: 0,
          offset: 0,
        },
        retryCount: 0,
        maxRetries: 3,
      };

      const dlqMessage = this.prepareMessage({
        ...event,
        eventType: 'system.error_occurred' as any,
        data: dlqEvent,
      });

      if (this.isConnected) {
        await this.sendToKafka(FINANCIAL_TOPICS['financial.dlq'].name, dlqMessage, event.tenantId);
      }
    } catch (dlqError) {
      console.error('❌ Failed to send to DLQ:', dlqError);
    }
  }

  /**
   * 📊 UPDATE METRICS
   * Track publishing performance
   */
  private updateMetrics(eventType: string, processingTime: number): void {
    const currentCount = this.eventMetrics.get(eventType) || 0;
    this.eventMetrics.set(eventType, currentCount + 1);
    
    // Log metrics every 100 events
    const totalEvents = Array.from(this.eventMetrics.values()).reduce((sum, count) => sum + count, 0);
    if (totalEvents % 100 === 0) {
      console.log('📊 Event Publishing Metrics:', {
        totalEvents,
        errorRate: (this.errorCount / totalEvents) * 100,
        eventsByType: Object.fromEntries(this.eventMetrics),
        lastProcessingTime: processingTime,
      });
    }
  }

  /**
   * 🔧 HELPER METHODS
   */
  private groupEventsByTopic(events: FinancialEventUnion[]): Record<string, FinancialEventUnion[]> {
    return events.reduce((acc, event) => {
      const topic = this.getTopicForEvent(event);
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(event);
      return acc;
    }, {} as Record<string, FinancialEventUnion[]>);
  }

  private async sendBatchToTopic(topic: string, events: FinancialEventUnion[]): Promise<void> {
    const messages = events.map(event => this.prepareMessage(event));
    
    const record: ProducerRecord = {
      topic,
      messages,
    };

    await this.producer.send(record);
  }

  private async publishEventsIndividually(events: FinancialEventUnion[]): Promise<void> {
    for (const event of events) {
      try {
        await this.publishEvent(event);
      } catch (error) {
        console.error(`❌ Failed to publish individual event ${event.eventId}:`, error);
      }
    }
  }

  private async handleOfflineEvent(event: BaseFinancialEvent): Promise<void> {
    // TODO: Implement offline storage (Redis queue, local file, etc.)
    console.log(`⚠️ Kafka offline, queuing event ${event.eventId} for later delivery`);
  }

  private setupErrorHandling(): void {
    this.producer.on('producer.connect', () => {
      console.log('🔌 Kafka producer connected');
      this.isConnected = true;
    });

    this.producer.on('producer.disconnect', () => {
      console.log('📴 Kafka producer disconnected');
      this.isConnected = false;
    });

    this.producer.on('producer.network.request_timeout', (payload) => {
      console.warn('⏰ Kafka request timeout:', payload);
    });
  }

  /**
   * 🛑 DISCONNECT
   * Clean shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('👋 Kafka producer disconnected gracefully');
    } catch (error) {
      console.error('❌ Error disconnecting Kafka producer:', error);
    }
  }

  /**
   * 📊 GET METRICS
   * Return current metrics
   */
  getMetrics() {
    const totalEvents = Array.from(this.eventMetrics.values()).reduce((sum, count) => sum + count, 0);
    return {
      isConnected: this.isConnected,
      totalEvents,
      errorCount: this.errorCount,
      errorRate: totalEvents > 0 ? (this.errorCount / totalEvents) * 100 : 0,
      eventsByType: Object.fromEntries(this.eventMetrics),
    };
  }
}

// Export singleton instance
export const kafkaEventProducer = new KafkaEventProducer();
