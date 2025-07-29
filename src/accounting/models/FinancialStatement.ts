/**
 * 📊 FINANCIAL STATEMENT MODELS
 * Models for financial reports and statements
 */

export interface FinancialStatement {
  id: string;
  statementType: StatementType;
  period: ReportingPeriod;
  data: any;
  totals: Record<string, number>;
  generatedAt: Date;
  generatedBy: string;
  tenantId: string;
}

export type StatementType = 
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW'
  | 'TRIAL_BALANCE'
  | 'GENERAL_LEDGER'
  | 'ACCOUNTS_RECEIVABLE_AGING'
  | 'ACCOUNTS_PAYABLE_AGING'
  | 'PROFIT_LOSS';

export interface ReportingPeriod {
  startDate: Date;
  endDate: Date;
  periodType: PeriodType;
  fiscalYear: number;
  fiscalQuarter?: number;
  fiscalMonth?: number;
}

export type PeriodType = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'
  | 'CUSTOM';

/**
 * 🏛️ BALANCE SHEET
 */
export interface BalanceSheet extends FinancialStatement {
  statementType: 'BALANCE_SHEET';
  data: BalanceSheetData;
}

export interface BalanceSheetData {
  assets: {
    current: BalanceSheetLineItem[];
    nonCurrent: BalanceSheetLineItem[];
    total: number;
  };
  liabilities: {
    current: BalanceSheetLineItem[];
    nonCurrent: BalanceSheetLineItem[];
    total: number;
  };
  equity: {
    items: BalanceSheetLineItem[];
    total: number;
  };
  isBalanced: boolean;
}

export interface BalanceSheetLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
  percentage: number;
  priorPeriodAmount?: number;
  variance?: number;
  variancePercentage?: number;
}

/**
 * 📈 INCOME STATEMENT
 */
export interface IncomeStatement extends FinancialStatement {
  statementType: 'INCOME_STATEMENT';
  data: IncomeStatementData;
}

export interface IncomeStatementData {
  revenue: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  costOfGoodsSold: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  otherExpenses: {
    items: IncomeStatementLineItem[];
    total: number;
  };
  netIncome: number;
  netMargin: number;
}

export interface IncomeStatementLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
  percentage: number;
  priorPeriodAmount?: number;
  variance?: number;
  variancePercentage?: number;
}

/**
 * 💰 CASH FLOW STATEMENT
 */
export interface CashFlowStatement extends FinancialStatement {
  statementType: 'CASH_FLOW';
  data: CashFlowData;
}

export interface CashFlowData {
  operatingActivities: {
    items: CashFlowLineItem[];
    total: number;
  };
  investingActivities: {
    items: CashFlowLineItem[];
    total: number;
  };
  financingActivities: {
    items: CashFlowLineItem[];
    total: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

export interface CashFlowLineItem {
  description: string;
  amount: number;
  category: 'OPERATING' | 'INVESTING' | 'FINANCING';
}

/**
 * ⚖️ TRIAL BALANCE
 */
export interface TrialBalance extends FinancialStatement {
  statementType: 'TRIAL_BALANCE';
  data: TrialBalanceData;
}

export interface TrialBalanceData {
  accounts: TrialBalanceLineItem[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  variance: number;
}

export interface TrialBalanceLineItem {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

/**
 * 👥 AGING REPORTS
 */
export interface AgingReport extends FinancialStatement {
  statementType: 'ACCOUNTS_RECEIVABLE_AGING' | 'ACCOUNTS_PAYABLE_AGING';
  data: AgingReportData;
}

export interface AgingReportData {
  summary: AgingSummary;
  details: AgingDetailItem[];
  agingBuckets: AgingBucket[];
}

export interface AgingSummary {
  totalAmount: number;
  totalCount: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90Days: number;
}

export interface AgingDetailItem {
  entityId: string;
  entityName: string;
  documentNumber: string;
  documentDate: Date;
  dueDate: Date;
  amount: number;
  daysPastDue: number;
  agingBucket: string;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * 📊 FINANCIAL RATIOS
 */
export interface FinancialRatios {
  liquidityRatios: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };
  profitabilityRatios: {
    grossProfitMargin: number;
    operatingMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };
  debtRatios: {
    debtToAssets: number;
    debtToEquity: number;
    interestCoverage: number;
    debtServiceCoverage: number;
  };
  efficiencyRatios: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    daysSalesOutstanding: number;
    daysPayableOutstanding: number;
  };
}

/**
 * 🎯 FINANCIAL STATEMENT UTILITIES
 */
export class FinancialStatementUtils {
  /**
   * Calculate percentage of total
   */
  static calculatePercentage(amount: number, total: number): number {
    if (total === 0) return 0;
    return Number(((amount / total) * 100).toFixed(2));
  }

  /**
   * Calculate variance between periods
   */
  static calculateVariance(current: number, prior: number): {
    variance: number;
    variancePercentage: number;
  } {
    const variance = current - prior;
    const variancePercentage = prior !== 0 ? (variance / prior) * 100 : 0;
    
    return {
      variance: Number(variance.toFixed(2)),
      variancePercentage: Number(variancePercentage.toFixed(2))
    };
  }

  /**
   * Determine aging bucket for a date
   */
  static getAgingBucket(daysPastDue: number): string {
    if (daysPastDue <= 0) return 'Current';
    if (daysPastDue <= 30) return '1-30 Days';
    if (daysPastDue <= 60) return '31-60 Days';
    if (daysPastDue <= 90) return '61-90 Days';
    return 'Over 90 Days';
  }

  /**
   * Format financial statement data for display
   */
  static formatAmount(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Generate period description
   */
  static getPeriodDescription(period: ReportingPeriod): string {
    const startMonth = period.startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = period.endDate.toLocaleDateString('en-US', { month: 'short' });
    const year = period.endDate.getFullYear();

    switch (period.periodType) {
      case 'MONTHLY':
        return `${endMonth} ${year}`;
      case 'QUARTERLY':
        return `Q${period.fiscalQuarter} ${year}`;
      case 'YEARLY':
        return `FY ${year}`;
      default:
        return `${startMonth} - ${endMonth} ${year}`;
    }
  }
} 