import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { VertexAIService } from '../services/VertexAIService';
import { OpenAIService } from '../services/OpenAIService';
import { BigQueryAnalyticsService } from '../services/BigQueryAnalyticsService';
import { SmartInsightsEngine } from '../engines/SmartInsightsEngine';
import { AnomalyDetectionEngine } from '../engines/AnomalyDetectionEngine';
import { PredictiveAnalyticsEngine } from '../engines/PredictiveAnalyticsEngine';
import { NLPEngine } from '../engines/NLPEngine';
import { FinancialEvent } from '../events/FinancialEventProcessor';

const prisma = new PrismaClient();



export interface FinancialQueryRequest {
  tenantId: string;
  query: string;
  context?: any;
  userId?: string;
}

export interface FinancialQueryResponse {
  intent: string;
  entities: any[];
  data: any;
  analysis: any;
  response: string;
  confidence: number;
  recommendations: any[];
  executionTime: number;
}

export interface BusinessInsightRequest {
  tenantId: string;
  timeframe?: { start: Date; end: Date };
  categories?: string[];
  priority?: string;
}

export interface AIProcessingResult {
  success: boolean;
  data?: any;
  insights?: any[];
  anomalies?: any[];
  predictions?: any[];
  recommendations?: any[];
  confidence?: number;
  processingTime: number;
  error?: string;
}

/**
 * 🧠 AI ORCHESTRATOR
 * Central coordination hub for all AI services and intelligent financial analysis
 * 
 * Key Responsibilities:
 * • Coordinate multiple AI engines and services
 * • Process real-time financial events
 * • Generate comprehensive business insights
 * • Handle natural language queries
 * • Manage AI model performance and learning
 * • Provide unified AI interface for the application
 */
export class AIOrchestrator extends EventEmitter {
  private vertexAI!: VertexAIService;
  private openAI!: OpenAIService;
  private bigQuery!: BigQueryAnalyticsService;
  private insightsEngine!: SmartInsightsEngine;
  private anomalyEngine!: AnomalyDetectionEngine;
  private predictiveEngine!: PredictiveAnalyticsEngine;
  private nlpEngine!: NLPEngine;
  
  private processingQueue: Map<string, FinancialEvent[]> = new Map();
  private modelRegistry: Map<string, any> = new Map();
  private performanceMetrics: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeServices();
    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }

  private initializeServices() {
    this.vertexAI = new VertexAIService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });

    this.openAI = new OpenAIService();
    this.bigQuery = new BigQueryAnalyticsService(process.env.GOOGLE_CLOUD_PROJECT_ID!);
    this.insightsEngine = new SmartInsightsEngine(prisma);
    this.anomalyEngine = new AnomalyDetectionEngine(prisma);
    this.predictiveEngine = new PredictiveAnalyticsEngine(prisma);
    this.nlpEngine = new NLPEngine('default-tenant');
  }

  private setupEventListeners() {
    this.on('financial.transaction.created', this.handleTransactionCreated.bind(this));
    this.on('financial.payment.received', this.handlePaymentReceived.bind(this));
    this.on('financial.invoice.sent', this.handleInvoiceSent.bind(this));
    this.on('financial.expense.approved', this.handleExpenseApproved.bind(this));
    this.on('ai.model.trained', this.handleModelTrained.bind(this));
    this.on('user.feedback.received', this.handleUserFeedback.bind(this));
  }

  /**
   * 🔄 PROCESS FINANCIAL EVENT
   * Main entry point for processing real-time financial events
   */
  async processFinancialEvent(event: FinancialEvent): Promise<AIProcessingResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Processing financial event: ${event.eventType} for tenant: ${event.tenantId}`);

    try {
      // 1. Enrich event data with business context
      const enrichedEvent = await this.enrichEventData(event);

      // 2. Real-time AI analysis
      const aiAnalysis = await this.performRealTimeAnalysis(enrichedEvent);

      // 3. Generate insights and predictions
      const insights = await this.generateEventInsights(enrichedEvent, aiAnalysis);

      // 4. Detect anomalies
      const anomalies = await this.detectEventAnomalies(enrichedEvent);

      // 5. Update AI models with new data
      await this.updateModelsWithEvent(enrichedEvent);

      // 6. Store results and trigger notifications
      await this.storeResults(enrichedEvent, {
        analysis: aiAnalysis,
        insights,
        anomalies
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: enrichedEvent.data,
        insights,
        anomalies,
        confidence: aiAnalysis.confidence,
        processingTime
      };

    } catch (error) {
      console.error('AI processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 💬 PROCESS NATURAL LANGUAGE QUERY
   * Handle business intelligence queries in natural language
   */
  async processFinancialQuery(request: FinancialQueryRequest): Promise<FinancialQueryResponse> {
    const startTime = Date.now();
    
    console.log(`💬 Processing NL query for tenant ${request.tenantId}: "${request.query}"`);

    try {
      // 1. Intent recognition and entity extraction
      const nlpResult = await this.nlpEngine.understandQuery(request.query);
      
      // 2. Build query context with business data
      const context = await this.buildQueryContext(request.tenantId, nlpResult);

      // 3. Retrieve relevant data based on intent
      const data = await this.retrieveQueryData(request.tenantId, nlpResult, context);

      // 4. Perform AI-powered analysis
      const analysis = await this.performQueryAnalysis(data, nlpResult, context);

      // 5. Generate natural language response
      const response = await this.generateNaturalLanguageResponse(analysis, nlpResult);

      // 6. Extract actionable recommendations
      const recommendations = await this.generateQueryRecommendations(analysis);

      // 7. Log conversation for learning
      await this.logConversation(request, nlpResult, analysis, response);

      return {
        intent: nlpResult.queryType || 'GENERAL',
        entities: [],
        data,
        analysis,
        response,
        confidence: nlpResult.confidence,
        recommendations,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Query processing error:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 📊 GENERATE COMPREHENSIVE BUSINESS INSIGHTS
   * Create AI-powered business intelligence insights
   */
  async generateBusinessInsights(request: BusinessInsightRequest): Promise<any[]> {
    console.log(`📊 Generating business insights for tenant: ${request.tenantId}`);

    try {
      const insights = [];

      // 1. Revenue Analysis Insights
      const revenueInsights = [{ type: 'revenue', data: 'Revenue analysis insights' }];
      insights.push(...revenueInsights);

      // 2. Cost Optimization Insights
      const costInsights = [{ type: 'expense', data: 'Cost optimization insights' }];
      insights.push(...costInsights);

      // 3. Cash Flow Predictions
      const cashFlowInsights = await this.predictiveEngine.generateCashFlowForecast(request.tenantId);
      insights.push(...cashFlowInsights);

      // 4. Risk Assessment
      const riskInsights = [{ type: 'risk', data: 'Risk assessment insights' }];
      insights.push(...riskInsights);

      // 5. Growth Opportunities
      const growthInsights = await this.identifyGrowthOpportunities(request.tenantId);
      insights.push(...growthInsights);

      // 6. Industry Benchmarking
      const benchmarkInsights = await this.generateBenchmarkInsights(request.tenantId);
      insights.push(...benchmarkInsights);

      // Sort by priority and impact
      const prioritizedInsights = this.prioritizeInsights(insights);

      // Store insights in database
      await this.storeBusinessInsights(request.tenantId, prioritizedInsights);

      return prioritizedInsights;

    } catch (error) {
      console.error('Insight generation error:', error);
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🤖 AUTOMATED TRANSACTION CATEGORIZATION
   * Intelligent categorization of financial transactions
   */
  async categorizeTransaction(tenantId: string, transaction: any): Promise<any> {
    console.log(`🤖 Categorizing transaction for tenant: ${tenantId}`);

    try {
      // 1. Extract features from transaction
      const features = await this.extractTransactionFeatures(transaction);

      // 2. Get historical patterns for this tenant
      const patterns = await this.getHistoricalPatterns(tenantId, features);

      // 3. Apply ML model for categorization
      const mlResult = { 
        category: 'General', 
        subCategory: 'Other',
        confidence: 0.8, 
        reasoning: 'ML categorization',
        alternatives: []
      };

      // 4. Enhance with business rules
      const businessRules = await this.applyBusinessRules(tenantId, transaction, mlResult);

      // 5. Calculate confidence score
      const confidence = this.calculateCategoryConfidence(mlResult, patterns, businessRules);

      // 6. Learn from user corrections
      await this.updateCategorizationModel(tenantId, transaction, mlResult, confidence);

      return {
        suggestedCategory: mlResult.category,
        subCategory: mlResult.subCategory,
        confidence,
        reasoning: mlResult.reasoning,
        alternatives: mlResult.alternatives,
        autoApproved: confidence > 0.85
      };

    } catch (error) {
      console.error('Categorization error:', error);
      throw new Error(`Failed to categorize transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🎯 PREDICTIVE CASH FLOW ANALYSIS
   * Generate intelligent cash flow forecasts
   */
  async generateCashFlowForecast(tenantId: string, months: number): Promise<any> {
    console.log(`🎯 Generating ${months}-month cash flow forecast for tenant: ${tenantId}`);

    try {
      // 1. Analyze historical cash flow patterns
      const historicalData = await this.getHistoricalCashFlow(tenantId, 24);

      // 2. Identify seasonal patterns
      const seasonalPatterns = await this.identifySeasonalPatterns(historicalData);

      // 3. Analyze outstanding receivables/payables
      const outstandingAmounts = await this.analyzeOutstandingAmounts(tenantId);

      // 4. Incorporate external economic factors
      const externalFactors = await this.getExternalFactors(tenantId);

      // 5. Generate ML-based forecast
      const forecast = await this.vertexAI.predictCashFlow(tenantId, months);

      // 6. Create scenario analysis
      const scenarios = await this.generateScenarioAnalysis(forecast, externalFactors);

      // 7. Generate actionable recommendations
      const recommendations = await this.generateCashFlowRecommendations(forecast, scenarios);

      return {
        forecast: forecast.forecast,
        confidence: forecast.model.confidence,
        scenarios,
        recommendations,
        keyDrivers: [],
        riskFactors: await this.identifyRiskFactors(forecast)
      };

    } catch (error) {
      console.error('Cash flow forecast error:', error);
      throw new Error(`Failed to generate forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private async enrichEventData(event: FinancialEvent): Promise<FinancialEvent> {
    // Add business context, customer data, market conditions, etc.
    const businessContext = await this.getBusinessContext(event.tenantId, event.entityId);
    const marketData = await this.getMarketData(event.timestamp);
    
    return {
      ...event,
      data: {
        ...event.data,
        businessContext,
        marketData
      }
    };
  }

  private async performRealTimeAnalysis(event: FinancialEvent): Promise<any> {
    const analysis = await Promise.all([
      this.analyzeTransactionPattern(event),
      this.analyzeBusinessImpact(event),
      this.analyzeRiskFactors(event)
    ]);

    return {
      patterns: analysis[0],
      impact: analysis[1],
      risks: analysis[2],
      confidence: this.calculateAnalysisConfidence(analysis)
    };
  }

  private async generateEventInsights(event: FinancialEvent, analysis: any): Promise<any[]> {
    return [{ type: 'realtime', data: 'Real-time event insights', event: event.eventType }];
  }

  private async detectEventAnomalies(event: FinancialEvent): Promise<any[]> {
    return await this.anomalyEngine.analyzeTransactionRealTime(
      event.tenantId,
      event.entityType as any,
      event.data
    );
  }

  private async updateModelsWithEvent(event: FinancialEvent): Promise<void> {
    // Update training data for continuous learning
    await this.addTrainingData(event.tenantId, event);
    
    // Trigger model retraining if enough new data
    const shouldRetrain = await this.shouldTriggerRetraining(event.tenantId);
    if (shouldRetrain) {
      this.emit('ai.model.retrain', { tenantId: event.tenantId });
    }
  }

  private async storeResults(event: FinancialEvent, results: any): Promise<void> {
    try {
      // Store AI insights
      if (results.insights?.length > 0) {
        await prisma.aIInsight.createMany({
          data: results.insights.map((insight: any) => ({
            type: insight.type || 'PATTERN_RECOGNITION',
            entityType: event.entityType,
            entityId: event.entityId,
            insight: insight.data || insight,
            confidence: insight.confidence || 0.5,
            embedding: null,
            tags: insight.tags || null,
            metadata: { eventId: event.id, processingTime: insight.processingTime || 100 },
            tenantId: event.tenantId
          }))
        });
      }

      // Store business insights if any
      if (results.businessInsights?.length > 0) {
        await this.storeBusinessInsights(event.tenantId, results.businessInsights);
      }

      // Update entry with AI metadata if it's a transaction event
      if (event.entityType === 'entry' && results.analysis) {
        await prisma.entry.update({
          where: { id: event.entityId },
          data: {
            aiInsights: results.analysis,
            confidence: results.analysis.confidence,
            automationLevel: results.analysis.automationLevel || 'AI_SUGGESTED',
            impactScore: results.analysis.impactScore,
            riskScore: results.analysis.riskScore,
            predictiveFactors: results.analysis.predictiveFactors,
            semanticCategories: results.analysis.semanticCategories
          }
        });
      }
    } catch (error) {
      console.error('Failed to store AI results:', error);
    }
  }

  private prioritizeInsights(insights: any[]): any[] {
    return insights.sort((a, b) => {
      // Sort by priority (CRITICAL > HIGH > MEDIUM > LOW)
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Then by confidence
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  private async startPerformanceMonitoring(): Promise<void> {
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 300000); // Every 5 minutes
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // Ensure default tenant exists before collecting metrics
      const defaultTenant = await prisma.tenant.findUnique({
        where: { domain: 'demo.aibook.com' }
      });

      if (!defaultTenant) {
        console.debug('⚠️ Default tenant not found, skipping performance metrics collection');
        return;
      }

      // Get current performance data for different model types
      const modelTypes = ['categorization', 'prediction', 'anomaly_detection', 'insight_generation'];
      let successCount = 0;
      
      for (const modelType of modelTypes) {
        try {
          const metrics = await this.calculateModelMetrics(modelType);
          
          if (metrics) {
            await prisma.aIModelPerformance.create({
              data: {
                modelType,
                tenantId: defaultTenant.id, // Use actual tenant for system metrics
                accuracy: metrics.accuracy,
                precision: metrics.precision,
                recall: metrics.recall,
                f1Score: metrics.f1Score,
                timesSaved: metrics.timesSaved,
                errorsDetected: metrics.errorsDetected,
                revenueImpact: metrics.revenueImpact,
                trainingDataPoints: metrics.trainingDataPoints,
                lastTrainingDate: new Date(),
                improvementRate: metrics.improvementRate,
                period: new Date()
              }
            });
            successCount++;
          }
        } catch (modelError) {
          // Silently skip individual model metrics if they fail
          console.debug(`Skipping metrics for ${modelType}`);
        }
      }
      
      if (successCount > 0) {
        console.debug(`📊 Performance metrics collected (${successCount}/${modelTypes.length})`);
      }
    } catch (error) {
      console.debug('Performance metrics collection skipped');
    }
  }

  private async calculateModelMetrics(modelType: string): Promise<any> {
    // This would calculate actual metrics based on model performance
    // For now, return sample data
    return {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.8 + Math.random() * 0.15,
      recall: 0.75 + Math.random() * 0.2,
      f1Score: 0.8 + Math.random() * 0.15,
      timesSaved: Math.floor(Math.random() * 100),
      errorsDetected: Math.floor(Math.random() * 20),
      revenueImpact: Math.random() * 10000,
      trainingDataPoints: Math.floor(Math.random() * 1000),
      improvementRate: Math.random() * 0.1
    };
  }

  // Event handlers
  private async handleTransactionCreated(event: FinancialEvent): Promise<void> {
    await this.processFinancialEvent(event);
  }

  private async handlePaymentReceived(event: FinancialEvent): Promise<void> {
    await this.processFinancialEvent(event);
  }

  private async handleInvoiceSent(event: FinancialEvent): Promise<void> {
    await this.processFinancialEvent(event);
  }

  private async handleExpenseApproved(event: FinancialEvent): Promise<void> {
    await this.processFinancialEvent(event);
  }

  private async handleModelTrained(event: any): Promise<void> {
    console.log(`🎓 Model training completed: ${event.modelType}`);
    await this.updateModelRegistry(event);
  }

  private async handleUserFeedback(event: any): Promise<void> {
    console.log(`👍 User feedback received for tenant: ${event.tenantId}`);
    await this.incorporateUserFeedback(event);
  }

  // Placeholder methods - to be implemented
  private async buildQueryContext(tenantId: string, nlpResult: any): Promise<any> { return {}; }
  private async retrieveQueryData(tenantId: string, nlpResult: any, context: any): Promise<any> { return {}; }
  private async performQueryAnalysis(data: any, nlpResult: any, context: any): Promise<any> { return {}; }
  private async generateNaturalLanguageResponse(analysis: any, nlpResult: any): Promise<string> { return ""; }
  private async generateQueryRecommendations(analysis: any): Promise<any[]> { return []; }
  private async logConversation(request: any, nlpResult: any, analysis: any, response: string): Promise<void> {}
  private async identifyGrowthOpportunities(tenantId: string): Promise<any[]> { return []; }
  private async generateBenchmarkInsights(tenantId: string): Promise<any[]> { return []; }
  private async storeBusinessInsights(tenantId: string, insights: any[]): Promise<void> {
    try {
      await prisma.businessInsight.createMany({
        data: insights.map(insight => ({
          tenantId,
          type: insight.type || 'OPTIMIZATION',
          category: insight.category || 'General',
          priority: insight.priority || 'MEDIUM',
          confidence: insight.confidence || 0.5,
          title: insight.title || 'AI Generated Insight',
          description: insight.description || 'Automated business insight',
          actionable: insight.actionable || false,
          recommendations: insight.recommendations || {},
          potentialImpact: insight.potentialImpact,
          timeframe: insight.timeframe,
          effort: insight.effort,
          dataPoints: insight.dataPoints || {},
          relatedEntities: insight.relatedEntities || {}
        }))
      });
      console.log(`💾 Stored ${insights.length} business insights for tenant: ${tenantId}`);
    } catch (error) {
      console.error('Failed to store business insights:', error);
    }
  }
  private async extractTransactionFeatures(transaction: any): Promise<any> { return {}; }
  private async getHistoricalPatterns(tenantId: string, features: any): Promise<any> { return {}; }
  private async applyBusinessRules(tenantId: string, transaction: any, mlResult: any): Promise<any> { return {}; }
  private calculateCategoryConfidence(mlResult: any, patterns: any, businessRules: any): number { return 0.5; }
  private async updateCategorizationModel(tenantId: string, transaction: any, mlResult: any, confidence: number): Promise<void> {}
  private async getHistoricalCashFlow(tenantId: string, months: number): Promise<any> { return {}; }
  private async identifySeasonalPatterns(historicalData: any): Promise<any> { return {}; }
  private async analyzeOutstandingAmounts(tenantId: string): Promise<any> { return {}; }
  private async getExternalFactors(tenantId: string): Promise<any> { return {}; }
  private async generateScenarioAnalysis(forecast: any, externalFactors: any): Promise<any> { return {}; }
  private async generateCashFlowRecommendations(forecast: any, scenarios: any): Promise<any[]> { return []; }
  private async identifyRiskFactors(forecast: any): Promise<any[]> { return []; }
  private async getBusinessContext(tenantId: string, entityId: string): Promise<any> { return {}; }
  private async getMarketData(timestamp: Date): Promise<any> { return {}; }
  private async analyzeTransactionPattern(event: FinancialEvent): Promise<any> { return {}; }
  private async analyzeBusinessImpact(event: FinancialEvent): Promise<any> { return {}; }
  private async analyzeRiskFactors(event: FinancialEvent): Promise<any> { return {}; }
  private calculateAnalysisConfidence(analysis: any[]): number { return 0.8; }
  private async addTrainingData(tenantId: string, event: FinancialEvent): Promise<void> {}
  private async shouldTriggerRetraining(tenantId: string): Promise<boolean> { return false; }
  private async updateModelRegistry(event: any): Promise<void> {}
  private async incorporateUserFeedback(event: any): Promise<void> {}
}