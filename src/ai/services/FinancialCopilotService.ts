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
      
      // 4. Generate AI response with OpenAI using FULL ENHANCED CONTEXT
      const aiResponse = await this.openAI.processFinancialQuery(query.query, {
        tenantId: query.tenantId,
        userId: query.userId,
        // Pass ALL the enhanced financial context
        businessProfile: context.businessProfile,
        profitLoss: context.profitLoss,
        cashFlow: context.cashFlow,
        trialBalance: context.trialBalance,
        topCustomers: context.topCustomers,
        topVendors: context.topVendors,
        inventory: context.inventory,
        cogs: context.cogs,
        banking: context.banking,
        recentActivity: context.recentActivity,
        // Legacy fields for compatibility
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
   * Gather comprehensive financial context with real business intelligence
   */
  private async gatherFinancialContext(query: CopilotQuery, intent: any) {
    const { tenantId } = query;
    
    try {
      // Get comprehensive business context
      const [
        businessProfile,
        trialBalance,
        profitLoss,
        cashFlow,
        topCustomers,
        topVendors,
        cogsAnalysis,
        inventorySummary,
        bankingStatus,
        recentTransactions
      ] = await Promise.all([
        // Business Profile
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true, baseCurrency: true, settings: true }
        }),
        
        // Trial Balance (Chart of Accounts with balances)
        prisma.account.findMany({
          where: { tenantId },
          select: { 
            code: true, 
            name: true, 
            type: true, 
            balance: true
          },
          orderBy: { code: 'asc' }
        }),
        
        // Profit & Loss Analysis
        this.calculateProfitLoss(tenantId),
        
        // Cash Flow Summary
        this.calculateCashFlow(tenantId),
        
        // Top Customers by Revenue
        prisma.invoice.groupBy({
          by: ['customerId'],
          where: { 
            tenantId, 
            status: { in: ['SENT', 'PAID'] },
            issueDate: { gte: new Date(new Date().getFullYear(), 0, 1) } // This year
          },
          _sum: { totalAmount: true },
          _count: { id: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 5
        }),
        
        // Top Vendors by Spending
        prisma.bill.groupBy({
          by: ['vendorId'],
          where: { 
            tenantId,
            billDate: { gte: new Date(new Date().getFullYear(), 0, 1) } // This year
          },
          _sum: { totalAmount: true },
          _count: { id: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 5
        }),
        
        // COGS Analysis
        this.getCOGSAnalysis(tenantId),
        
        // Inventory Summary
        prisma.inventoryItem.findMany({
          where: { tenantId },
          select: {
            sku: true,
            description: true,
            quantityOnHand: true,
            unitCost: true,
            costLayers: {
              select: { remainingQuantity: true, unitCost: true }
            }
          },
          orderBy: { quantityOnHand: 'desc' },
          take: 10
        }),
        
        // Banking Status
        prisma.bankAccount.findMany({
          where: { tenantId },
          select: { 
            accountNumber: true, 
            accountType: true, 
            balance: true, 
            currency: true 
          }
        }),
        
        // Recent Transactions (Last 30 days) - Using simplified approach
        []
      ]);

      // Enrich customer data
      const customerIds = topCustomers.map((c: any) => c.customerId).filter(Boolean);
      const customerDetails = customerIds.length > 0 ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, email: true }
      }) : [];

      // Enrich vendor data
      const vendorIds = topVendors.map((v: any) => v.vendorId).filter(Boolean);
      const vendorDetails = vendorIds.length > 0 ? await prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, name: true, email: true }
      }) : [];

      return {
        businessProfile,
        
        // Financial Position
        trialBalance: {
          accounts: trialBalance,
          totalAssets: trialBalance.filter((a: any) => a.type?.includes('ASSET')).reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0),
          totalLiabilities: trialBalance.filter((a: any) => a.type?.includes('LIABILITY') || a.type?.includes('PAYABLE')).reduce((sum: number, a: any) => sum + Math.abs(Number(a.balance || 0)), 0),
          totalEquity: trialBalance.filter((a: any) => a.type?.includes('EQUITY')).reduce((sum: number, a: any) => sum + Math.abs(Number(a.balance || 0)), 0)
        },
        
        // Performance Metrics
        profitLoss: profitLoss || {
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          expenses: 0,
          netIncome: 0,
          grossMargin: 0,
          netMargin: 0
        },
        
        // Cash Flow
        cashFlow: cashFlow || {
          operatingCashFlow: 0,
          investingCashFlow: 0,
          financingCashFlow: 0,
          netCashFlow: 0,
          cashPosition: bankingStatus.reduce((sum: number, b: any) => sum + Number(b.balance || 0), 0)
        },
        
        // Business Intelligence
        topCustomers: topCustomers.map((tc: any) => ({
          ...tc,
          customer: customerDetails.find(c => c.id === tc.customerId),
          revenue: Number(tc._sum.totalAmount || 0),
          invoiceCount: tc._count.id
        })),
        
        topVendors: topVendors.map((tv: any) => ({
          ...tv,
          vendor: vendorDetails.find(v => v.id === tv.vendorId),
          spending: Number(tv._sum.totalAmount || 0),
          billCount: tv._count.id
        })),
        
        // Inventory Intelligence
        inventory: {
          items: inventorySummary,
          totalValue: inventorySummary.reduce((sum: number, item: any) => sum + (Number(item.quantityOnHand || 0) * Number(item.unitCost || 0)), 0),
          totalQuantity: inventorySummary.reduce((sum: number, item: any) => sum + Number(item.quantityOnHand || 0), 0),
          lowStockItems: inventorySummary.filter((item: any) => Number(item.quantityOnHand || 0) < 10)
        },
        
        // COGS Analysis
        cogs: cogsAnalysis,
        
        // Banking Summary
        banking: {
          accounts: bankingStatus,
          totalCash: bankingStatus.reduce((sum: number, b: any) => sum + Number(b.balance || 0), 0),
          accountCount: bankingStatus.length
        },
        
        // Recent Activity Context
        recentActivity: {
          journalEntries: recentTransactions.length,
          lastTransactionDate: recentTransactions.length > 0 ? recentTransactions[0] : null,
          recentTransactions: []
        },
        
        // Legacy financial summary for compatibility
        financialSummary: {
          totalRevenue: profitLoss?.revenue || 0,
          totalExpenses: profitLoss?.expenses || 0,
          netIncome: profitLoss?.netIncome || 0,
          recentInvoiceCount: topCustomers?.length || 0,
          recentExpenseCount: 0,
          recentPaymentCount: 0
        }
      };
      
    } catch (error) {
      console.error('❌ Error gathering financial context:', error);
      return {
        businessProfile: { name: 'Unknown Business', baseCurrency: 'USD' },
        error: 'Failed to gather financial context'
      };
    }
  }

  /**
   * Calculate Profit & Loss metrics using the SAME logic as P&L reports
   */
  private async calculateProfitLoss(tenantId: string) {
    try {
      // CRITICAL FIX: Use EXACT SAME logic as P&L report - NO DATE FILTER!
      // The P&L report doesn't filter by date when called with period=this_month
      // It only filters if explicit startDate/endDate are provided
      console.log(`🗓️ AI P&L Calculation: Using NO date filter (same as P&L report)`);
      
      const accounts = await prisma.account.findMany({
        where: {
          tenantId,
          type: { in: ['INCOME', 'OTHER_INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE'] },
          isActive: true
        },
        include: {
          entries: {
            // NO DATE FILTER - get all entries like the P&L report does
          }
        },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' }
        ]
      });
      
      console.log(`🔍 AI found ${accounts.length} accounts for P&L calculation`);

      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalCOGS = 0;

      // FIXED: Use EXACT SAME logic as P&L report controller
      accounts.forEach((account: any) => {
        const debits = account.entries
          .filter((entry: any) => entry.type === 'DEBIT')
          .reduce((sum: number, entry: any) => sum + parseFloat(entry.amount.toString()), 0);
        
        const credits = account.entries
          .filter((entry: any) => entry.type === 'CREDIT')
          .reduce((sum: number, entry: any) => sum + parseFloat(entry.amount.toString()), 0);

        const isIncomeAccount = ['INCOME', 'OTHER_INCOME'].includes(account.type);
        const netAmount = isIncomeAccount ? credits - debits : debits - credits;

        console.log(`💰 Account ${account.code} (${account.name}): Type=${account.type}, Debits=${debits}, Credits=${credits}, NetAmount=${netAmount}, Entries=${account.entries.length}`);

        if (['INCOME', 'OTHER_INCOME'].includes(account.type)) {
          totalRevenue += Math.abs(netAmount);
        } else {
          // All expense types grouped together (same as P&L report)
          totalExpenses += Math.abs(netAmount);
        }
      });
      
      // FIXED: COGS is now included in totalExpenses (same as P&L report)
      const grossProfit = totalRevenue; // Same as P&L report
      const netIncome = totalRevenue - totalExpenses;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
      
      console.log(`🧮 AI P&L Calculation (FIXED): Revenue=${totalRevenue}, Expenses=${totalExpenses}, NetIncome=${netIncome}`);
      
      return {
        revenue: totalRevenue,
        cogs: 0, // COGS is included in totalExpenses
        grossProfit,
        expenses: totalExpenses,
        netIncome,
        grossMargin,
        netMargin,
        period: 'This Month'
      };
    } catch (error) {
      console.error('❌ Error calculating P&L:', error);
      return null;
    }
  }

  /**
   * Calculate Cash Flow metrics
   */
  private async calculateCashFlow(tenantId: string) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Operating cash flow (payments received - payments made)
      const [paymentsReceived, paymentsMade] = await Promise.all([
        prisma.paymentReceived.aggregate({
          where: { 
            tenantId, 
            paymentDate: { gte: thirtyDaysAgo }
          },
          _sum: { amount: true }
        }),
        prisma.vendorPayment.aggregate({
          where: { 
            tenantId, 
            paymentDate: { gte: thirtyDaysAgo }
          },
          _sum: { amount: true }
        })
      ]);
      
      const operatingCashFlow = Number(paymentsReceived._sum.amount || 0) - Number(paymentsMade._sum.amount || 0);
      
      return {
        operatingCashFlow,
        investingCashFlow: 0, // TODO: Calculate from asset purchases
        financingCashFlow: 0,  // TODO: Calculate from loans/equity
        netCashFlow: operatingCashFlow,
        period: 'Last 30 Days'
      };
    } catch (error) {
      console.error('❌ Error calculating cash flow:', error);
      return null;
    }
  }

  /**
   * Get COGS Analysis
   */
  private async getCOGSAnalysis(tenantId: string) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const cogsCalculations = await prisma.cOGSCalculation.findMany({
        where: { 
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        },
        include: {
          invoiceItem: {
            include: {
              inventoryItem: { select: { sku: true, description: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      const totalCOGS = cogsCalculations.reduce((sum, calc) => sum + Number(calc.totalCOGS || 0), 0);
      const totalQuantity = cogsCalculations.reduce((sum, calc) => sum + Number(calc.quantitySold || 0), 0);
      
      return {
        totalCOGS,
        totalQuantity,
        averageCostPerUnit: totalQuantity > 0 ? totalCOGS / totalQuantity : 0,
        recentCalculations: cogsCalculations.length,
        topCogsItems: cogsCalculations.slice(0, 5).map(calc => ({
          sku: calc.invoiceItem?.inventoryItem?.sku || 'Unknown',
          description: calc.invoiceItem?.inventoryItem?.description || 'Unknown',
          quantity: Number(calc.quantitySold),
          cost: Number(calc.totalCOGS),
          date: calc.createdAt
        }))
      };
    } catch (error) {
      console.error('❌ Error getting COGS analysis:', error);
      return {
        totalCOGS: 0,
        totalQuantity: 0,
        averageCostPerUnit: 0,
        recentCalculations: 0,
        topCogsItems: []
      };
    }
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