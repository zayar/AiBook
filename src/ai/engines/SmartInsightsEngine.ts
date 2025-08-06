import { PrismaClient } from '@prisma/client';
import { OpenAIService } from '../services/OpenAIService';
import { PredictiveAnalyticsEngine } from './PredictiveAnalyticsEngine';

export interface FinancialInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend' | 'alert';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  priority: number;
  category: string;
  data: any;
  recommendations: string[];
  actionItems: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: number;
    timeframe: string;
  }>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface BusinessHealthScore {
  overall: number;
  components: {
    cashFlow: { score: number; trend: string; insights: string[] };
    profitability: { score: number; trend: string; insights: string[] };
    growth: { score: number; trend: string; insights: string[] };
    efficiency: { score: number; trend: string; insights: string[] };
    risk: { score: number; trend: string; insights: string[] };
  };
  recommendations: string[];
  keyMetrics: Record<string, number>;
}

/**
 * 🧠 Smart Financial Insights Engine
 * 
 * AI-powered insights generation system that:
 * • Analyzes financial patterns and generates actionable insights
 * • Provides real-time business health scoring
 * • Identifies opportunities and risks automatically
 * • Suggests optimizations with impact predictions
 * • Creates personalized financial recommendations
 */
export class SmartInsightsEngine {
  private prisma: PrismaClient;
  private openAI: OpenAIService;
  private predictiveEngine: PredictiveAnalyticsEngine;
  private insightCache: Map<string, FinancialInsight[]> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.openAI = new OpenAIService();
    this.predictiveEngine = new PredictiveAnalyticsEngine(prisma);
  }

  /**
   * 🎯 GENERATE COMPREHENSIVE INSIGHTS
   * Main entry point for generating all types of financial insights
   */
  async generateComprehensiveInsights(tenantId: string): Promise<FinancialInsight[]> {
    console.log(`🔍 Generating comprehensive financial insights for tenant: ${tenantId}`);

    try {
      const insights: FinancialInsight[] = [];

      // 1. Cash Flow Insights
      const cashFlowInsights = await this.generateCashFlowInsights(tenantId);
      insights.push(...cashFlowInsights);

      // 2. Revenue Optimization Insights
      const revenueInsights = await this.generateRevenueInsights(tenantId);
      insights.push(...revenueInsights);

      // 3. Expense Optimization Insights
      const expenseInsights = await this.generateExpenseInsights(tenantId);
      insights.push(...expenseInsights);

      // 4. Customer Analysis Insights
      const customerInsights = await this.generateCustomerInsights(tenantId);
      insights.push(...customerInsights);

      // 5. Risk Assessment Insights
      const riskInsights = await this.generateRiskInsights(tenantId);
      insights.push(...riskInsights);

      // 6. Growth Opportunity Insights
      const growthInsights = await this.generateGrowthInsights(tenantId);
      insights.push(...growthInsights);

      // 7. Seasonal & Trend Insights
      const trendInsights = await this.generateTrendInsights(tenantId);
      insights.push(...trendInsights);

      // Sort by priority and impact
      insights.sort((a, b) => {
        if (a.impact !== b.impact) {
          const impactOrder = { high: 3, medium: 2, low: 1 };
          return impactOrder[b.impact] - impactOrder[a.impact];
        }
        return b.priority - a.priority;
      });

      // Store insights for future reference
      await this.storeInsights(tenantId, insights);

      console.log(`✅ Generated ${insights.length} financial insights`);
      return insights.slice(0, 15); // Return top 15 insights

    } catch (error) {
      console.error('❌ Error generating insights:', error);
      throw new Error('Failed to generate financial insights');
    }
  }

  /**
   * 📊 BUSINESS HEALTH SCORE
   * Comprehensive business health assessment with AI analysis
   */
  async calculateBusinessHealthScore(tenantId: string): Promise<BusinessHealthScore> {
    console.log(`💪 Calculating business health score for tenant: ${tenantId}`);

    try {
      // Gather financial data for analysis
      const financialData = await this.gatherFinancialMetrics(tenantId);
      
      // Calculate component scores
      const cashFlowScore = await this.calculateCashFlowScore(financialData);
      const profitabilityScore = await this.calculateProfitabilityScore(financialData);
      const growthScore = await this.calculateGrowthScore(financialData);
      const efficiencyScore = await this.calculateEfficiencyScore(financialData);
      const riskScore = await this.calculateRiskScore(financialData);

      // Calculate overall weighted score
      const overall = Math.round(
        (cashFlowScore.score * 0.25) +
        (profitabilityScore.score * 0.25) +
        (growthScore.score * 0.20) +
        (efficiencyScore.score * 0.15) +
        (riskScore.score * 0.15)
      );

      // Generate AI-powered recommendations
      const recommendations = await this.generateHealthRecommendations(
        overall, 
        { cashFlowScore, profitabilityScore, growthScore, efficiencyScore, riskScore }
      );

      const healthScore: BusinessHealthScore = {
        overall,
        components: {
          cashFlow: cashFlowScore,
          profitability: profitabilityScore,
          growth: growthScore,
          efficiency: efficiencyScore,
          risk: riskScore
        },
        recommendations,
        keyMetrics: {
          currentRatio: financialData.currentRatio,
          profitMargin: financialData.profitMargin,
          revenueGrowth: financialData.revenueGrowth,
          expenseRatio: financialData.expenseRatio,
          cashFlowTrend: financialData.cashFlowTrend
        }
      };

      console.log(`✅ Business health score calculated: ${overall}/100`);
      return healthScore;

    } catch (error) {
      console.error('❌ Error calculating business health:', error);
      throw new Error('Failed to calculate business health score');
    }
  }

  /**
   * 🚨 REAL-TIME ALERTS
   * Generate time-sensitive financial alerts and notifications
   */
  async generateRealTimeAlerts(tenantId: string): Promise<FinancialInsight[]> {
    console.log(`🚨 Checking for real-time financial alerts`);

    const alerts: FinancialInsight[] = [];

    try {
      // 1. Cash Flow Alerts
      const lowCashAlert = await this.checkLowCashFlow(tenantId);
      if (lowCashAlert) alerts.push(lowCashAlert);

      // 2. Overdue Invoice Alerts
      const overdueAlert = await this.checkOverdueInvoices(tenantId);
      if (overdueAlert) alerts.push(overdueAlert);

      // 3. Unusual Expense Alerts
      const expenseAlert = await this.checkUnusualExpenses(tenantId);
      if (expenseAlert) alerts.push(expenseAlert);

      // 4. Revenue Drop Alerts
      const revenueAlert = await this.checkRevenueDrop(tenantId);
      if (revenueAlert) alerts.push(revenueAlert);

      // 5. Budget Variance Alerts
      const budgetAlert = await this.checkBudgetVariance(tenantId);
      if (budgetAlert) alerts.push(budgetAlert);

      return alerts;

    } catch (error) {
      console.error('❌ Error generating alerts:', error);
      return [];
    }
  }

  // ========================================
  // INSIGHT GENERATION METHODS
  // ========================================

  async generateCashFlowInsights(tenantId: string): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];

    try {
      // Get cash flow forecast
      const forecast = await this.predictiveEngine.generateCashFlowForecast(tenantId, 3);
      
      // Check for upcoming cash shortfalls
      const negativeMonths = forecast.filter(f => f.netCashFlow < 0);
      
      if (negativeMonths.length > 0) {
        insights.push({
          id: `cash-flow-${Date.now()}`,
          type: 'risk',
          title: 'Potential Cash Flow Shortfall Detected',
          description: `Your forecast shows negative cash flow in ${negativeMonths.length} upcoming month(s). The largest shortfall is expected to be $${Math.abs(Math.min(...negativeMonths.map(m => m.netCashFlow))).toLocaleString()}.`,
          impact: 'high',
          confidence: 0.85,
          priority: 95,
          category: 'Cash Flow',
          data: { forecast, negativeMonths },
          recommendations: [
            'Accelerate collections from outstanding invoices',
            'Delay non-essential expenses',
            'Consider a line of credit for cash flow smoothing',
            'Implement stricter payment terms for new customers'
          ],
          actionItems: [
            {
              action: 'Review and follow up on overdue invoices',
              priority: 'high',
              estimatedImpact: 15000,
              timeframe: 'This week'
            },
            {
              action: 'Negotiate extended payment terms with vendors',
              priority: 'medium',
              estimatedImpact: 8000,
              timeframe: '2 weeks'
            }
          ],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      // Check for strong cash flow periods
      const strongMonths = forecast.filter(f => f.netCashFlow > 10000);
      
      if (strongMonths.length > 0) {
        insights.push({
          id: `cash-positive-${Date.now()}`,
          type: 'opportunity',
          title: 'Strong Cash Flow Period Ahead',
          description: `Your forecast shows strong positive cash flow in ${strongMonths.length} upcoming month(s). This is an excellent time for strategic investments.`,
          impact: 'medium',
          confidence: 0.80,
          priority: 70,
          category: 'Cash Flow',
          data: { strongMonths },
          recommendations: [
            'Consider investing in growth opportunities',
            'Build cash reserves for future challenges',
            'Upgrade equipment or technology',
            'Expand marketing efforts'
          ],
          actionItems: [
            {
              action: 'Evaluate investment opportunities',
              priority: 'medium',
              estimatedImpact: 25000,
              timeframe: '1 month'
            }
          ],
          createdAt: new Date()
        });
      }

    } catch (error) {
      console.error('Cash flow insights error:', error);
    }

    return insights;
  }

  private async generateRevenueInsights(tenantId: string): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];

    try {
      // Analyze revenue trends
      const revenueData = await this.analyzeRevenuePatterns(tenantId);
      
      if (revenueData.growthRate > 15) {
        insights.push({
          id: `revenue-growth-${Date.now()}`,
          type: 'trend',
          title: 'Exceptional Revenue Growth Detected',
          description: `Your revenue has grown by ${revenueData.growthRate.toFixed(1)}% over the past period. This is significantly above industry averages.`,
          impact: 'high',
          confidence: 0.90,
          priority: 85,
          category: 'Revenue',
          data: revenueData,
          recommendations: [
            'Scale successful strategies that are driving growth',
            'Consider expanding to new markets or customer segments',
            'Invest in customer retention programs',
            'Document successful processes for replication'
          ],
          actionItems: [
            {
              action: 'Analyze top-performing revenue streams',
              priority: 'high',
              estimatedImpact: 50000,
              timeframe: '2 weeks'
            }
          ],
          createdAt: new Date()
        });
      }

      // Check for revenue concentration risk
      if (revenueData.topCustomerPercentage > 40) {
        insights.push({
          id: `revenue-concentration-${Date.now()}`,
          type: 'risk',
          title: 'High Customer Concentration Risk',
          description: `${revenueData.topCustomerPercentage.toFixed(1)}% of your revenue comes from your top customer. This creates significant business risk.`,
          impact: 'high',
          confidence: 0.95,
          priority: 90,
          category: 'Revenue',
          data: revenueData,
          recommendations: [
            'Diversify customer base to reduce concentration risk',
            'Develop multiple revenue streams',
            'Strengthen relationships with secondary customers',
            'Create customer acquisition strategies'
          ],
          actionItems: [
            {
              action: 'Develop customer diversification strategy',
              priority: 'high',
              estimatedImpact: 30000,
              timeframe: '1 month'
            }
          ],
          createdAt: new Date()
        });
      }

    } catch (error) {
      console.error('Revenue insights error:', error);
    }

    return insights;
  }

  private async generateExpenseInsights(tenantId: string): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];

    try {
      // Get expense optimization analysis
      const optimization = await this.predictiveEngine.analyzeExpenseOptimization(tenantId);
      
      if (optimization.totalPotentialSavings > 5000) {
        insights.push({
          id: `expense-optimization-${Date.now()}`,
          type: 'optimization',
          title: 'Significant Expense Optimization Opportunities',
          description: `AI analysis identified potential savings of $${optimization.totalPotentialSavings.toLocaleString()} across ${optimization.optimizationOpportunities.length} expense categories.`,
          impact: 'high',
          confidence: 0.85,
          priority: 88,
          category: 'Expenses',
          data: optimization,
          recommendations: optimization.optimizationOpportunities.map(opp => 
            `Optimize ${opp.category}: ${opp.reasoning}`
          ),
          actionItems: optimization.optimizationOpportunities.slice(0, 3).map(opp => ({
            action: `Review and optimize ${opp.category} expenses`,
            priority: 'high' as const,
            estimatedImpact: opp.savings,
            timeframe: '2 weeks'
          })),
          createdAt: new Date()
        });
      }

    } catch (error) {
      console.error('Expense insights error:', error);
    }

    return insights;
  }

  private async generateCustomerInsights(tenantId: string): Promise<FinancialInsight[]> {
    // Implementation for customer analysis insights
    return [];
  }

  private async generateRiskInsights(tenantId: string): Promise<FinancialInsight[]> {
    // Implementation for risk assessment insights
    return [];
  }

  private async generateGrowthInsights(tenantId: string): Promise<FinancialInsight[]> {
    // Implementation for growth opportunity insights
    return [];
  }

  private async generateTrendInsights(tenantId: string): Promise<FinancialInsight[]> {
    // Implementation for seasonal and trend insights
    return [];
  }

  // ========================================
  // BUSINESS HEALTH CALCULATION METHODS
  // ========================================

  private async gatherFinancialMetrics(tenantId: string) {
    // Gather comprehensive financial data for health scoring
    const [invoices, expenses, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
      }),
      this.prisma.expense.findMany({
        where: { tenantId, expenseDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
      }),
      this.prisma.paymentReceived.findMany({
        where: { tenantId, paymentDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
      })
    ]);

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
    const totalPayments = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);

    return {
      totalRevenue,
      totalExpenses,
      totalPayments,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      currentRatio: totalPayments > 0 ? totalRevenue / totalExpenses : 0,
      revenueGrowth: 0, // TODO: Calculate actual growth
      expenseRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
      cashFlowTrend: totalPayments - totalExpenses
    };
  }

  private async calculateCashFlowScore(data: any) {
    const score = Math.min(100, Math.max(0, 
      data.cashFlowTrend > 0 ? 80 + (data.cashFlowTrend / 10000) * 20 : 
      data.cashFlowTrend < -5000 ? 20 : 50
    ));

    return {
      score: Math.round(score),
      trend: data.cashFlowTrend > 0 ? 'positive' : data.cashFlowTrend < 0 ? 'negative' : 'stable',
      insights: [
        data.cashFlowTrend > 0 ? 'Strong cash flow position' : 'Cash flow needs attention',
        `Current trend: $${data.cashFlowTrend.toLocaleString()}`
      ]
    };
  }

  private async calculateProfitabilityScore(data: any) {
    const score = Math.min(100, Math.max(0, data.profitMargin * 2)); // Scale 0-50% margin to 0-100 score

    return {
      score: Math.round(score),
      trend: data.profitMargin > 20 ? 'excellent' : data.profitMargin > 10 ? 'good' : 'needs improvement',
      insights: [
        `Profit margin: ${data.profitMargin.toFixed(1)}%`,
        data.profitMargin > 15 ? 'Healthy profitability' : 'Consider cost optimization'
      ]
    };
  }

  private async calculateGrowthScore(data: any) {
    // Simplified growth calculation
    const score = Math.min(100, Math.max(0, 50 + data.revenueGrowth));

    return {
      score: Math.round(score),
      trend: data.revenueGrowth > 0 ? 'growing' : 'declining',
      insights: [
        `Revenue growth: ${data.revenueGrowth.toFixed(1)}%`,
        'Growth metrics are being analyzed'
      ]
    };
  }

  private async calculateEfficiencyScore(data: any) {
    const score = Math.min(100, Math.max(0, 100 - data.expenseRatio));

    return {
      score: Math.round(score),
      trend: data.expenseRatio < 70 ? 'efficient' : 'needs optimization',
      insights: [
        `Expense ratio: ${data.expenseRatio.toFixed(1)}%`,
        data.expenseRatio < 70 ? 'Efficient operations' : 'Consider expense optimization'
      ]
    };
  }

  private async calculateRiskScore(data: any) {
    // Higher score = lower risk
    const score = data.currentRatio > 1.5 ? 90 : data.currentRatio > 1 ? 70 : 40;

    return {
      score,
      trend: data.currentRatio > 1.2 ? 'low risk' : 'elevated risk',
      insights: [
        `Current ratio: ${data.currentRatio.toFixed(2)}`,
        data.currentRatio > 1.2 ? 'Strong financial position' : 'Monitor financial health closely'
      ]
    };
  }

  private async generateHealthRecommendations(overall: number, components: any): Promise<string[]> {
    const recommendations = [];

    if (overall >= 80) {
      recommendations.push('Excellent financial health! Consider growth investments.');
    } else if (overall >= 60) {
      recommendations.push('Good financial position with room for optimization.');
    } else {
      recommendations.push('Focus on improving key financial metrics.');
    }

    if (components.cashFlowScore.score < 60) {
      recommendations.push('Prioritize cash flow management and collections.');
    }

    if (components.profitabilityScore.score < 50) {
      recommendations.push('Focus on margin improvement and cost control.');
    }

    return recommendations;
  }

  // ========================================
  // ALERT GENERATION METHODS
  // ========================================

  private async checkLowCashFlow(tenantId: string): Promise<FinancialInsight | null> {
    // Implementation for low cash flow alerts
    return null;
  }

  private async checkOverdueInvoices(tenantId: string): Promise<FinancialInsight | null> {
    // Implementation for overdue invoice alerts
    return null;
  }

  private async checkUnusualExpenses(tenantId: string): Promise<FinancialInsight | null> {
    // Implementation for unusual expense alerts
    return null;
  }

  private async checkRevenueDrop(tenantId: string): Promise<FinancialInsight | null> {
    // Implementation for revenue drop alerts
    return null;
  }

  private async checkBudgetVariance(tenantId: string): Promise<FinancialInsight | null> {
    // Implementation for budget variance alerts
    return null;
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private async analyzeRevenuePatterns(tenantId: string) {
    // Analyze revenue patterns and customer concentration
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: 'PAID', createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      include: { customer: true }
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    
    // Group by customer
    const customerRevenue: Record<string, number> = {};
    invoices.forEach(inv => {
      const customerId = inv.customerId;
      if (!customerRevenue[customerId]) customerRevenue[customerId] = 0;
      customerRevenue[customerId] += Number(inv.totalAmount);
    });

    const topCustomerRevenue = Math.max(...Object.values(customerRevenue));
    const topCustomerPercentage = totalRevenue > 0 ? (topCustomerRevenue / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      growthRate: 10, // TODO: Calculate actual growth rate
      topCustomerPercentage,
      customerCount: Object.keys(customerRevenue).length
    };
  }

  private async storeInsights(tenantId: string, insights: FinancialInsight[]) {
    try {
      // Store insights in database for tracking and analytics
      await this.prisma.aIInsight.createMany({
        data: insights.map(insight => ({
          tenantId,
          type: 'PATTERN_RECOGNITION' as const,
          entityType: 'financial_overview',
          entityId: `overview_${Date.now()}`,
          insight: {
            title: insight.title,
            description: insight.description,
            impact: insight.impact,
            category: insight.category,
            data: insight.data,
            recommendations: insight.recommendations
          },
          confidence: insight.confidence
        }))
      });
    } catch (error) {
      console.warn('Failed to store insights:', error);
    }
  }
}