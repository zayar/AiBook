import { PrismaClient } from '@prisma/client';
import { redisCacheService } from './redisCacheService';
import { FinancialMetrics } from '../types/cache';
import { ReportingEngine } from '../accounting/engines/ReportingEngine';

const prisma = new PrismaClient();

/**
 * 📊 Enhanced Financial Metrics Service
 * High-performance financial metrics with intelligent caching
 * 
 * Features:
 * • Real-time financial KPI computation
 * • Smart caching with Redis
 * • Multi-period trend analysis
 * • AI-ready feature extraction
 * • Performance monitoring
 */
export class EnhancedFinancialMetricsService {
  private tenantId: string;
  private reportingEngine: ReportingEngine;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.reportingEngine = new ReportingEngine(tenantId);
  }

  /**
   * 📈 GET COMPREHENSIVE FINANCIAL METRICS
   * Main entry point for financial metrics with caching
   */
  async getFinancialMetrics(period: string = 'current_month'): Promise<FinancialMetrics> {
    console.log(`📊 Getting financial metrics for tenant ${this.tenantId}, period: ${period}`);
    
    // Try cache first
    const cachedMetrics = await redisCacheService.getFinancialMetrics(this.tenantId, period);
    if (cachedMetrics) {
      return cachedMetrics;
    }

    // Generate fresh metrics
    const startTime = Date.now();
    const metrics = await this.generateFinancialMetrics(period);
    const executionTime = Date.now() - startTime;

    // Cache for 5 minutes (300 seconds)
    await redisCacheService.cacheFinancialMetrics(this.tenantId, metrics, 300);
    
    console.log(`✅ Generated financial metrics in ${executionTime}ms`);
    return metrics;
  }

  /**
   * 🔄 GENERATE FRESH FINANCIAL METRICS
   * Compute metrics from database
   */
  private async generateFinancialMetrics(period: string): Promise<FinancialMetrics> {
    const dateRange = this.getPeriodDateRange(period);
    const { startDate, endDate } = dateRange;

    // Parallel data fetching for better performance
    const [
      revenueData,
      expenseData,
      customerData,
      invoiceData,
      cashFlowData,
      trendsData
    ] = await Promise.all([
      this.getRevenueMetrics(startDate, endDate),
      this.getExpenseMetrics(startDate, endDate),
      this.getCustomerMetrics(startDate, endDate),
      this.getInvoiceMetrics(startDate, endDate),
      this.getCashFlowMetrics(startDate, endDate),
      this.getTrendsData(startDate, endDate)
    ]);

    // Calculate derived metrics
    const netIncome = revenueData.totalRevenue - expenseData.totalExpenses;
    const grossProfit = revenueData.totalRevenue - expenseData.costOfGoodsSold;
    const profitMargin = revenueData.totalRevenue > 0 ? (netIncome / revenueData.totalRevenue) * 100 : 0;

    const metrics: FinancialMetrics = {
      tenantId: this.tenantId,
      period,
      totalRevenue: revenueData.totalRevenue,
      totalExpenses: expenseData.totalExpenses,
      netIncome,
      grossProfit,
      operatingExpenses: expenseData.operatingExpenses,
      cashFlow: cashFlowData.netCashFlow,
      averageInvoiceValue: invoiceData.averageValue,
      totalCustomers: customerData.total,
      activeCustomers: customerData.active,
      totalTransactions: await this.getTransactionCount(startDate, endDate),
      topExpenseCategories: expenseData.topCategories,
      monthlyTrend: trendsData,
      kpis: {
        profitMargin,
        revenueGrowth: await this.calculateRevenueGrowth(startDate, endDate),
        customerGrowth: await this.calculateCustomerGrowth(startDate, endDate),
        averagePaymentDays: invoiceData.averagePaymentDays,
        cashFlowRatio: cashFlowData.ratio
      },
      generatedAt: new Date().toISOString(),
      dataFreshness: 0 // Fresh data
    };

    return metrics;
  }

  /**
   * 💰 GET REVENUE METRICS
   */
  private async getRevenueMetrics(startDate: Date, endDate: Date) {
    const revenueAccounts = await prisma.account.findMany({
      where: {
        tenantId: this.tenantId,
        type: 'INCOME',
        isActive: true
      },
      include: {
        entries: {
          where: {
            postedAt: { gte: startDate, lte: endDate }
          }
        }
      }
    });

    const totalRevenue = revenueAccounts.reduce((sum, account) => {
      const accountRevenue = account.entries.reduce((entrySum, entry) => {
        return entrySum + (entry.type === 'CREDIT' ? 
          parseFloat(entry.amount.toString()) : 
          -parseFloat(entry.amount.toString()));
      }, 0);
      return sum + accountRevenue;
    }, 0);

    return { totalRevenue };
  }

  /**
   * 💸 GET EXPENSE METRICS
   */
  private async getExpenseMetrics(startDate: Date, endDate: Date) {
    const [expenseAccounts, expenses] = await Promise.all([
      prisma.account.findMany({
        where: {
          tenantId: this.tenantId,
          type: 'EXPENSE',
          isActive: true
        },
        include: {
          entries: {
            where: {
              postedAt: { gte: startDate, lte: endDate }
            }
          }
        }
      }),
      prisma.expense.findMany({
        where: {
          tenantId: this.tenantId,
          expenseDate: { gte: startDate, lte: endDate }
        },
        include: {
          expenseAccount: true
        }
      })
    ]);

    const totalExpenses = expenseAccounts.reduce((sum, account) => {
      const accountExpenses = account.entries.reduce((entrySum, entry) => {
        return entrySum + (entry.type === 'DEBIT' ? 
          parseFloat(entry.amount.toString()) : 
          -parseFloat(entry.amount.toString()));
      }, 0);
      return sum + accountExpenses;
    }, 0);

    // Calculate COGS
    const cogsAccounts = expenseAccounts.filter(acc => 
      acc.name.toLowerCase().includes('cost of goods') ||
      acc.name.toLowerCase().includes('cogs') ||
      acc.code.startsWith('50')
    );

    const costOfGoodsSold = cogsAccounts.reduce((sum, account) => {
      const accountCogs = account.entries.reduce((entrySum, entry) => {
        return entrySum + (entry.type === 'DEBIT' ? 
          parseFloat(entry.amount.toString()) : 
          -parseFloat(entry.amount.toString()));
      }, 0);
      return sum + accountCogs;
    }, 0);

    const operatingExpenses = totalExpenses - costOfGoodsSold;

    // Top expense categories
    const categoryTotals = new Map<string, number>();
    expenses.forEach(expense => {
      const category = expense.expenseAccount?.name || 'Other';
      const amount = parseFloat(expense.amount.toString());
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    });

    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalExpenses,
      costOfGoodsSold,
      operatingExpenses,
      topCategories
    };
  }

  /**
   * 👥 GET CUSTOMER METRICS
   */
  private async getCustomerMetrics(startDate: Date, endDate: Date) {
    const [totalCustomers, activeCustomers] = await Promise.all([
      prisma.customer.count({
        where: { tenantId: this.tenantId }
      }),
      prisma.customer.count({
        where: {
          tenantId: this.tenantId,
          invoices: {
            some: {
              issueDate: { gte: startDate, lte: endDate }
            }
          }
        }
      })
    ]);

    return {
      total: totalCustomers,
      active: activeCustomers
    };
  }

  /**
   * 📄 GET INVOICE METRICS
   */
  private async getInvoiceMetrics(startDate: Date, endDate: Date) {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: this.tenantId,
        issueDate: { gte: startDate, lte: endDate }
      },
      include: {
        payments: true
      }
    });

    const totalValue = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0);
    const averageValue = invoices.length > 0 ? totalValue / invoices.length : 0;

    // Calculate average payment days
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
    const paymentDays = paidInvoices.map(inv => {
      const firstPayment = inv.payments[0];
      if (!firstPayment) return 0;
      const daysDiff = Math.floor((firstPayment.paymentDate.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff;
    });

    const averagePaymentDays = paymentDays.length > 0 ? 
      paymentDays.reduce((sum, days) => sum + days, 0) / paymentDays.length : 0;

    return {
      averageValue,
      averagePaymentDays
    };
  }

  /**
   * 💰 GET CASH FLOW METRICS
   */
  private async getCashFlowMetrics(startDate: Date, endDate: Date) {
    // Simplified cash flow calculation
    const [paymentsReceived, paymentsOut] = await Promise.all([
      prisma.paymentReceived.aggregate({
        where: {
          tenantId: this.tenantId,
          paymentDate: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      }),
      prisma.vendorPayment.aggregate({
        where: {
          tenantId: this.tenantId,
          paymentDate: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      })
    ]);

    const cashIn = parseFloat(paymentsReceived._sum.amount?.toString() || '0');
    const cashOut = parseFloat(paymentsOut._sum.amount?.toString() || '0');
    const netCashFlow = cashIn - cashOut;
    const ratio = cashOut > 0 ? cashIn / cashOut : 0;

    return {
      netCashFlow,
      ratio
    };
  }

  /**
   * 📈 GET TRENDS DATA
   */
  private async getTrendsData(startDate: Date, endDate: Date) {
    // Get last 6 months of data for trends
    const sixMonthsAgo = new Date(startDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(startDate);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const [revenue, expenses] = await Promise.all([
        this.getMonthlyRevenue(monthStart, monthEnd),
        this.getMonthlyExpenses(monthStart, monthEnd)
      ]);

      monthlyData.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        revenue,
        expenses,
        profit: revenue - expenses
      });
    }

    return monthlyData;
  }

  /**
   * 📊 HELPER METHODS
   */
  private getPeriodDateRange(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'current_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_month':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth());
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'current_quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate.setMonth(quarterStart);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'current_year':
        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        // Default to current month
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  private async getTransactionCount(startDate: Date, endDate: Date): Promise<number> {
    return prisma.entry.count({
      where: {
        tenantId: this.tenantId,
        postedAt: { gte: startDate, lte: endDate }
      }
    });
  }

  private async getMonthlyRevenue(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.getRevenueMetrics(startDate, endDate);
    return result.totalRevenue;
  }

  private async getMonthlyExpenses(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.getExpenseMetrics(startDate, endDate);
    return result.totalExpenses;
  }

  private async calculateRevenueGrowth(startDate: Date, endDate: Date): Promise<number> {
    // Calculate revenue growth compared to previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const [currentRevenue, previousRevenue] = await Promise.all([
      this.getMonthlyRevenue(startDate, endDate),
      this.getMonthlyRevenue(prevStartDate, prevEndDate)
    ]);

    return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  }

  private async calculateCustomerGrowth(startDate: Date, endDate: Date): Promise<number> {
    // Simplified customer growth calculation
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);

    const [currentCustomers, previousCustomers] = await Promise.all([
      prisma.customer.count({
        where: {
          tenantId: this.tenantId,
          createdAt: { lte: endDate }
        }
      }),
      prisma.customer.count({
        where: {
          tenantId: this.tenantId,
          createdAt: { lte: prevStartDate }
        }
      })
    ]);

    return previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0;
  }

  /**
   * 🗑️ INVALIDATE CACHE
   * Force refresh of metrics
   */
  async invalidateCache(period?: string): Promise<void> {
    if (period) {
      await redisCacheService.invalidateTenantCache(this.tenantId, `*metrics*${period}*`);
    } else {
      await redisCacheService.invalidateTenantCache(this.tenantId, '*metrics*');
    }
    console.log(`🗑️ Invalidated metrics cache for tenant ${this.tenantId}`);
  }
}
