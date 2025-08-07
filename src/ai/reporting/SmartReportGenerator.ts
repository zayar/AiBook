import { PrismaClient } from '@prisma/client';
import type { ConversationContext } from '../conversation/ConversationManager';

const prisma = new PrismaClient();

export interface ReportConfiguration {
  type: string;
  timeframe: {
    start: Date;
    end: Date;
    period: string;
  };
  filters?: Record<string, any>;
  groupBy?: string[];
  sortBy?: string;
  format: 'table' | 'chart' | 'summary' | 'detailed';
  includeComparisons?: boolean;
}

export interface GeneratedReport {
  id: string;
  title: string;
  summary: string;
  data: any[];
  visualizations: any[];
  insights: string[];
  recommendations: string[];
  metadata: {
    generated: Date;
    executionTime: number;
    dataPoints: number;
    confidence: number;
  };
}

export interface ReportInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  message: string;
  impact: 'high' | 'medium' | 'low';
  dataPoints: any[];
  actionable: boolean;
}

export class SmartReportGenerator {
  private tenantId: string;

  // Report templates with natural language mappings
  private reportTemplates = {
    profit_loss: {
      name: 'Profit & Loss Statement',
      description: 'Revenue, expenses, and net income analysis',
      queries: {
        revenue: `
          SELECT 
            DATE_FORMAT(e.entryDate, '%Y-%m') as period,
            SUM(CASE WHEN a.accountType = 'REVENUE' THEN e.amount ELSE 0 END) as revenue
          FROM entries e
          JOIN accounts a ON e.accountId = a.id
          WHERE e.tenantId = ? AND e.entryDate BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(e.entryDate, '%Y-%m')
          ORDER BY period
        `,
        expenses: `
          SELECT 
            DATE_FORMAT(e.entryDate, '%Y-%m') as period,
            SUM(CASE WHEN a.accountType = 'EXPENSE' THEN e.amount ELSE 0 END) as expenses
          FROM entries e
          JOIN accounts a ON e.accountId = a.id
          WHERE e.tenantId = ? AND e.entryDate BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(e.entryDate, '%Y-%m')
          ORDER BY period
        `
      }
    },
    cash_flow: {
      name: 'Cash Flow Statement',
      description: 'Cash inflows and outflows analysis',
      queries: {
        operating: `
          SELECT 
            DATE_FORMAT(e.entryDate, '%Y-%m') as period,
            SUM(CASE WHEN e.entryType = 'CREDIT' THEN e.amount ELSE -e.amount END) as operating_cash_flow
          FROM entries e
          JOIN accounts a ON e.accountId = a.id
          WHERE e.tenantId = ? AND e.entryDate BETWEEN ? AND ?
            AND a.accountType IN ('REVENUE', 'EXPENSE')
          GROUP BY DATE_FORMAT(e.entryDate, '%Y-%m')
          ORDER BY period
        `
      }
    },
    balance_sheet: {
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity snapshot',
      queries: {
        assets: `
          SELECT 
            a.name as account_name,
            a.accountType as account_type,
            SUM(CASE WHEN e.entryType = 'DEBIT' THEN e.amount ELSE -e.amount END) as balance
          FROM accounts a
          LEFT JOIN entries e ON a.id = e.accountId
          WHERE a.tenantId = ? AND (e.entryDate <= ? OR e.entryDate IS NULL)
            AND a.accountType IN ('ASSET', 'LIABILITY', 'EQUITY')
          GROUP BY a.id, a.name, a.accountType
          HAVING balance != 0
          ORDER BY a.accountType, a.name
        `
      }
    }
  };

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Generate report from natural language query
   */
  async generateFromNaturalLanguage(
    reportType: string,
    entities: Record<string, any>,
    context: ConversationContext
  ): Promise<GeneratedReport> {
    const startTime = Date.now();

    try {
      // Parse the request into report configuration
      const config = this.parseReportRequest(reportType, entities);

      // Check for existing templates
      const existingTemplate = await this.findMatchingTemplate(
        config,
        context.tenantId
      );

      let report: GeneratedReport;

      if (existingTemplate) {
        report = await this.generateFromTemplate(existingTemplate, config);
      } else {
        report = await this.generateCustomReport(config);
        
        // Save as new template if successful
        await this.saveReportTemplate(config, context);
      }

      // Add intelligent insights
      report.insights = await this.generateInsights(report.data, config);
      report.recommendations = await this.generateRecommendations(report);

      // Update metadata
      report.metadata.executionTime = Date.now() - startTime;
      report.metadata.generated = new Date();

      return report;

    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Parse natural language request into report configuration
   */
  private parseReportRequest(
    reportType: string,
    entities: Record<string, any>
  ): ReportConfiguration {
    // Default timeframe - current month
    const now = new Date();
    let timeframe = {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      period: 'this_month'
    };

    // Parse timeframe from entities
    if (entities.timeframe) {
      timeframe = this.parseTimeframe(entities.timeframe);
    }

    // Determine report format
    let format: 'table' | 'chart' | 'summary' | 'detailed' = 'summary';
    if (entities.format) {
      format = entities.format;
    }

    return {
      type: reportType,
      timeframe,
      filters: entities.filters || {},
      groupBy: entities.groupBy || [],
      sortBy: entities.sortBy,
      format,
      includeComparisons: entities.includeComparisons || false
    };
  }

  /**
   * Generate custom report based on configuration
   */
  private async generateCustomReport(
    config: ReportConfiguration
  ): Promise<GeneratedReport> {
    const template = this.reportTemplates[config.type as keyof typeof this.reportTemplates];
    
    if (!template) {
      throw new Error(`Unsupported report type: ${config.type}`);
    }

    const data: any[] = [];
    const visualizations: any[] = [];

    // Execute queries for this report type
    for (const [queryName, sql] of Object.entries(template.queries)) {
      const queryParams = [
        this.tenantId,
        config.timeframe.start,
        config.timeframe.end
      ];

      const results = await prisma.$queryRawUnsafe(sql, ...queryParams);
      data.push({
        section: queryName,
        data: results
      });

      // Generate appropriate visualization
      const visualization = this.generateVisualization(
        queryName,
        results as any[],
        config
      );
      if (visualization) {
        visualizations.push(visualization);
      }
    }

    return {
      id: `report_${Date.now()}`,
      title: template.name,
      summary: this.generateReportSummary(data, config),
      data,
      visualizations,
      insights: [],
      recommendations: [],
      metadata: {
        generated: new Date(),
        executionTime: 0,
        dataPoints: data.reduce((sum, section) => sum + section.data.length, 0),
        confidence: 0.9
      }
    };
  }

  /**
   * Generate report from existing template
   */
  private async generateFromTemplate(
    template: any,
    config: ReportConfiguration
  ): Promise<GeneratedReport> {
    // Execute the template's SQL query with current parameters
    const sql = template.sqlQuery;
    const params = this.buildQueryParameters(config);

    const results = await prisma.$queryRawUnsafe(sql, ...params);

    return {
      id: `template_report_${Date.now()}`,
      title: template.name,
      summary: template.description,
      data: [{ section: 'main', data: results }],
      visualizations: this.generateVisualizationsFromTemplate(results as any[], config),
      insights: [],
      recommendations: [],
      metadata: {
        generated: new Date(),
        executionTime: 0,
        dataPoints: (results as any[]).length,
        confidence: 0.95
      }
    };
  }

  /**
   * Generate intelligent insights from report data
   */
  private async generateInsights(
    data: any[],
    config: ReportConfiguration
  ): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Revenue trend analysis
      const revenueData = data.find(d => d.section === 'revenue');
      if (revenueData && revenueData.data.length > 1) {
        const trend = this.analyzeTrend(revenueData.data, 'revenue');
        if (trend.significant) {
          insights.push(`Revenue is ${trend.direction} by ${trend.percentage}% ${config.timeframe.period}`);
        }
      }

      // Expense analysis
      const expenseData = data.find(d => d.section === 'expenses');
      if (expenseData && expenseData.data.length > 0) {
        const total = expenseData.data.reduce((sum: number, item: any) => sum + item.expenses, 0);
        insights.push(`Total expenses for the period: $${total.toLocaleString()}`);
      }

      // Profitability insights
      if (revenueData && expenseData) {
        const profit = this.calculateProfitability(revenueData.data, expenseData.data);
        if (profit.margin) {
          insights.push(`Profit margin is ${profit.margin.toFixed(1)}%`);
        }
      }

      // Add more sophisticated insights based on data patterns
      const anomalies = this.detectAnomalies(data);
      anomalies.forEach(anomaly => {
        insights.push(`Anomaly detected: ${anomaly.description}`);
      });

    } catch (error) {
      console.error('❌ Error generating insights:', error);
      insights.push('Unable to generate detailed insights at this time');
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    report: GeneratedReport
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze the report data for recommendations
    const insights = report.insights;

    if (insights.some(i => i.includes('decreasing'))) {
      recommendations.push('Consider reviewing recent business activities to identify causes of decline');
    }

    if (insights.some(i => i.includes('expense'))) {
      recommendations.push('Review expense categories to identify potential cost optimization opportunities');
    }

    if (insights.some(i => i.includes('Anomaly'))) {
      recommendations.push('Investigate anomalies to ensure data accuracy and identify potential issues');
    }

    // Add default recommendations based on report type
    switch (report.title.toLowerCase()) {
      case 'profit & loss statement':
        recommendations.push('Consider comparing with previous periods to track performance trends');
        break;
      case 'cash flow statement':
        recommendations.push('Monitor cash flow regularly to ensure adequate working capital');
        break;
      case 'balance sheet':
        recommendations.push('Review asset utilization and debt levels for optimization opportunities');
        break;
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private parseTimeframe(timeframeStr: string): any {
    const now = new Date();
    const lowerStr = timeframeStr.toLowerCase();

    if (lowerStr.includes('this month')) {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        period: 'this_month'
      };
    }

    if (lowerStr.includes('last month')) {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
        period: 'last_month'
      };
    }

    if (lowerStr.includes('this quarter')) {
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: new Date(now.getFullYear(), (quarter + 1) * 3, 0),
        period: 'this_quarter'
      };
    }

    // Default to current month
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      period: 'current_month'
    };
  }

  private generateVisualization(
    queryName: string,
    data: any[],
    config: ReportConfiguration
  ): any | null {
    if (!data || data.length === 0) return null;

    // Generate appropriate chart based on data structure
    if (data[0].period) {
      // Time series data
      return {
        type: 'line',
        title: `${queryName.charAt(0).toUpperCase() + queryName.slice(1)} Trend`,
        data: data.map(item => ({
          x: item.period,
          y: Object.values(item)[1] // Second column (first is usually period)
        }))
      };
    }

    // Category data
    return {
      type: 'bar',
      title: `${queryName.charAt(0).toUpperCase() + queryName.slice(1)} Breakdown`,
      data: data.slice(0, 10) // Limit to top 10 items
    };
  }

  private generateReportSummary(data: any[], config: ReportConfiguration): string {
    const template = this.reportTemplates[config.type as keyof typeof this.reportTemplates];
    const dataPoints = data.reduce((sum, section) => sum + section.data.length, 0);
    
    return `${template?.description || 'Financial report'} for ${config.timeframe.period} with ${dataPoints} data points.`;
  }

  private analyzeTrend(data: any[], metric: string): any {
    if (data.length < 2) return { significant: false };

    const values = data.map(item => item[metric] || 0);
    const first = values[0];
    const last = values[values.length - 1];
    
    if (first === 0) return { significant: false };

    const percentage = ((last - first) / first) * 100;
    const direction = percentage > 0 ? 'increasing' : 'decreasing';
    const significant = Math.abs(percentage) > 5; // 5% threshold

    return {
      significant,
      direction,
      percentage: Math.abs(percentage)
    };
  }

  private calculateProfitability(revenueData: any[], expenseData: any[]): any {
    const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + (item.expenses || 0), 0);
    
    if (totalRevenue === 0) return {};

    return {
      margin: ((totalRevenue - totalExpenses) / totalRevenue) * 100,
      profit: totalRevenue - totalExpenses
    };
  }

  private detectAnomalies(data: any[]): any[] {
    // Simple anomaly detection
    const anomalies: any[] = [];

    data.forEach(section => {
      if (section.data && section.data.length > 0) {
        // Check for zero or negative values where they shouldn't be
        const negativeValues = section.data.filter((item: any) => 
          Object.values(item).some(value => 
            typeof value === 'number' && value < 0 && section.section === 'revenue'
          )
        );

        if (negativeValues.length > 0) {
          anomalies.push({
            description: `Negative ${section.section} values detected`,
            count: negativeValues.length
          });
        }
      }
    });

    return anomalies;
  }

  private async findMatchingTemplate(
    config: ReportConfiguration,
    tenantId: string
  ): Promise<any> {
    try {
      return await prisma.reportTemplate.findFirst({
        where: {
          tenantId,
          templateType: config.type.toUpperCase() as any
        },
        orderBy: { usageCount: 'desc' }
      });
    } catch (error) {
      return null;
    }
  }

  private async saveReportTemplate(
    config: ReportConfiguration,
    context: ConversationContext
  ): Promise<void> {
    try {
      await prisma.reportTemplate.create({
        data: {
          name: `${config.type} Report`,
          description: `Auto-generated ${config.type} report template`,
          tenantId: context.tenantId,
          userId: context.userId,
          templateType: config.type.toUpperCase() as any,
          nlQuery: `Generate ${config.type} report for ${config.timeframe.period}`,
          parameters: config as any,
          isPublic: false,
          usageCount: 1
        }
      });
    } catch (error) {
      console.error('❌ Error saving report template:', error);
    }
  }

  private buildQueryParameters(config: ReportConfiguration): any[] {
    return [
      this.tenantId,
      config.timeframe.start,
      config.timeframe.end
    ];
  }

  private generateVisualizationsFromTemplate(
    data: any[],
    config: ReportConfiguration
  ): any[] {
    if (!data || data.length === 0) return [];

    return [{
      type: 'table',
      title: `${config.type} Results`,
      data: data.slice(0, 50) // Limit display
    }];
  }
}