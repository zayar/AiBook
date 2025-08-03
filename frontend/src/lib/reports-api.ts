import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ReportParams {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  accountCode?: string;
  period?: 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'last_month' | 'last_quarter' | 'last_year' | 'custom';
  format?: 'json' | 'pdf' | 'csv' | 'excel';
  includeZeroBalances?: boolean;
  groupBy?: 'account' | 'date' | 'type';
}

export interface AccountTransaction {
  date: string;
  journalId: string;
  reference: string;
  memo: string;
  transactionType: 'DEBIT' | 'CREDIT';
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountSummary {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  transactionCount: number;
  transactions: AccountTransaction[];
}

export interface JournalEntry {
  journalId: string;
  date: string;
  reference: string;
  entries: {
    accountCode: string;
    accountName: string;
    accountType: string;
    memo: string;
    debit: number;
    credit: number;
    type: 'DEBIT' | 'CREDIT';
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  entryCount: number;
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebits: number;
  totalCredits: number;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

export class ReportsAPI {
  private static baseURL = API_BASE_URL;

  /**
   * Get reports menu structure
   */
  static async getReportsMenu() {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/menu`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching reports menu:', error);
      throw error;
    }
  }

  /**
   * Get General Ledger Report
   */
  static async getGeneralLedger(params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/general-ledger`, {
        params,
        headers: {
          'X-Tenant-ID': 'default'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching General Ledger:', error);
      throw error;
    }
  }

  /**
   * Get Account Transactions Report
   */
  static async getAccountTransactions(params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/account-transactions`, {
        params,
        headers: {
          'X-Tenant-ID': 'default'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Account Transactions:', error);
      throw error;
    }
  }

  /**
   * Get Journal Entries Report
   */
  static async getJournalReport(params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/journal-entries`, {
        params,
        headers: {
          'X-Tenant-ID': 'default'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Journal Report:', error);
      throw error;
    }
  }

  /**
   * Get Trial Balance Report
   */
  static async getTrialBalance(params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/trial-balance`, {
        params,
        headers: {
          'X-Tenant-ID': 'default'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Trial Balance:', error);
      throw error;
    }
  }

  /**
   * Get Cash Flow Statement
   */
  static async getCashFlow(params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/cash-flow`, {
        params,
        headers: {
          'X-Tenant-ID': 'default'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Cash Flow Statement:', error);
      throw error;
    }
  }

  /**
   * Get Profit & Loss Statement
   */
  static async getProfitLoss(params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/profit-loss`, {
        params,
        headers: {
          'X-Tenant-ID': 'default'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching Profit & Loss Statement:', error);
      throw error;
    }
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number, currency: string = 'MMK'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date for display
   */
  static formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get period display name
   */
  static getPeriodDisplayName(period: string): string {
    const periodNames: { [key: string]: string } = {
      'today': 'Today',
      'this_week': 'This Week',
      'this_month': 'This Month',
      'this_quarter': 'This Quarter',
      'this_year': 'This Year',
      'last_month': 'Last Month',
      'last_quarter': 'Last Quarter',
      'last_year': 'Last Year',
      'custom': 'Custom Period'
    };
    return periodNames[period] || period;
  }

  /**
   * Export report to PDF (placeholder)
   */
  static async exportToPDF(reportType: string, params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/${reportType}`, {
        params: { ...params, format: 'pdf' },
        headers: {
          'X-Tenant-ID': 'default'
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Export report to Excel (placeholder)
   */
  static async exportToExcel(reportType: string, params: ReportParams = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/reports-new/${reportType}`, {
        params: { ...params, format: 'excel' },
        headers: {
          'X-Tenant-ID': 'default'
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      throw error;
    }
  }
}