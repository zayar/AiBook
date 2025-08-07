import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { ChartOfAccountsEngine, AccountBalance } from './ChartOfAccountsEngine';
import { AccountType } from '@prisma/client';
import { FiscalYearService, FiscalPeriod } from '../../services/FiscalYearService';

export interface FinancialStatement {
  statement: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'TRIAL_BALANCE';
  period: {
    startDate: Date;
    endDate: Date;
  };
  data: any;
  totals: {
    [key: string]: number;
  };
  generatedAt: Date;
}

export interface BalanceSheetData {
  assets: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    total: number;
  };
  liabilities: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    total: number;
  };
  equity: {
    accounts: AccountBalance[];
    total: number;
  };
}

export interface IncomeStatementData {
  revenue: {
    accounts: AccountBalance[];
    total: number;
  };
  costOfGoodsSold: {
    accounts: AccountBalance[];
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    accounts: AccountBalance[];
    total: number;
  };
  netIncome: number;
}

/**
 * 📊 REPORTING ENGINE
 * 
 * Generates comprehensive financial reports including:
 * - Balance Sheet
 * - Income Statement (P&L)
 * - Cash Flow Statement
 * - Trial Balance
 * - Custom financial reports
 */
export class ReportingEngine {
  private tenantId: string;
  private chartEngine: ChartOfAccountsEngine;
  private fiscalYearService: FiscalYearService;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.chartEngine = new ChartOfAccountsEngine(tenantId);
    this.fiscalYearService = new FiscalYearService(tenantId);
  }

  /**
   * 🏛️ GENERATE BALANCE SHEET
   * Standard balance sheet with proper classifications
   */
  async generateBalanceSheet(asOfDate: Date = new Date()): Promise<FinancialStatement> {
    const accounts = await this.getAccountBalancesAsOf(asOfDate);
    
    const assets = accounts.filter(acc => this.getAccountCategory(acc.type) === 'ASSET');
    const liabilities = accounts.filter(acc => this.getAccountCategory(acc.type) === 'LIABILITY');
    const equity = accounts.filter(acc => this.getAccountCategory(acc.type) === 'EQUITY');

    // Classify current vs non-current assets/liabilities
    const currentAssets = assets.filter(acc => this.isCurrentAccount(acc.accountCode));
    const nonCurrentAssets = assets.filter(acc => !this.isCurrentAccount(acc.accountCode));
    
    const currentLiabilities = liabilities.filter(acc => this.isCurrentAccount(acc.accountCode));
    const nonCurrentLiabilities = liabilities.filter(acc => !this.isCurrentAccount(acc.accountCode));

    const data: BalanceSheetData = {
      assets: {
        current: currentAssets,
        nonCurrent: nonCurrentAssets,
        total: assets.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0)
      },
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        total: liabilities.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0)
      },
      equity: {
        accounts: equity,
        total: equity.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0)
      }
    };

    return {
      statement: 'BALANCE_SHEET',
      period: {
        startDate: asOfDate,
        endDate: asOfDate
      },
      data,
      totals: {
        totalAssets: data.assets.total,
        totalLiabilities: data.liabilities.total,
        totalEquity: data.equity.total,
        totalLiabilitiesAndEquity: data.liabilities.total + data.equity.total
      },
      generatedAt: new Date()
    };
  }

  /**
   * 📈 GENERATE INCOME STATEMENT
   * Profit & Loss statement with proper classifications
   */
  async generateIncomeStatement(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialStatement> {
    const accounts = await this.getAccountBalancesForPeriod(startDate, endDate);
    
    const revenue = accounts.filter(acc => this.getAccountCategory(acc.type) === 'INCOME');
    const expenses = accounts.filter(acc => this.getAccountCategory(acc.type) === 'EXPENSE');

    // Separate COGS from operating expenses
    const costOfGoodsSold = expenses.filter(acc => acc.accountCode.startsWith('5'));
    const operatingExpenses = expenses.filter(acc => !acc.accountCode.startsWith('5'));

    const revenueTotal = revenue.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0);
    const cogsTotal = costOfGoodsSold.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0);
    const opExpTotal = operatingExpenses.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0);

    const grossProfit = revenueTotal - cogsTotal;
    const netIncome = grossProfit - opExpTotal;

    const data: IncomeStatementData = {
      revenue: {
        accounts: revenue,
        total: revenueTotal
      },
      costOfGoodsSold: {
        accounts: costOfGoodsSold,
        total: cogsTotal
      },
      grossProfit,
      operatingExpenses: {
        accounts: operatingExpenses,
        total: opExpTotal
      },
      netIncome
    };

    return {
      statement: 'INCOME_STATEMENT',
      period: { startDate, endDate },
      data,
      totals: {
        totalRevenue: revenueTotal,
        totalCOGS: cogsTotal,
        grossProfit,
        totalOperatingExpenses: opExpTotal,
        netIncome
      },
      generatedAt: new Date()
    };
  }

  /**
   * 💰 GENERATE CASH FLOW STATEMENT
   * Statement of cash flows with operating, investing, financing activities
   */
  async generateCashFlowStatement(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialStatement> {
    // Get cash and cash equivalent accounts
    const cashAccounts = await this.getCashAccounts();
    
    // Get all cash transactions for the period
    const cashTransactions = await this.getCashTransactionsForPeriod(startDate, endDate);

    // Classify transactions into operating, investing, financing
    const operatingCashFlow = this.classifyOperatingCashFlow(cashTransactions);
    const investingCashFlow = this.classifyInvestingCashFlow(cashTransactions);
    const financingCashFlow = this.classifyFinancingCashFlow(cashTransactions);

    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    const data = {
      operatingActivities: {
        transactions: cashTransactions.filter(t => this.isOperatingActivity(t)),
        total: operatingCashFlow
      },
      investingActivities: {
        transactions: cashTransactions.filter(t => this.isInvestingActivity(t)),
        total: investingCashFlow
      },
      financingActivities: {
        transactions: cashTransactions.filter(t => this.isFinancingActivity(t)),
        total: financingCashFlow
      },
      netCashFlow,
      beginningCash: await this.getCashBalanceAsOf(startDate),
      endingCash: await this.getCashBalanceAsOf(endDate)
    };

    return {
      statement: 'CASH_FLOW',
      period: { startDate, endDate },
      data,
      totals: {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow
      },
      generatedAt: new Date()
    };
  }

  /**
   * ⚖️ GENERATE TRIAL BALANCE
   * Complete trial balance with all accounts
   */
  async generateTrialBalance(asOfDate: Date = new Date()): Promise<FinancialStatement> {
    const trialBalance = await this.chartEngine.getTrialBalance();

    return {
      statement: 'TRIAL_BALANCE',
      period: {
        startDate: asOfDate,
        endDate: asOfDate
      },
      data: trialBalance,
      totals: {
        totalDebits: trialBalance.totalDebits,
        totalCredits: trialBalance.totalCredits,
        isBalanced: trialBalance.isBalanced ? 1 : 0
      },
      generatedAt: new Date()
    };
  }

  /**
   * 📊 GENERATE FINANCIAL RATIOS
   * Calculate key financial ratios and metrics
   */
  async generateFinancialRatios(asOfDate: Date = new Date()): Promise<{
    liquidityRatios: {
      currentRatio: number;
      quickRatio: number;
      cashRatio: number;
    };
    profitabilityRatios: {
      grossProfitMargin: number;
      netProfitMargin: number;
      returnOnAssets: number;
      returnOnEquity: number;
    };
    debtRatios: {
      debtToAssets: number;
      debtToEquity: number;
      interestCoverage: number;
    };
  }> {
    const balanceSheet = await this.generateBalanceSheet(asOfDate);
    const startOfYear = new Date(asOfDate.getFullYear(), 0, 1);
    const incomeStatement = await this.generateIncomeStatement(startOfYear, asOfDate);

    const bsData = balanceSheet.data as BalanceSheetData;
    const isData = incomeStatement.data as IncomeStatementData;

    return {
      liquidityRatios: {
        currentRatio: this.calculateRatio(
          bsData.assets.current.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0),
          bsData.liabilities.current.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0)
        ),
        quickRatio: 0, // Would calculate quick assets
        cashRatio: 0   // Would calculate cash + marketable securities
      },
      profitabilityRatios: {
        grossProfitMargin: this.calculateRatio(isData.grossProfit, isData.revenue.total),
        netProfitMargin: this.calculateRatio(isData.netIncome, isData.revenue.total),
        returnOnAssets: this.calculateRatio(isData.netIncome, bsData.assets.total),
        returnOnEquity: this.calculateRatio(isData.netIncome, bsData.equity.total)
      },
      debtRatios: {
        debtToAssets: this.calculateRatio(bsData.liabilities.total, bsData.assets.total),
        debtToEquity: this.calculateRatio(bsData.liabilities.total, bsData.equity.total),
        interestCoverage: 0 // Would calculate EBIT / Interest Expense
      }
    };
  }

  // Helper methods

  private async getAccountBalancesAsOf(date: Date): Promise<(AccountBalance & { type: AccountType; name: string })[]> {
    const accounts = await prisma.account.findMany({
      where: { tenantId: this.tenantId, isActive: true }
    });

    const balances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.chartEngine.getAccountBalance(account.code);
        return {
          ...balance,
          type: account.type as AccountType,
          name: account.name
        };
      })
    );

    return balances;
  }

  private async getAccountBalancesForPeriod(startDate: Date, endDate: Date): Promise<(AccountBalance & { type: AccountType; name: string })[]> {
    // This would filter entries within the date range
    return this.getAccountBalancesAsOf(endDate);
  }

  private isCurrentAccount(accountCode: string): boolean {
    // Current assets: 1100-1199, Current liabilities: 2100-2199
    const code = parseInt(accountCode);
    return (code >= 1100 && code <= 1199) || (code >= 2100 && code <= 2199);
  }

  private async getCashAccounts(): Promise<any[]> {
    return await prisma.account.findMany({
      where: {
        tenantId: this.tenantId,
        code: { in: ['1111', '1112', '1113'] } // Cash accounts
      }
    });
  }

  private async getCashTransactionsForPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    // Get cash account IDs first
    const cashAccounts = await prisma.account.findMany({
      where: {
        tenantId: this.tenantId,
        code: { in: ['1111', '1112', '1113'] }
      },
      select: { id: true }
    });

    const cashAccountIds = cashAccounts.map(acc => acc.id);

    return await prisma.entry.findMany({
      where: {
        tenantId: this.tenantId,
        accountId: { in: cashAccountIds },
        postedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        account: { select: { name: true } }
      }
    });
  }

  private classifyOperatingCashFlow(transactions: any[]): number {
    // Operating activities from cash flows
    return transactions
      .filter(t => this.isOperatingActivity(t))
      .reduce((sum, t) => {
        return sum + (t.type === 'DEBIT' ? parseFloat(t.amount.toString()) : -parseFloat(t.amount.toString()));
      }, 0);
  }

  private classifyInvestingCashFlow(transactions: any[]): number {
    return 0; // Would implement investing activity classification
  }

  private classifyFinancingCashFlow(transactions: any[]): number {
    return 0; // Would implement financing activity classification
  }

  private isOperatingActivity(transaction: any): boolean {
    // Basic classification - would be more sophisticated
    return !this.isInvestingActivity(transaction) && !this.isFinancingActivity(transaction);
  }

  private isInvestingActivity(transaction: any): boolean {
    // Equipment, investments, etc.
    return false;
  }

  private isFinancingActivity(transaction: any): boolean {
    // Loans, equity, dividends, etc.
    return false;
  }

  private async getCashBalanceAsOf(date: Date): Promise<number> {
    const cashAccounts = ['1111', '1112', '1113'];
    let totalCash = 0;

    for (const accountCode of cashAccounts) {
      const balance = await this.chartEngine.getAccountBalance(accountCode);
      totalCash += balance.netBalance;
    }

    return totalCash;
  }

  private calculateRatio(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(4));
  }

  /**
   * 📅 GENERATE FISCAL YEAR INCOME STATEMENT
   * Income statement for the current or specified fiscal year
   */
  async generateFiscalYearIncomeStatement(fiscalYear?: number): Promise<FinancialStatement> {
    const targetFiscalYear = fiscalYear || await this.fiscalYearService.getFiscalYearForDate(new Date());
    const fiscalPeriod = await this.fiscalYearService.getFiscalYearPeriod(targetFiscalYear);
    
    return this.generateIncomeStatement(fiscalPeriod.startDate, fiscalPeriod.endDate);
  }

  /**
   * 📊 GENERATE QUARTERLY INCOME STATEMENT
   * Income statement for a specific fiscal quarter
   */
  async generateQuarterlyIncomeStatement(fiscalYear: number, quarter: number): Promise<FinancialStatement> {
    const quarters = await this.fiscalYearService.getFiscalQuarters(fiscalYear);
    const targetQuarter = quarters.find(q => q.quarter === quarter);
    
    if (!targetQuarter) {
      throw new Error(`Invalid quarter ${quarter} for fiscal year ${fiscalYear}`);
    }
    
    return this.generateIncomeStatement(targetQuarter.startDate, targetQuarter.endDate);
  }

  /**
   * 📈 GENERATE MONTHLY INCOME STATEMENT
   * Income statement for a specific fiscal month
   */
  async generateMonthlyIncomeStatement(fiscalYear: number, month: number): Promise<FinancialStatement> {
    const months = await this.fiscalYearService.getFiscalMonths(fiscalYear);
    const targetMonth = months.find(m => m.month === month);
    
    if (!targetMonth) {
      throw new Error(`Invalid month ${month} for fiscal year ${fiscalYear}`);
    }
    
    return this.generateIncomeStatement(targetMonth.startDate, targetMonth.endDate);
  }

  /**
   * 🔄 GENERATE COMPARATIVE INCOME STATEMENT
   * Compare current period with prior period using fiscal calendar
   */
  async generateComparativeIncomeStatement(
    startDate: Date,
    endDate: Date,
    periodType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM' = 'CUSTOM'
  ): Promise<{
    current: FinancialStatement;
    prior: FinancialStatement;
    variance: {
      revenue: { amount: number; percentage: number };
      expenses: { amount: number; percentage: number };
      netIncome: { amount: number; percentage: number };
    };
  }> {
    const currentPeriod = await this.fiscalYearService.createReportingPeriod(startDate, endDate, periodType);
    const priorPeriod = await this.fiscalYearService.getPriorPeriod(currentPeriod);
    
    const currentStatement = await this.generateIncomeStatement(currentPeriod.startDate, currentPeriod.endDate);
    const priorStatement = await this.generateIncomeStatement(priorPeriod.startDate, priorPeriod.endDate);
    
    // Calculate variances
    const currentData = currentStatement.data as IncomeStatementData;
    const priorData = priorStatement.data as IncomeStatementData;
    
    const variance = {
      revenue: this.calculateVariance(currentData.revenue.total, priorData.revenue.total),
      expenses: this.calculateVariance(currentData.operatingExpenses.total, priorData.operatingExpenses.total),
      netIncome: this.calculateVariance(currentData.netIncome, priorData.netIncome)
    };
    
    return {
      current: currentStatement,
      prior: priorStatement,
      variance
    };
  }

  /**
   * 📊 GET FISCAL YEAR SUMMARY
   * High-level financial summary for the fiscal year
   */
  async getFiscalYearSummary(fiscalYear?: number): Promise<{
    fiscalYear: number;
    period: FiscalPeriod;
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      grossProfit: number;
      netIncome: number;
      totalAssets: number;
      totalLiabilities: number;
      equity: number;
    };
  }> {
    const targetFiscalYear = fiscalYear || await this.fiscalYearService.getFiscalYearForDate(new Date());
    const fiscalPeriod = await this.fiscalYearService.getFiscalYearPeriod(targetFiscalYear);
    
    const incomeStatement = await this.generateIncomeStatement(fiscalPeriod.startDate, fiscalPeriod.endDate);
    const balanceSheet = await this.generateBalanceSheet(fiscalPeriod.endDate);
    
    const incomeData = incomeStatement.data as IncomeStatementData;
    const balanceData = balanceSheet.data as BalanceSheetData;
    
    return {
      fiscalYear: targetFiscalYear,
      period: fiscalPeriod,
      summary: {
        totalRevenue: incomeData.revenue.total,
        totalExpenses: incomeData.operatingExpenses.total + incomeData.costOfGoodsSold.total,
        grossProfit: incomeData.grossProfit,
        netIncome: incomeData.netIncome,
        totalAssets: balanceData.assets.total,
        totalLiabilities: balanceData.liabilities.total,
        equity: balanceData.equity.total
      }
    };
  }

  /**
   * 🎯 VALIDATE REPORTING PERIOD
   * Validates that the reporting period aligns with fiscal calendar
   */
  async validateReportingPeriod(startDate: Date, endDate: Date): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestedPeriod?: FiscalPeriod;
  }> {
    const validation = await this.fiscalYearService.validateFiscalPeriod(startDate, endDate);
    
    // Suggest fiscal-aligned period if dates don't align
    let suggestedPeriod: FiscalPeriod | undefined;
    
    const startFiscalYear = await this.fiscalYearService.getFiscalYearForDate(startDate);
    const endFiscalYear = await this.fiscalYearService.getFiscalYearForDate(endDate);
    
    if (startFiscalYear === endFiscalYear) {
      // Check if this aligns with a standard fiscal period
      const fiscalYear = await this.fiscalYearService.getFiscalYearPeriod(startFiscalYear);
      const quarters = await this.fiscalYearService.getFiscalQuarters(startFiscalYear);
      const months = await this.fiscalYearService.getFiscalMonths(startFiscalYear);
      
      // Check if it matches a quarter
      const matchingQuarter = quarters.find(q => 
        Math.abs(q.startDate.getTime() - startDate.getTime()) < 24 * 60 * 60 * 1000 &&
        Math.abs(q.endDate.getTime() - endDate.getTime()) < 24 * 60 * 60 * 1000
      );
      
      if (matchingQuarter) {
        suggestedPeriod = {
          fiscalYear: startFiscalYear,
          startDate: matchingQuarter.startDate,
          endDate: matchingQuarter.endDate,
          quarter: matchingQuarter.quarter,
          periodType: 'QUARTERLY'
        };
      }
      
      // Check if it matches a month
      if (!suggestedPeriod) {
        const matchingMonth = months.find(m => 
          Math.abs(m.startDate.getTime() - startDate.getTime()) < 24 * 60 * 60 * 1000 &&
          Math.abs(m.endDate.getTime() - endDate.getTime()) < 24 * 60 * 60 * 1000
        );
        
        if (matchingMonth) {
          suggestedPeriod = {
            fiscalYear: startFiscalYear,
            startDate: matchingMonth.startDate,
            endDate: matchingMonth.endDate,
            month: matchingMonth.month,
            periodType: 'MONTHLY'
          };
        }
      }
    }
    
    return {
      ...validation,
      suggestedPeriod
    };
  }

  /**
   * 🧮 CALCULATE VARIANCE
   * Helper method to calculate variance between periods
   */
  private calculateVariance(current: number, prior: number): { amount: number; percentage: number } {
    const amount = current - prior;
    const percentage = prior !== 0 ? (amount / prior) * 100 : 0;
    
    return {
      amount: Number(amount.toFixed(2)),
      percentage: Number(percentage.toFixed(2))
    };
  }

  /**
   * 🏷️ GET ACCOUNT CATEGORY
   * Helper method to map account sub-types to main categories
   */
  private getAccountCategory(type: string): string {
    const assetTypes = ['OTHER_ASSET', 'OTHER_CURRENT_ASSET', 'CASH', 'BANK', 'FIXED_ASSET', 'ACCOUNTS_RECEIVABLE', 'STOCK', 'PAYMENT_CLEARING_ACCOUNT', 'INPUT_TAX', 'INTANGIBLE_ASSET', 'NON_CURRENT_ASSET', 'DEFERRED_TAX_ASSET'];
    const liabilityTypes = ['OTHER_CURRENT_LIABILITY', 'CREDIT_CARD', 'NON_CURRENT_LIABILITY', 'OTHER_LIABILITY', 'ACCOUNTS_PAYABLE', 'OVERSEAS_TAX_PAYABLE', 'OUTPUT_TAX', 'DEFERRED_TAX_LIABILITY'];
    const equityTypes = ['EQUITY'];
    const incomeTypes = ['INCOME', 'OTHER_INCOME'];
    const expenseTypes = ['EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE'];

    if (assetTypes.includes(type)) return 'ASSET';
    if (liabilityTypes.includes(type)) return 'LIABILITY';
    if (equityTypes.includes(type)) return 'EQUITY';
    if (incomeTypes.includes(type)) return 'INCOME';
    if (expenseTypes.includes(type)) return 'EXPENSE';
    
    return type; // fallback
  }
} 