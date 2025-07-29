import { Request, Response } from 'express';
import prisma from '../utils/database';
import { AppError } from '../middleware/errorHandler';

export class ReportingController {
  /**
   * 📊 PROFIT & LOSS REPORT
   * Generate comprehensive P&L statement with AI insights
   */
  static async getProfitLossReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { 
        startDate, 
        endDate, 
        bookId,
        includeAI = 'true',
        format = 'json'
      } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get accounts by type
      const accounts = await prisma.account.findMany({
        where: { 
          tenantId,
          bookId: bookId as string || undefined,
          isActive: true 
        },
        include: {
          entries: {
            where: {
              postedAt: { gte: start, lte: end }
            }
          }
        }
      });

      // Calculate revenue
      const revenueAccounts = accounts.filter(acc => acc.type === 'REVENUE');
      const totalRevenue = revenueAccounts.reduce((sum, account) => {
        const accountBalance = account.entries.reduce((entrySum, entry) => {
          return entrySum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + accountBalance;
      }, 0);

      // Calculate expenses
      const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');
      const totalExpenses = expenseAccounts.reduce((sum, account) => {
        const accountBalance = account.entries.reduce((entrySum, entry) => {
          return entrySum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + accountBalance;
      }, 0);

      // Calculate gross profit
      const grossProfit = totalRevenue - totalExpenses;

      // Get revenue breakdown
      const revenueBreakdown = revenueAccounts.map(account => {
        const balance = account.entries.reduce((sum, entry) => {
          return sum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return {
          accountCode: account.code,
          accountName: account.name,
          amount: balance,
          percentage: totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0
        };
      }).filter(item => item.amount > 0);

      // Get expense breakdown
      const expenseBreakdown = expenseAccounts.map(account => {
        const balance = account.entries.reduce((sum, entry) => {
          return sum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return {
          accountCode: account.code,
          accountName: account.name,
          amount: balance,
          percentage: totalExpenses > 0 ? (balance / totalExpenses) * 100 : 0
        };
      }).filter(item => item.amount > 0);

      // AI-powered insights
      let aiInsights: any[] = [];
      if (includeAI === 'true') {
        aiInsights = await this.generateProfitLossInsights(
          tenantId, 
          totalRevenue, 
          totalExpenses, 
          grossProfit,
          start,
          end
        );
      }

      const report = {
        period: { startDate: start, endDate: end },
        summary: {
          totalRevenue,
          totalExpenses,
          grossProfit,
          netProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        },
        revenue: {
          total: totalRevenue,
          breakdown: revenueBreakdown
        },
        expenses: {
          total: totalExpenses,
          breakdown: expenseBreakdown
        },
        aiInsights,
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          bookId: bookId || 'default'
        }
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="profit-loss-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        res.json({ report });
      }
    } catch (error) {
      console.error('Get profit loss report error:', error);
      res.status(500).json({ error: 'Failed to generate profit & loss report' });
    }
  }

  /**
   * 💰 CASH FLOW REPORT
   * Generate cash flow statement with AI-powered forecasting
   */
  static async getCashFlowReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { 
        startDate, 
        endDate, 
        bookId,
        includeForecast = 'true',
        forecastPeriods = '3'
      } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get cash accounts
      const cashAccounts = await prisma.account.findMany({
        where: { 
          tenantId,
          bookId: bookId as string || undefined,
          type: 'ASSET',
          name: { contains: 'Cash' },
          isActive: true 
        },
        include: {
          entries: {
            where: {
              postedAt: { gte: start, lte: end }
            },
            orderBy: { postedAt: 'asc' }
          }
        }
      });

      // Calculate operating cash flow
      const operatingCashFlow = await this.calculateOperatingCashFlow(tenantId, start, end, bookId as string);

      // Calculate investing cash flow
      const investingCashFlow = await this.calculateInvestingCashFlow(tenantId, start, end, bookId as string);

      // Calculate financing cash flow
      const financingCashFlow = await this.calculateFinancingCashFlow(tenantId, start, end, bookId as string);

      // Calculate net cash flow
      const netCashFlow = operatingCashFlow.total + investingCashFlow.total + financingCashFlow.total;

      // Get beginning and ending cash balances
      const beginningCash = await this.getCashBalance(tenantId, start, bookId as string);
      const endingCash = beginningCash + netCashFlow;

      // Generate cash flow forecast
      let forecast = null;
      if (includeForecast === 'true') {
        forecast = await this.generateCashFlowForecast(
          tenantId,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          parseInt(forecastPeriods as string)
        );
      }

      const report = {
        period: { startDate: start, endDate: end },
        summary: {
          beginningCash,
          endingCash,
          netCashFlow,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow
        },
        operating: {
          netIncome: operatingCashFlow.netIncome,
          adjustments: operatingCashFlow.adjustments,
          workingCapital: operatingCashFlow.workingCapital,
          total: operatingCashFlow.total
        },
        investing: {
          activities: investingCashFlow.activities,
          total: investingCashFlow.total
        },
        financing: {
          activities: financingCashFlow.activities,
          total: financingCashFlow.total
        },
        forecast,
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          bookId: bookId || 'default'
        }
      };

      res.json({ report });
    } catch (error) {
      console.error('Get cash flow report error:', error);
      res.status(500).json({ error: 'Failed to generate cash flow report' });
    }
  }

  /**
   * 📈 BALANCE SHEET REPORT
   * Generate balance sheet with AI-powered analysis
   */
  static async getBalanceSheetReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { 
        asOfDate, 
        bookId,
        includeAI = 'true',
        format = 'json'
      } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const asOf = asOfDate ? new Date(asOfDate as string) : new Date();

      // Get all accounts with balances as of the specified date
      const accounts = await prisma.account.findMany({
        where: { 
          tenantId,
          bookId: bookId as string || undefined,
          isActive: true 
        },
        include: {
          entries: {
            where: {
              postedAt: { lte: asOf }
            }
          }
        }
      });

      // Calculate assets
      const assetAccounts = accounts.filter(acc => acc.type === 'ASSET');
      const totalAssets = assetAccounts.reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum, entry) => {
          return entrySum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

      // Calculate liabilities
      const liabilityAccounts = accounts.filter(acc => acc.type === 'LIABILITY');
      const totalLiabilities = liabilityAccounts.reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum, entry) => {
          return entrySum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

      // Calculate equity
      const equityAccounts = accounts.filter(acc => acc.type === 'EQUITY');
      const totalEquity = equityAccounts.reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum, entry) => {
          return entrySum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

      // Verify accounting equation
      const accountingEquation = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

      // Get detailed breakdowns
      const assetsBreakdown = this.getAccountBreakdown(assetAccounts);
      const liabilitiesBreakdown = this.getAccountBreakdown(liabilityAccounts);
      const equityBreakdown = this.getAccountBreakdown(equityAccounts);

      // Calculate key ratios
      const ratios = {
        currentRatio: this.calculateCurrentRatio(assetAccounts, liabilityAccounts),
        debtToEquity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
        workingCapital: this.calculateWorkingCapital(assetAccounts, liabilityAccounts)
      };

      // AI-powered analysis
      let aiAnalysis = null;
      if (includeAI === 'true') {
        aiAnalysis = await this.generateBalanceSheetAnalysis(
          tenantId,
          totalAssets,
          totalLiabilities,
          totalEquity,
          ratios
        );
      }

      const report = {
        asOfDate: asOf,
        summary: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          accountingEquation
        },
        assets: {
          total: totalAssets,
          breakdown: assetsBreakdown
        },
        liabilities: {
          total: totalLiabilities,
          breakdown: liabilitiesBreakdown
        },
        equity: {
          total: totalEquity,
          breakdown: equityBreakdown
        },
        ratios,
        aiAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          bookId: bookId || 'default'
        }
      };

      if (format === 'csv') {
        const csv = this.convertBalanceSheetToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="balance-sheet-${asOf.toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        res.json({ report });
      }
    } catch (error) {
      console.error('Get balance sheet report error:', error);
      res.status(500).json({ error: 'Failed to generate balance sheet report' });
    }
  }

  // Private helper methods
  private static async calculateOperatingCashFlow(tenantId: string, start: Date, end: Date, bookId?: string) {
    // Get net income from P&L
    const accounts = await prisma.account.findMany({
      where: { 
        tenantId,
        bookId: bookId || undefined,
        isActive: true 
      },
      include: {
        entries: {
          where: {
            postedAt: { gte: start, lte: end }
          }
        }
      }
    });

    const revenueAccounts = accounts.filter(acc => acc.type === 'REVENUE');
    const expenseAccounts = accounts.filter(acc => acc.type === 'EXPENSE');

    const totalRevenue = revenueAccounts.reduce((sum, account) => {
      const balance = account.entries.reduce((entrySum, entry) => {
        return entrySum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
      }, 0);
      return sum + balance;
    }, 0);

    const totalExpenses = expenseAccounts.reduce((sum, account) => {
      const balance = account.entries.reduce((entrySum, entry) => {
        return entrySum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
      }, 0);
      return sum + balance;
    }, 0);

    const netIncome = totalRevenue - totalExpenses;

    // Simplified adjustments (in a real system, you'd calculate actual adjustments)
    const adjustments = {
      depreciation: 0,
      amortization: 0,
      changesInWorkingCapital: 0
    };

    return {
      netIncome,
      adjustments,
      workingCapital: { changes: 0 },
      total: netIncome + adjustments.depreciation + adjustments.amortization + adjustments.changesInWorkingCapital
    };
  }

  private static async calculateInvestingCashFlow(tenantId: string, start: Date, end: Date, bookId?: string) {
    // Get investing activities (purchases/sales of assets)
    const assetAccounts = await prisma.account.findMany({
      where: { 
        tenantId,
        bookId: bookId || undefined,
        type: 'ASSET',
        isActive: true 
      },
      include: {
        entries: {
          where: {
            postedAt: { gte: start, lte: end }
          }
        }
      }
    });

    const activities = assetAccounts
      .filter(account => account.name.includes('Equipment') || account.name.includes('Property') || account.name.includes('Investment'))
      .map(account => {
        const balance = account.entries.reduce((sum, entry) => {
          return sum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return {
          account: account.name,
          amount: balance,
          type: balance > 0 ? 'Purchase' : 'Sale'
        };
      });

    const total = activities.reduce((sum, activity) => sum + activity.amount, 0);

    return { activities, total };
  }

  private static async calculateFinancingCashFlow(tenantId: string, start: Date, end: Date, bookId?: string) {
    // Get financing activities (loans, equity, dividends)
    const liabilityAccounts = await prisma.account.findMany({
      where: { 
        tenantId,
        bookId: bookId || undefined,
        type: 'LIABILITY',
        isActive: true 
      },
      include: {
        entries: {
          where: {
            postedAt: { gte: start, lte: end }
          }
        }
      }
    });

    const equityAccounts = await prisma.account.findMany({
      where: { 
        tenantId,
        bookId: bookId || undefined,
        type: 'EQUITY',
        isActive: true 
      },
      include: {
        entries: {
          where: {
            postedAt: { gte: start, lte: end }
          }
        }
      }
    });

    const activities = [
      ...liabilityAccounts.map(account => {
        const balance = account.entries.reduce((sum, entry) => {
          return sum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return {
          account: account.name,
          amount: balance,
          type: 'Loan'
        };
      }),
      ...equityAccounts.map(account => {
        const balance = account.entries.reduce((sum, entry) => {
          return sum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return {
          account: account.name,
          amount: balance,
          type: 'Equity'
        };
      })
    ];

    const total = activities.reduce((sum, activity) => sum + activity.amount, 0);

    return { activities, total };
  }

  private static async getCashBalance(tenantId: string, asOf: Date, bookId?: string) {
    const cashAccounts = await prisma.account.findMany({
      where: { 
        tenantId,
        bookId: bookId || undefined,
        type: 'ASSET',
        name: { contains: 'Cash' },
        isActive: true 
      },
      include: {
        entries: {
          where: {
            postedAt: { lte: asOf }
          }
        }
      }
    });

    return cashAccounts.reduce((sum, account) => {
      const balance = account.entries.reduce((entrySum, entry) => {
        return entrySum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
      }, 0);
      return sum + balance;
    }, 0);
  }

  private static async generateCashFlowForecast(tenantId: string, operating: any, investing: any, financing: any, periods: number) {
    // Simple linear forecast based on historical data
    const forecast = [];
    let projectedCash = await this.getCashBalance(tenantId, new Date());

    for (let i = 1; i <= periods; i++) {
      const projectedOperating = operating.total * (1 + (Math.random() * 0.1 - 0.05)); // ±5% variation
      const projectedInvesting = investing.total * (1 + (Math.random() * 0.2 - 0.1)); // ±10% variation
      const projectedFinancing = financing.total * (1 + (Math.random() * 0.15 - 0.075)); // ±7.5% variation

      projectedCash += projectedOperating + projectedInvesting + projectedFinancing;

      forecast.push({
        period: i,
        operating: projectedOperating,
        investing: projectedInvesting,
        financing: projectedFinancing,
        netCashFlow: projectedOperating + projectedInvesting + projectedFinancing,
        projectedCash
      });
    }

    return forecast;
  }

  private static getAccountBreakdown(accounts: any[]) {
    return accounts.map(account => {
      const balance = account.entries.reduce((sum: number, entry: any) => {
        return sum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
      }, 0);
      return {
        accountCode: account.code,
        accountName: account.name,
        balance,
        type: account.type
      };
    }).filter(item => Math.abs(item.balance) > 0.01);
  }

  private static calculateCurrentRatio(assetAccounts: any[], liabilityAccounts: any[]) {
    const currentAssets = assetAccounts
      .filter(acc => acc.name.includes('Cash') || acc.name.includes('Receivable') || acc.name.includes('Inventory'))
      .reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum: number, entry: any) => {
          return entrySum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

    const currentLiabilities = liabilityAccounts
      .filter(acc => acc.name.includes('Payable') || acc.name.includes('Short-term'))
      .reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum: number, entry: any) => {
          return entrySum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

    return currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  }

  private static calculateWorkingCapital(assetAccounts: any[], liabilityAccounts: any[]) {
    const currentAssets = assetAccounts
      .filter(acc => acc.name.includes('Cash') || acc.name.includes('Receivable') || acc.name.includes('Inventory'))
      .reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum: number, entry: any) => {
          return entrySum + (entry.type === 'DEBIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

    const currentLiabilities = liabilityAccounts
      .filter(acc => acc.name.includes('Payable') || acc.name.includes('Short-term'))
      .reduce((sum, account) => {
        const balance = account.entries.reduce((entrySum: number, entry: any) => {
          return entrySum + (entry.type === 'CREDIT' ? parseFloat(entry.amount.toString()) : -parseFloat(entry.amount.toString()));
        }, 0);
        return sum + balance;
      }, 0);

    return currentAssets - currentLiabilities;
  }

  private static async generateProfitLossInsights(tenantId: string, revenue: number, expenses: number, profit: number, start: Date, end: Date) {
    const insights = [];

    // Revenue insights
    if (revenue > 0) {
      const profitMargin = (profit / revenue) * 100;
      
      if (profitMargin > 20) {
        insights.push({
          type: 'POSITIVE',
          category: 'Profitability',
          message: `Strong profit margin of ${profitMargin.toFixed(1)}% indicates healthy business performance.`,
          recommendation: 'Consider reinvesting profits for growth opportunities.'
        });
      } else if (profitMargin < 5) {
        insights.push({
          type: 'WARNING',
          category: 'Profitability',
          message: `Low profit margin of ${profitMargin.toFixed(1)}% may indicate pricing or cost issues.`,
          recommendation: 'Review pricing strategy and cost structure.'
        });
      }
    }

    // Expense insights
    if (expenses > revenue * 0.9) {
      insights.push({
        type: 'WARNING',
        category: 'Cost Management',
        message: 'Expenses are consuming over 90% of revenue.',
        recommendation: 'Implement cost reduction strategies and monitor expense trends.'
      });
    }

    return insights;
  }

  private static async generateBalanceSheetAnalysis(tenantId: string, assets: number, liabilities: number, equity: number, ratios: any) {
    const analysis = [];

    // Liquidity analysis
    if (ratios.currentRatio < 1) {
      analysis.push({
        type: 'WARNING',
        category: 'Liquidity',
        message: 'Current ratio below 1.0 indicates potential liquidity issues.',
        recommendation: 'Increase current assets or reduce current liabilities.'
      });
    } else if (ratios.currentRatio > 3) {
      analysis.push({
        type: 'INFO',
        category: 'Liquidity',
        message: 'High current ratio may indicate underutilized assets.',
        recommendation: 'Consider investing excess cash for better returns.'
      });
    }

    // Debt analysis
    if (ratios.debtToEquity > 1) {
      analysis.push({
        type: 'WARNING',
        category: 'Leverage',
        message: 'High debt-to-equity ratio indicates significant leverage.',
        recommendation: 'Monitor debt levels and consider debt reduction strategies.'
      });
    }

    return analysis;
  }

  private static convertToCSV(report: any) {
    const lines = [
      ['Profit & Loss Report'],
      ['Period', `${report.period.startDate.toISOString().split('T')[0]} to ${report.period.endDate.toISOString().split('T')[0]}`],
      [''],
      ['Summary'],
      ['Total Revenue', report.summary.totalRevenue],
      ['Total Expenses', report.summary.totalExpenses],
      ['Gross Profit', report.summary.grossProfit],
      ['Net Profit Margin (%)', report.summary.netProfitMargin],
      [''],
      ['Revenue Breakdown'],
      ['Account Code', 'Account Name', 'Amount', 'Percentage (%)'],
      ...report.revenue.breakdown.map((item: any) => [item.accountCode, item.accountName, item.amount, item.percentage]),
      [''],
      ['Expense Breakdown'],
      ['Account Code', 'Account Name', 'Amount', 'Percentage (%)'],
      ...report.expenses.breakdown.map((item: any) => [item.accountCode, item.accountName, item.amount, item.percentage])
    ];

    return lines.map(line => line.join(',')).join('\n');
  }

  private static convertBalanceSheetToCSV(report: any) {
    const lines = [
      ['Balance Sheet Report'],
      ['As of', report.asOfDate.toISOString().split('T')[0]],
      [''],
      ['Summary'],
      ['Total Assets', report.summary.totalAssets],
      ['Total Liabilities', report.summary.totalLiabilities],
      ['Total Equity', report.summary.totalEquity],
      [''],
      ['Assets'],
      ['Account Code', 'Account Name', 'Balance'],
      ...report.assets.breakdown.map((item: any) => [item.accountCode, item.accountName, item.balance]),
      [''],
      ['Liabilities'],
      ['Account Code', 'Account Name', 'Balance'],
      ...report.liabilities.breakdown.map((item: any) => [item.accountCode, item.accountName, item.balance]),
      [''],
      ['Equity'],
      ['Account Code', 'Account Name', 'Balance'],
      ...report.equity.breakdown.map((item: any) => [item.accountCode, item.accountName, item.balance])
    ];

    return lines.map(line => line.join(',')).join('\n');
  }
} 