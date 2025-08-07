import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { AIOrchestrator } from '../orchestration/AIOrchestrator';
import { FinancialAutomationEngine } from '../automation/FinancialAutomationEngine';

const prisma = new PrismaClient();

export interface FinancialEvent {
  id: string;
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  data: any;
  timestamp: Date;
  userId?: string;
  metadata?: any;
}

export interface EventProcessingResult {
  eventId: string;
  processed: boolean;
  aiAnalysis?: any;
  insights?: any[];
  anomalies?: any[];
  automationActions?: any[];
  processingTime: number;
  error?: string;
}

/**
 * 🔄 FINANCIAL EVENT STREAM PROCESSOR
 * Real-time processing of all financial events for AI analysis and automation
 * 
 * Core Responsibilities:
 * • Real-time event ingestion and processing
 * • AI-powered analysis of financial events
 * • Automatic categorization and insights generation
 * • Anomaly detection and risk assessment
 * • Business context enrichment
 * • Learning from user interactions
 * • Performance monitoring and optimization
 */
export class FinancialEventProcessor extends EventEmitter {
  private aiOrchestrator: AIOrchestrator;
  private automationEngine: FinancialAutomationEngine;
  private processingQueue: Map<string, FinancialEvent[]> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private eventStats: Map<string, any> = new Map();

  constructor() {
    super();
    this.aiOrchestrator = new AIOrchestrator();
    this.automationEngine = new FinancialAutomationEngine();
    this.setupEventListeners();
    this.startEventProcessor();
    this.initializeMetrics();
  }

  /**
   * 📥 PROCESS FINANCIAL EVENT
   * Main entry point for processing financial events
   */
  async processEvent(event: FinancialEvent): Promise<EventProcessingResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Processing financial event: ${event.eventType} for tenant: ${event.tenantId}`);

    try {
      // 1. Validate and enrich event data
      const enrichedEvent = await this.enrichEventData(event);

      // 2. Process through AI orchestrator
      const aiResult = await this.aiOrchestrator.processFinancialEvent(enrichedEvent);

      // 3. Apply automation rules
      const automationResult = await this.applyAutomationRules(enrichedEvent);

      // 4. Update business context
      await this.updateBusinessContext(enrichedEvent, aiResult);

      // 5. Store insights and performance metrics
      await this.storeEventResults(enrichedEvent, {
        aiResult,
        automationResult
      });

      // 6. Trigger downstream processes
      this.emit('event.processed', {
        event: enrichedEvent,
        results: { aiResult, automationResult }
      });

      const processingTime = Date.now() - startTime;
      
      // 7. Update processing metrics
      await this.updateProcessingMetrics(event.tenantId, event.eventType, processingTime, true);

      return {
        eventId: event.id,
        processed: true,
        aiAnalysis: aiResult,
        insights: aiResult.insights,
        anomalies: aiResult.anomalies,
        automationActions: automationResult.actions,
        processingTime
      };

    } catch (error) {
      console.error(`❌ Event processing failed for ${event.id}:`, error);
      
      const processingTime = Date.now() - startTime;
      await this.updateProcessingMetrics(event.tenantId, event.eventType, processingTime, false);

      return {
        eventId: event.id,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      };
    }
  }

  /**
   * 🔄 BATCH PROCESS EVENTS
   * Process multiple events efficiently
   */
  async batchProcessEvents(events: FinancialEvent[]): Promise<EventProcessingResult[]> {
    console.log(`🔄 Batch processing ${events.length} events`);

    const results = await Promise.allSettled(
      events.map(event => this.processEvent(event))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          eventId: events[index].id,
          processed: false,
          error: result.reason?.message || 'Processing failed',
          processingTime: 0
        };
      }
    });
  }

  /**
   * 📊 GET PROCESSING METRICS
   * Retrieve event processing performance metrics
   */
  async getProcessingMetrics(tenantId: string, timeframe?: { start: Date; end: Date }): Promise<any> {
    const where: any = { tenantId };
    
    if (timeframe) {
      where.timestamp = {
        gte: timeframe.start,
        lte: timeframe.end
      };
    }

    const metrics = await prisma.$queryRaw`
      SELECT 
        event_type,
        COUNT(*) as total_events,
        AVG(processing_time) as avg_processing_time,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_events,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_events
      FROM event_processing_metrics 
      WHERE tenant_id = ${tenantId}
        ${timeframe ? `AND timestamp >= ${timeframe.start} AND timestamp <= ${timeframe.end}` : ''}
      GROUP BY event_type
    `;

    const metricsArray = metrics as any[];
    return {
      byEventType: metrics,
      summary: {
        totalEvents: metricsArray.reduce((sum: number, m: any) => sum + m.total_events, 0),
        avgProcessingTime: metricsArray.reduce((sum: number, m: any) => sum + m.avg_processing_time, 0) / metricsArray.length,
        successRate: metricsArray.reduce((sum: number, m: any) => sum + m.successful_events, 0) / 
                    metricsArray.reduce((sum: number, m: any) => sum + m.total_events, 0)
      }
    };
  }

  // Private methods

  private setupEventListeners(): void {
    // Transaction events
    this.on('transaction.created', this.handleTransactionCreated.bind(this));
    this.on('transaction.updated', this.handleTransactionUpdated.bind(this));
    this.on('payment.received', this.handlePaymentReceived.bind(this));

    // Document events
    this.on('invoice.created', this.handleInvoiceCreated.bind(this));
    this.on('invoice.sent', this.handleInvoiceSent.bind(this));
    this.on('bill.created', this.handleBillCreated.bind(this));
    this.on('expense.submitted', this.handleExpenseSubmitted.bind(this));

    // Reconciliation events
    this.on('reconciliation.started', this.handleReconciliationStarted.bind(this));
    this.on('reconciliation.completed', this.handleReconciliationCompleted.bind(this));

    // AI learning events
    this.on('user.feedback', this.handleUserFeedback.bind(this));
    this.on('categorization.corrected', this.handleCategorizationCorrected.bind(this));
    this.on('insight.acted_upon', this.handleInsightActedUpon.bind(this));
  }

  private startEventProcessor(): void {
    // Process queued events every 100ms
    setInterval(() => {
      this.processQueuedEvents();
    }, 100);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  private async enrichEventData(event: FinancialEvent): Promise<FinancialEvent> {
    try {
      // Add business context
      const businessContext = await this.getBusinessContext(event.tenantId, event.entityId);
      
      // Add tenant context
      const tenantContext = await this.getTenantContext(event.tenantId);
      
      // Add temporal context
      const temporalContext = this.getTemporalContext(event.timestamp);

      return {
        ...event,
        data: {
          ...event.data,
          businessContext,
          tenantContext,
          temporalContext
        }
      };
    } catch (error) {
      console.warn(`⚠️ Failed to enrich event data for ${event.id}:`, error);
      return event; // Return original event if enrichment fails
    }
  }

  private async applyAutomationRules(event: FinancialEvent): Promise<any> {
    const actions = [];

    try {
      switch (event.eventType) {
        case 'transaction.created':
          const categorization = await this.automationEngine.categorizeTransaction(
            event.tenantId, 
            event.data
          );
          actions.push({ type: 'categorization', result: categorization });
          break;

        case 'invoice.sent':
          // Auto-schedule follow-up reminders
          const followUp = await this.scheduleInvoiceFollowUp(event);
          actions.push({ type: 'follow_up', result: followUp });
          break;

        case 'expense.submitted':
          // Auto-approval if eligible
          const approval = await this.automationEngine.processSmartApproval(
            event.tenantId,
            event.data
          );
          actions.push({ type: 'approval', result: approval });
          break;

        case 'payment.received':
          // Auto-match with outstanding invoices
          const matching = await this.autoMatchPayment(event);
          actions.push({ type: 'payment_matching', result: matching });
          break;
      }

      return { success: true, actions };
    } catch (error) {
      console.error(`❌ Automation rules failed for ${event.id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', actions };
    }
  }

  private async updateBusinessContext(event: FinancialEvent, aiResult: any): Promise<void> {
    try {
      // Create or update business context record
      const contextData = {
        tenantId: event.tenantId,
        businessUnit: event.data.businessContext?.businessUnit,
        project: event.data.businessContext?.project,
        entitySegment: this.determineEntitySegment(event),
        lifetimeValue: await this.calculateLifetimeValue(event),
        riskProfile: aiResult.riskScore ? this.categorizeRisk(aiResult.riskScore) : null,
        userDecisionPatterns: event.data.userDecisions || null,
        predictionAccuracy: aiResult.confidence || null
      };

      await prisma.businessContext.create({
        data: contextData
      });
    } catch (error) {
      console.warn(`⚠️ Failed to update business context for ${event.id}:`, error);
    }
  }

  private async storeEventResults(event: FinancialEvent, results: any): Promise<void> {
    try {
      // Store AI insights
      if (results.aiResult.insights?.length > 0) {
        await prisma.businessInsight.createMany({
          data: results.aiResult.insights.map((insight: any) => ({
            tenantId: event.tenantId,
            type: insight.type,
            category: insight.category,
            priority: insight.priority,
            confidence: insight.confidence,
            title: insight.title,
            description: insight.description,
            actionable: insight.actionable || false,
            recommendations: insight.recommendations || {},
            potentialImpact: insight.potentialImpact,
            dataPoints: { eventId: event.id, ...insight.dataPoints },
            relatedEntities: { [event.entityType]: event.entityId }
          }))
        });
      }

      // Store performance metrics
      await this.storePerformanceMetrics(event, results);
    } catch (error) {
      console.error(`❌ Failed to store event results for ${event.id}:`, error);
    }
  }

  private async updateProcessingMetrics(
    tenantId: string, 
    eventType: string, 
    processingTime: number, 
    success: boolean
  ): Promise<void> {
    try {
      // This would typically go to a metrics table
      // For now, we'll log and could store in a simple metrics collection
      console.log(`📊 Event metrics - Tenant: ${tenantId}, Type: ${eventType}, Time: ${processingTime}ms, Success: ${success}`);
      
      // Update in-memory stats
      const key = `${tenantId}:${eventType}`;
      const currentStats = this.eventStats.get(key) || { count: 0, totalTime: 0, successes: 0 };
      
      currentStats.count++;
      currentStats.totalTime += processingTime;
      if (success) currentStats.successes++;
      
      this.eventStats.set(key, currentStats);
    } catch (error) {
      console.warn(`⚠️ Failed to update processing metrics:`, error);
    }
  }

  // Event handlers
  private async handleTransactionCreated(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleTransactionUpdated(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handlePaymentReceived(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleInvoiceCreated(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleInvoiceSent(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleBillCreated(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleExpenseSubmitted(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleReconciliationStarted(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleReconciliationCompleted(event: FinancialEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleUserFeedback(event: FinancialEvent): Promise<void> {
    // Process user feedback to improve AI models
    console.log(`👍 Processing user feedback for tenant: ${event.tenantId}`);
    // Implementation would update model training data
  }

  private async handleCategorizationCorrected(event: FinancialEvent): Promise<void> {
    // Learn from user corrections
    console.log(`🎓 Learning from categorization correction for tenant: ${event.tenantId}`);
    // Implementation would update categorization models
  }

  private async handleInsightActedUpon(event: FinancialEvent): Promise<void> {
    // Track insight effectiveness
    console.log(`📈 Insight acted upon for tenant: ${event.tenantId}`);
    // Implementation would update insight scoring
  }

  // Helper methods
  private async processQueuedEvents(): Promise<void> {
    for (const [tenantId, events] of this.processingQueue) {
      if (!this.isProcessing.get(tenantId) && events.length > 0) {
        this.isProcessing.set(tenantId, true);
        
        const batch = events.splice(0, 10); // Process up to 10 events at once
        await this.batchProcessEvents(batch);
        
        this.isProcessing.set(tenantId, false);
      }
    }
  }

  private initializeMetrics(): void {
    // Initialize metrics collection
    this.eventStats.clear();
  }

  private async cleanupOldMetrics(): Promise<void> {
    // Clean up metrics older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // This would clean up old metrics from database
      console.log(`🧹 Cleaning up metrics older than ${thirtyDaysAgo.toISOString()}`);
    } catch (error) {
      console.warn(`⚠️ Failed to clean up old metrics:`, error);
    }
  }

  // Placeholder helper methods
  private async getBusinessContext(tenantId: string, entityId: string): Promise<any> { return {}; }
  private async getTenantContext(tenantId: string): Promise<any> { return {}; }
  private getTemporalContext(timestamp: Date): any { return {}; }
  private async scheduleInvoiceFollowUp(event: FinancialEvent): Promise<any> { return {}; }
  private async autoMatchPayment(event: FinancialEvent): Promise<any> { return {}; }
  private determineEntitySegment(event: FinancialEvent): string { return 'standard'; }
  private async calculateLifetimeValue(event: FinancialEvent): Promise<number> { return 0; }
  private categorizeRisk(riskScore: number): string { return riskScore > 0.7 ? 'high' : riskScore > 0.3 ? 'medium' : 'low'; }
  private async storePerformanceMetrics(event: FinancialEvent, results: any): Promise<void> {}
}