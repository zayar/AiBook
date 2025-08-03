/**
 * 🤖💰 FINANCIAL AI COPILOT SERVICE
 * 
 * The main AI copilot that orchestrates all financial AI capabilities:
 * - Natural language query processing
 * - Context-aware financial insights
 * - Proactive recommendations
 * - Conversational financial assistance
 */

import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './OpenAIService';
import { VectorStoreService } from './VectorStoreService';
import { NLPEngine } from '../engines/NLPEngine';
import { PredictiveAnalyticsEngine } from '../engines/PredictiveAnalyticsEngine';
import { SmartInsightsEngine } from '../engines/SmartInsightsEngine';
import { FinancialAgentOrchestrator } from '../agents/FinancialAgentOrchestrator';
import { AnomalyDetectionEngine } from '../engines/AnomalyDetectionEngine';

const prisma = new PrismaClient();

export interface CopilotQuery {
  query: string;
  sessionId: string;
  tenantId: string;
  userId?: string;
  context?: {
    currentPage?: string;
    selectedEntity?: { type: string; id: string };
    timeframe?: { start: Date; end: Date };
  };
}

export interface CopilotResponse {
  answer: string;
  confidence: number;
  intent: string;
  visualizations?: VisualizationConfig[];
  actionableSteps?: ActionableStep[];
  relatedQueries?: string[];
  executionTime: number;
  sources?: DataSource[];
  insights?: any[];
  anomalies?: any[];
  predictiveData?: any;
}

export interface VisualizationConfig {
  type: 'chart' | 'table' | 'metric' | 'timeline';
  title: string;
  data: any;
  config: any;
}

export interface ActionableStep {
  title: string;
  description: string;
  action: 'navigate' | 'create' | 'update' | 'analyze' | string;
  url?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DataSource {
  type: string;
  count: number;
  timeframe: string;
  confidence: number;
}

/**
 * Financial AI Copilot - Your intelligent financial assistant
 */
export class FinancialCopilotService {
  private openAI: OpenAIService;
  private vectorStore: VectorStoreService;
  private nlpEngine: NLPEngine;
  private predictiveEngine: PredictiveAnalyticsEngine;
  private insightsEngine: SmartInsightsEngine;
  private agentOrchestrator: FinancialAgentOrchestrator;
  private anomalyEngine: AnomalyDetectionEngine;

  constructor() {
    this.openAI = new OpenAIService();
    this.vectorStore = new VectorStoreService();
    this.nlpEngine = new NLPEngine('default'); // Default tenant for NLP
    this.predictiveEngine = new PredictiveAnalyticsEngine(prisma);
    this.insightsEngine = new SmartInsightsEngine(prisma);
    this.agentOrchestrator = new FinancialAgentOrchestrator(prisma);
    this.anomalyEngine = new AnomalyDetectionEngine(prisma);
  }

  /**
   * 🎯 PROCESS QUERY
   * Main entry point for processing natural language queries
   */
  async processQuery(query: CopilotQuery): Promise<CopilotResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Processing query: "${query.query}" for tenant: ${query.tenantId}`);

      // 1. Understand the query intent
      const intent = await this.nlpEngine.detectIntent(query.query);
      
      // 2. Gather relevant financial context
      const context = await this.gatherFinancialContext(query, intent);
      
      // 3. Perform semantic search for relevant data
      const relevantData = await this.findRelevantData(query.query, query.tenantId, intent.intent);
      
      // 4. Generate AI response with OpenAI
      const aiResponse = await this.openAI.processFinancialQuery(query.query, {
        tenantId: query.tenantId,
        userId: query.userId,
        businessProfile: context.businessProfile,
        recentTransactions: relevantData.transactions,
        financialSummary: context.financialSummary
      });

      // 5. Enhanced AI capabilities with new engines
      const [visualizations, actionableSteps, insights, anomalies] = await Promise.all([
        this.generateVisualizations(intent.intent, relevantData, context),
        this.generateActionableSteps(intent.intent, context, aiResponse),
        this.getContextualInsights(query.tenantId, intent.intent),
        this.getRealtimeAnomalies(query.tenantId)
      ]);
      
      const relatedQueries = this.generateRelatedQueries(intent.intent, context);

      // 6. Store conversation for learning
      await this.storeConversation(query, aiResponse, intent, startTime);

      const response: CopilotResponse = {
        answer: aiResponse.response,
        confidence: aiResponse.confidence,
        intent: aiResponse.intent,
        visualizations,
        actionableSteps,
        relatedQueries,
        executionTime: Date.now() - startTime,
        sources: this.buildDataSources(relevantData),
        insights: insights.slice(0, 5), // Top 5 insights
        anomalies: anomalies.slice(0, 3), // Top 3 anomalies
        predictiveData: await this.getPredictiveContext(query.tenantId, intent.intent)
      };

      console.log(`✅ Query processed in ${response.executionTime}ms with confidence ${response.confidence}`);
      return response;

    } catch (error) {
      console.error('❌ Financial Copilot error:', error);
      
      return {
        answer: "I apologize, but I'm having trouble processing your request right now. Please try rephrasing your question or contact support if the issue persists.",
        confidence: 0.1,
        intent: 'error',
        executionTime: Date.now() - startTime,
        actionableSteps: [{
          title: 'Try a Different Question',
          description: 'Rephrase your question or try asking about specific financial data',
          action: 'analyze',
          priority: 'medium'
        }]
      };
    }
  }

  /**
   * 📊 GET FINANCIAL HEALTH OVERVIEW
   * Proactive financial health assessment
   */
  async getFinancialHealthOverview(tenantId: string): Promise<{
    healthScore: number;
    alerts: HealthAlert[];
    recommendations: string[];
    insights: FinancialInsight[];
  }> {
    const context = await this.gatherFinancialContext(
      { query: 'financial health overview', sessionId: 'health_check', tenantId },
      { intent: 'financial_health', confidence: 1.0, parameters: {}, requiredParameters: [], missingParameters: [], originalText: '', processedText: '', metadata: {} }
    );

    // Calculate health score based on key metrics
    const healthScore = this.calculateHealthScore(context);
    
    // Generate alerts and recommendations
    const alerts = await this.generateHealthAlerts(context);
    const recommendations = await this.generateHealthRecommendations(context);
    const insights = await this.generateFinancialInsights(context);

    return {
      healthScore,
      alerts,
      recommendations,
      insights
    };
  }

  /**
   * 🔍 SEARCH FINANCIAL DATA
   * Semantic search across all financial entities
   */
  async searchFinancialData(
    query: string, 
    tenantId: string, 
    filters?: {
      entityTypes?: string[];
      dateRange?: { start: Date; end: Date };
      amountRange?: { min: number; max: number };
    }
  ): Promise<{
    results: SearchResult[];
    summary: string;
    relatedSuggestions: string[];
  }> {
    // Perform semantic search
    const searchResults = await this.vectorStore.semanticSearch(query, tenantId, {
      entityTypes: filters?.entityTypes,
      limit: 20,
      threshold: 0.6
    });

    // Get additional context for results
    const enhancedResults = await this.enhanceSearchResults(searchResults, filters);
    
    // Generate summary
    const summary = await this.generateSearchSummary(query, enhancedResults);
    
    // Get related suggestions
    const relatedSuggestions = await this.generateSearchSuggestions(query, enhancedResults);

    return {
      results: enhancedResults,
      summary,
      relatedSuggestions
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Gather comprehensive financial context
   */
  private async gatherFinancialContext(query: CopilotQuery, intent: any) {
    const { tenantId } = query;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get business profile
    const businessProfile = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, baseCurrency: true, settings: true }
    });

    // Get recent financial summary
    const [recentInvoices, recentExpenses, recentPayments] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, totalAmount: true, status: true, issueDate: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.expense.findMany({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, totalAmount: true, status: true, expenseDate: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.paymentReceived.findMany({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, amount: true, paymentDate: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate financial summary
    const totalRevenue = recentInvoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      
    const totalExpenses = recentExpenses
      .reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
      
    const totalPayments = recentPayments
      .reduce((sum, pay) => sum + Number(pay.amount), 0);

    return {
      businessProfile,
      financialSummary: {
        totalRevenue,
        totalExpenses,
        totalPayments,
        netIncome: totalRevenue - totalExpenses,
        recentInvoiceCount: recentInvoices.length,
        recentExpenseCount: recentExpenses.length,
        recentPaymentCount: recentPayments.length
      },
      recentData: {
        invoices: recentInvoices,
        expenses: recentExpenses,
        payments: recentPayments
      }
    };
  }

  /**
   * Find relevant data using semantic search
   */
  private async findRelevantData(query: string, tenantId: string, intent: string) {
    // Determine which entity types to search based on intent
    const entityTypes = this.getRelevantEntityTypes(intent);
    
    // Perform semantic search
    const searchResults = await this.vectorStore.semanticSearch(query, tenantId, {
      entityTypes,
      limit: 10,
      threshold: 0.5
    });

    // Fetch actual data for the found entities
    const relevantTransactions = await this.fetchRelevantTransactions(searchResults, tenantId);
    
    return {
      searchResults,
      transactions: relevantTransactions,
      entityTypes
    };
  }

  /**
   * Generate appropriate visualizations
   */
  private async generateVisualizations(intent: string, relevantData: any, context: any): Promise<VisualizationConfig[]> {
    const visualizations: VisualizationConfig[] = [];

    switch (intent) {
      case 'cash_flow_inquiry':
        visualizations.push({
          type: 'chart',
          title: 'Cash Flow Trend',
          data: this.prepareCashFlowData(context.recentData),
          config: { type: 'line', xAxis: 'date', yAxis: 'amount' }
        });
        break;

      case 'expense_analysis':
        visualizations.push({
          type: 'chart',
          title: 'Expense Breakdown',
          data: this.prepareExpenseData(context.recentData.expenses),
          config: { type: 'pie', labelField: 'category', valueField: 'amount' }
        });
        break;

      case 'revenue_analysis':
        visualizations.push({
          type: 'metric',
          title: 'Revenue Metrics',
          data: {
            totalRevenue: context.financialSummary.totalRevenue,
            averageInvoice: context.financialSummary.totalRevenue / Math.max(context.financialSummary.recentInvoiceCount, 1),
            paidInvoices: context.recentData.invoices.filter((inv: any) => inv.status === 'PAID').length
          },
          config: { format: 'currency' }
        });
        break;
    }

    return visualizations;
  }

  /**
   * Generate actionable steps
   */
  private async generateActionableSteps(intent: string, context: any, aiResponse: any): Promise<ActionableStep[]> {
    const steps: ActionableStep[] = [];

    // Common actionable steps based on intent
    if (intent === 'cash_flow_inquiry') {
      steps.push(
        {
          title: 'Execute: generate_cash_flow_forecast',
          description: 'AI-powered cash flow forecasting for next 6 months',
          action: 'generate_cash_flow_forecast',
          priority: 'high'
        },
        {
          title: 'Review Overdue Invoices',
          description: 'Check for invoices that are past due to improve cash flow',
          action: 'navigate',
          url: '/invoices?filter=overdue',
          priority: 'high'
        },
        {
          title: 'Execute: detect_anomalies',
          description: 'Detect unusual patterns in cash flow',
          action: 'detect_anomalies',
          priority: 'medium'
        }
      );
    }

    if (intent === 'expense_analysis') {
      steps.push(
        {
          title: 'Execute: analyze_expense_trends',
          description: 'AI-powered deep dive into expense patterns and trends',
          action: 'analyze_expense_trends',
          priority: 'high'
        },
        {
          title: 'Create Expense Report',
          description: 'Generate a detailed expense report for better analysis',
          action: 'navigate',
          url: '/reports/expenses',
          priority: 'medium'
        },
        {
          title: 'Execute: optimize_expenses',
          description: 'Get AI suggestions for expense optimization',
          action: 'optimize_expenses',
          priority: 'medium'
        }
      );
    }

    // Add AI-suggested actions if available
    if (aiResponse.function_calls?.length > 0) {
      for (const call of aiResponse.function_calls) {
        steps.push({
          title: `Execute: ${call.name}`,
          description: `AI suggested action: ${call.name}`,
          action: call.name,
          priority: 'medium'
        });
      }
    }

    // Add general AI actions if no specific intent matches
    if (steps.length === 0) {
      steps.push(
        {
          title: 'Execute: analyze_expense_trends',
          description: 'Deep dive into expense patterns and trends',
          action: 'analyze_expense_trends',
          priority: 'medium'
        },
        {
          title: 'Execute: generate_cash_flow_forecast',
          description: 'Generate AI-powered cash flow forecast',
          action: 'generate_cash_flow_forecast',
          priority: 'medium'
        },
        {
          title: 'Execute: review_budget_performance',
          description: 'Review current budget vs actual performance',
          action: 'review_budget_performance',
          priority: 'medium'
        }
      );
    }

    return steps;
  }

  /**
   * Generate related queries
   */
  private generateRelatedQueries(intent: string, context: any): string[] {
    const queries: Record<string, string[]> = {
      cash_flow_inquiry: [
        'Show me cash flow forecast for next 3 months',
        'What are my biggest cash outflows?',
        'When will I have potential cash shortages?'
      ],
      expense_analysis: [
        'Which expenses have increased the most?',
        'Show me recurring expenses',
        'Compare this month\'s expenses to last month'
      ],
      revenue_analysis: [
        'Who are my top paying customers?',
        'What are my revenue trends by month?',
        'Show me seasonal revenue patterns'
      ],
      general_inquiry: [
        'What\'s my financial health score?',
        'Show me key financial metrics',
        'What should I focus on this week?'
      ]
    };

    return queries[intent] || queries.general_inquiry;
  }

  /**
   * Store conversation for learning and history
   */
  private async storeConversation(query: CopilotQuery, aiResponse: any, intent: any, startTime: number) {
    try {
      await prisma.conversationHistory.create({
        data: {
          sessionId: query.sessionId,
          query: query.query,
          intent: intent.intent,
          response: {
            answer: aiResponse.response,
            confidence: aiResponse.confidence,
            intent: aiResponse.intent,
            function_calls: aiResponse.function_calls
          },
          confidence: aiResponse.confidence,
          executionTime: Date.now() - startTime,
          tenantId: query.tenantId,
          userId: query.userId
        }
      });
    } catch (error) {
      console.error('Failed to store conversation:', error);
    }
  }

  /**
   * Build data sources information
   */
  private buildDataSources(relevantData: any): DataSource[] {
    return [
      {
        type: 'transactions',
        count: relevantData.transactions?.length || 0,
        timeframe: 'last 30 days',
        confidence: 0.9
      },
      {
        type: 'search_results',
        count: relevantData.searchResults?.length || 0,
        timeframe: 'all time',
        confidence: 0.8
      }
    ];
  }

  // Helper methods for data preparation and calculations
  private getRelevantEntityTypes(intent: string): string[] {
    const mapping: Record<string, string[]> = {
      cash_flow_inquiry: ['invoice', 'payment', 'expense'],
      expense_analysis: ['expense', 'bill'],
      revenue_analysis: ['invoice', 'customer'],
      customer_analysis: ['customer', 'invoice'],
      general_inquiry: ['invoice', 'expense', 'payment', 'customer']
    };
    
    return mapping[intent] || mapping.general_inquiry;
  }

  private async fetchRelevantTransactions(searchResults: any[], tenantId: string) {
    // This would fetch actual transaction data based on search results
    // For now, return empty array as placeholder
    return [];
  }

  private prepareCashFlowData(recentData: any) {
    // Prepare cash flow chart data
    return recentData.payments?.map((payment: any) => ({
      date: payment.paymentDate,
      amount: Number(payment.amount)
    })) || [];
  }

  private prepareExpenseData(expenses: any[]) {
    // Group expenses by category for pie chart
    const categoryTotals: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const category = 'General'; // Would extract from expense data
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.totalAmount);
    });

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount
    }));
  }

  private calculateHealthScore(context: any): number {
    // Simple health score calculation
    const { financialSummary } = context;
    let score = 70; // Base score

    // Positive factors
    if (financialSummary.netIncome > 0) score += 20;
    if (financialSummary.totalRevenue > financialSummary.totalExpenses * 1.2) score += 10;

    // Negative factors
    if (financialSummary.netIncome < 0) score -= 30;
    if (financialSummary.recentInvoiceCount === 0) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private async generateHealthAlerts(context: any): Promise<HealthAlert[]> {
    // Generate health alerts based on context
    return [];
  }

  private async generateHealthRecommendations(context: any): Promise<string[]> {
    // Generate health recommendations
    return [];
  }

  private async generateFinancialInsights(context: any): Promise<FinancialInsight[]> {
    // Generate financial insights
    return [];
  }

  private async enhanceSearchResults(searchResults: any[], filters?: any): Promise<SearchResult[]> {
    // Enhance search results with additional context
    return [];
  }

  private async generateSearchSummary(query: string, results: SearchResult[]): Promise<string> {
    return `Found ${results.length} relevant results for "${query}".`;
  }

  private async generateSearchSuggestions(query: string, results: SearchResult[]): Promise<string[]> {
    return [];
  }

  /**
   * 💡 GET CONTEXTUAL INSIGHTS
   * Get relevant insights based on query context
   */
  private async getContextualInsights(tenantId: string, intent: string): Promise<any[]> {
    try {
      const insights = await this.insightsEngine.generateComprehensiveInsights(tenantId);
      
      // Filter insights based on intent
      const relevantInsights = insights.filter(insight => {
        if (intent === 'cash_flow_inquiry') {
          return insight.category === 'Cash Flow' || insight.type === 'risk';
        } else if (intent === 'expense_analysis') {
          return insight.category === 'Expenses' || insight.type === 'optimization';
        } else if (intent === 'revenue_analysis') {
          return insight.category === 'Revenue' || insight.type === 'opportunity';
        }
        return true;
      });

      return relevantInsights.slice(0, 5);
    } catch (error) {
      console.error('Error getting contextual insights:', error);
      return [];
    }
  }

  /**
   * 🚨 GET REALTIME ANOMALIES
   * Get current anomalies for the tenant
   */
  private async getRealtimeAnomalies(tenantId: string): Promise<any[]> {
    try {
      const dashboard = await this.anomalyEngine.getAnomalyDashboard(tenantId);
      return dashboard.recentAnomalies.slice(0, 3);
    } catch (error) {
      console.error('Error getting realtime anomalies:', error);
      return [];
    }
  }

  /**
   * 🔮 GET PREDICTIVE CONTEXT
   * Get predictive data relevant to the query intent
   */
  private async getPredictiveContext(tenantId: string, intent: string): Promise<any> {
    try {
      if (intent === 'cash_flow_inquiry') {
        const forecast = await this.predictiveEngine.generateCashFlowForecast(tenantId, 3);
        return {
          type: 'cash_flow_forecast',
          data: forecast.slice(0, 3),
          confidence: 0.85
        };
      } else if (intent === 'revenue_analysis') {
        const projections = await this.predictiveEngine.generateRevenueProjections(tenantId, 6);
        return {
          type: 'revenue_projections',
          data: projections.slice(0, 6),
          confidence: 0.82
        };
      } else if (intent === 'expense_analysis') {
        const optimization = await this.predictiveEngine.analyzeExpenseOptimization(tenantId);
        return {
          type: 'expense_optimization',
          data: optimization.optimizationOpportunities.slice(0, 3),
          confidence: 0.88
        };
      }

      return {
        type: 'general_predictions',
        data: {},
        confidence: 0.7
      };
    } catch (error) {
      console.error('Error getting predictive context:', error);
      return {
        type: 'error',
        data: {},
        confidence: 0.0
      };
    }
  }
}

// Type definitions for private interfaces
interface HealthAlert {
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  action?: string;
}

interface FinancialInsight {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  relevance: number;
  data: any;
}