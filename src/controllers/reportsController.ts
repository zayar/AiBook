import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const ReportDateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.string().optional(),
  accountCode: z.string().optional(),
  period: z.enum(['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'last_month', 'last_quarter', 'last_year', 'custom']).optional(),
  format: z.enum(['json', 'pdf', 'csv', 'excel']).default('json'),
  includeZeroBalances: z.string().optional().transform(val => val === 'true'),
  groupBy: z.enum(['account', 'date', 'type']).optional()
});

/**
 * 📊 FINANCIAL REPORTS CONTROLLER
 * Comprehensive reporting module for all accounting reports
 */
export class ReportsController {
  
  /**
   * 📈 GENERAL LEDGER REPORT
   * GET /api/v1/reports/general-ledger
   */
  static async getGeneralLedger(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params = ReportDateRangeSchema.parse(req.query);
      
      const { startDate, endDate, includeZeroBalances } = params;
      
      // Build date filter
      const dateFilter = ReportsController.buildDateFilter(startDate, endDate);
      
      // Get all accounts with their balances and transactions
      const accounts = await prisma.account.findMany({
        where: {
          tenantId,
          isActive: true
        },
        include: {
          entries: {
            where: dateFilter,
            orderBy: { postedAt: 'asc' },

          }
        },
        orderBy: [
          { code: 'asc' }
        ]
      });

      // Calculate running balances and prepare report data
      const generalLedgerData = accounts.map(account => {
        let runningBalance = 0;
        const transactions = account.entries.map((entry: any) => {
          const amount = parseFloat(entry.amount.toString());
          
          // Adjust balance based on account type and entry type
          if (ReportsController.isDebitAccount(account.type)) {
            runningBalance += entry.type === 'DEBIT' ? amount : -amount;
          } else {
            runningBalance += entry.type === 'CREDIT' ? amount : -amount;
          }

          return {
            date: entry.postedAt,
            journalId: entry.journalId,
            reference: entry.reference,
            memo: entry.memo,
            debit: entry.type === 'DEBIT' ? amount : 0,
            credit: entry.type === 'CREDIT' ? amount : 0,
            balance: runningBalance
          };
        });

        const totalDebits = transactions.reduce((sum: number, t: any) => sum + t.debit, 0);
        const totalCredits = transactions.reduce((sum: number, t: any) => sum + t.credit, 0);
        const netBalance = runningBalance;

        return {
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          openingBalance: 0, // Can be calculated based on previous period
          totalDebits,
          totalCredits,
          netBalance,
          transactions,
          transactionCount: transactions.length
        };
      }).filter(account => includeZeroBalances || account.netBalance !== 0 || account.transactionCount > 0);

      const summary = {
        totalAccounts: generalLedgerData.length,
        totalDebits: generalLedgerData.reduce((sum, acc) => sum + acc.totalDebits, 0),
        totalCredits: generalLedgerData.reduce((sum, acc) => sum + acc.totalCredits, 0),
        reportDate: new Date(),
        dateRange: { startDate, endDate }
      };

      res.json({
        success: true,
        report: 'General Ledger',
        summary,
        accounts: generalLedgerData,
        metadata: {
          generatedAt: new Date(),
          tenantId,
          parameters: params
        }
      });

    } catch (error) {
      console.error('Error generating General Ledger:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate General Ledger report' 
      });
    }
  }

  /**
   * 📋 ACCOUNT TRANSACTIONS REPORT
   * GET /api/v1/reports/account-transactions
   */
  static async getAccountTransactions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params = ReportDateRangeSchema.parse(req.query);
      
      const { startDate, endDate, accountId, accountCode } = params;
      
      // Build filters
      const dateFilter = ReportsController.buildDateFilter(startDate, endDate);
      
      let accountFilter: any = { tenantId, isActive: true };
      if (accountId) accountFilter.id = accountId;
      if (accountCode) accountFilter.code = accountCode;

      // Get account(s) with transactions
      const accounts = await prisma.account.findMany({
        where: accountFilter,
        include: {
          entries: {
            where: dateFilter,
            orderBy: { postedAt: 'asc' },

          }
        },
        orderBy: { code: 'asc' }
      });

      const accountTransactions = accounts.map(account => {
        let runningBalance = 0;
        
        const transactions = account.entries.map((entry: any) => {
          const amount = parseFloat(entry.amount.toString());
          
          // Calculate running balance
          if (ReportsController.isDebitAccount(account.type)) {
            runningBalance += entry.type === 'DEBIT' ? amount : -amount;
          } else {
            runningBalance += entry.type === 'CREDIT' ? amount : -amount;
          }

          return {
            date: entry.postedAt,
            journalId: entry.journalId,
            reference: entry.reference,
            memo: entry.memo,
            transactionType: entry.type,
            debit: entry.type === 'DEBIT' ? amount : 0,
            credit: entry.type === 'CREDIT' ? amount : 0,
            balance: runningBalance
          };
        });

        return {
          account: {
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type
          },
          openingBalance: 0,
          closingBalance: runningBalance,
          totalDebits: transactions.reduce((sum: number, t: any) => sum + t.debit, 0),
          totalCredits: transactions.reduce((sum: number, t: any) => sum + t.credit, 0),
          transactionCount: transactions.length,
          transactions
        };
      });

      res.json({
        success: true,
        report: 'Account Transactions',
        accounts: accountTransactions,
        summary: {
          accountCount: accountTransactions.length,
          totalTransactions: accountTransactions.reduce((sum, acc) => sum + acc.transactionCount, 0),
          dateRange: { startDate, endDate }
        },
        metadata: {
          generatedAt: new Date(),
          tenantId,
          parameters: params
        }
      });

    } catch (error) {
      console.error('Error generating Account Transactions report:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate Account Transactions report' 
      });
    }
  }

  /**
   * 📖 JOURNAL REPORT
   * GET /api/v1/reports/journal-entries
   */
  static async getJournalReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params = ReportDateRangeSchema.parse(req.query);
      
      const { startDate, endDate } = params;
      const dateFilter = ReportsController.buildDateFilter(startDate, endDate);

      // Get all journal entries with their details
      const entries = await prisma.entry.findMany({
        where: {
          tenantId,
          ...dateFilter
        },
        include: {
          account: {
            select: {
              code: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: [
          { postedAt: 'desc' },
          { journalId: 'asc' }
        ]
      });

      // Group entries by journal ID
      const journalGroups: { [key: string]: any } = {};
      
      entries.forEach(entry => {
        const journalId = entry.journalId;
        if (!journalGroups[journalId]) {
          journalGroups[journalId] = {
            journalId,
            date: entry.postedAt,
            createdAt: entry.createdAt, // Add createdAt for sorting
            reference: entry.reference,
            entries: [],
            totalDebits: 0,
            totalCredits: 0
          };
        } else {
          // Update with the most recent createdAt timestamp
          if (entry.createdAt && (!journalGroups[journalId].createdAt || 
              new Date(entry.createdAt) > new Date(journalGroups[journalId].createdAt))) {
            journalGroups[journalId].createdAt = entry.createdAt;
          }
        }

        const amount = parseFloat(entry.amount.toString());
        journalGroups[journalId].entries.push({
          accountCode: entry.account.code,
          accountName: entry.account.name,
          accountType: entry.account.type,
          memo: entry.memo,
          debit: entry.type === 'DEBIT' ? amount : 0,
          credit: entry.type === 'CREDIT' ? amount : 0,
          type: entry.type
        });

        if (entry.type === 'DEBIT') {
          journalGroups[journalId].totalDebits += amount;
        } else {
          journalGroups[journalId].totalCredits += amount;
        }
      });

      const journalEntries = Object.values(journalGroups)
        .map((journal: any) => ({
          ...journal,
          isBalanced: Math.abs(journal.totalDebits - journal.totalCredits) < 0.01,
          entryCount: journal.entries.length
        }))
        .sort((a: any, b: any) => {
          // Sort by createdAt (most recent first), then by journal ID (descending)
          if (a.createdAt && b.createdAt) {
            const createdAtComparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (createdAtComparison !== 0) return createdAtComparison;
          }
          
          // Fallback to journal ID sorting (newest first)
          // Simple reverse alphabetical sort works well for most patterns
          return b.journalId.localeCompare(a.journalId);
        });

      const summary = {
        totalJournalEntries: journalEntries.length,
        totalTransactions: entries.length,
        totalDebits: journalEntries.reduce((sum: number, j: any) => sum + j.totalDebits, 0),
        totalCredits: journalEntries.reduce((sum: number, j: any) => sum + j.totalCredits, 0),
        balancedEntries: journalEntries.filter((j: any) => j.isBalanced).length,
        unbalancedEntries: journalEntries.filter((j: any) => !j.isBalanced).length
      };

      res.json({
        success: true,
        report: 'Journal Entries',
        summary,
        journalEntries,
        metadata: {
          generatedAt: new Date(),
          tenantId,
          dateRange: { startDate, endDate },
          parameters: params
        }
      });

    } catch (error) {
      console.error('Error generating Journal report:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate Journal report' 
      });
    }
  }

  /**
   * ⚖️ TRIAL BALANCE REPORT
   * GET /api/v1/reports/trial-balance
   */
  static async getTrialBalance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params = ReportDateRangeSchema.parse(req.query);
      
      const { startDate, endDate, includeZeroBalances } = params;
      const dateFilter = ReportsController.buildDateFilter(startDate, endDate);

      // Get all accounts with their entries
      const accounts = await prisma.account.findMany({
        where: {
          tenantId,
          isActive: true
        },
        include: {
          entries: {
            where: dateFilter
          }
        },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' }
        ]
      });

      // Calculate balances for each account
      const trialBalanceData = accounts.map(account => {
        const debits = account.entries
          .filter(entry => entry.type === 'DEBIT')
          .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
        
        const credits = account.entries
          .filter(entry => entry.type === 'CREDIT')
          .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

        let debitBalance = 0;
        let creditBalance = 0;
        const netBalance = debits - credits;

        // Determine normal balance based on account type
        if (ReportsController.isDebitAccount(account.type)) {
          debitBalance = netBalance > 0 ? netBalance : 0;
          creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;
        } else {
          creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;
          debitBalance = netBalance > 0 ? netBalance : 0;
        }

        return {
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          totalDebits: debits,
          totalCredits: credits,
          debitBalance,
          creditBalance,
          netBalance: Math.abs(netBalance)
        };
      }).filter(account => 
        includeZeroBalances || 
        account.debitBalance > 0 || 
        account.creditBalance > 0
      );

      // Group by account type
      const groupedByType = trialBalanceData.reduce((groups: any, account) => {
        const type = account.accountType;
        if (!groups[type]) {
          groups[type] = {
            accounts: [],
            totalDebits: 0,
            totalCredits: 0
          };
        }
        groups[type].accounts.push(account);
        groups[type].totalDebits += account.debitBalance;
        groups[type].totalCredits += account.creditBalance;
        return groups;
      }, {});

      const totalDebits = trialBalanceData.reduce((sum, acc) => sum + acc.debitBalance, 0);
      const totalCredits = trialBalanceData.reduce((sum, acc) => sum + acc.creditBalance, 0);
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

      const summary = {
        totalAccounts: trialBalanceData.length,
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits,
        isBalanced,
        accountTypes: Object.keys(groupedByType),
        asOfDate: endDate || new Date().toISOString().split('T')[0]
      };

      res.json({
        success: true,
        report: 'Trial Balance',
        summary,
        accounts: trialBalanceData,
        groupedByType,
        metadata: {
          generatedAt: new Date(),
          tenantId,
          dateRange: { startDate, endDate },
          parameters: params
        }
      });

    } catch (error) {
      console.error('Error generating Trial Balance:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate Trial Balance report' 
      });
    }
  }

  /**
   * 💰 CASH FLOW STATEMENT
   * GET /api/v1/reports/cash-flow
   */
  static async getCashFlow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params = ReportDateRangeSchema.parse(req.query);
      
      const { startDate, endDate } = params;
      const dateFilter = ReportsController.buildDateFilter(startDate, endDate);

      // Get cash and cash equivalent accounts
      const cashAccounts = await prisma.account.findMany({
        where: {
          tenantId,
          OR: [
            { code: { startsWith: '1000' } }, // Cash accounts
            { code: { startsWith: '1001' } }, // Bank accounts
            { name: { contains: 'Cash' } },
            { name: { contains: 'Bank' } }
          ],
          isActive: true
        },
        include: {
          entries: {
            where: dateFilter,
            orderBy: { postedAt: 'asc' },
            include: {
              account: true
            }
          }
        }
      });

      // Calculate cash flows
      let operatingActivities = 0;
      let investingActivities = 0;
      let financingActivities = 0;

      const cashFlowDetails: any[] = [];

      cashAccounts.forEach(account => {
        account.entries.forEach(entry => {
          const amount = parseFloat(entry.amount.toString());
          const isInflow = entry.type === 'DEBIT';
          const cashFlow = isInflow ? amount : -amount;

          // Categorize by account type (simplified logic)
          if (entry.account.code.startsWith('4') || entry.account.code.startsWith('5')) {
            operatingActivities += cashFlow;
          } else if (entry.account.code.startsWith('1') && !entry.account.code.startsWith('100')) {
            investingActivities += cashFlow;
          } else {
            financingActivities += cashFlow;
          }

          cashFlowDetails.push({
            date: entry.postedAt,
            description: entry.memo,
            reference: entry.reference,
            amount: cashFlow,
            category: entry.account.code.startsWith('4') || entry.account.code.startsWith('5') 
              ? 'Operating' 
              : entry.account.code.startsWith('1') 
                ? 'Investing' 
                : 'Financing'
          });
        });
      });

      const netCashFlow = operatingActivities + investingActivities + financingActivities;

      res.json({
        success: true,
        report: 'Cash Flow Statement',
        summary: {
          operatingActivities,
          investingActivities,
          financingActivities,
          netCashFlow,
          dateRange: { startDate, endDate }
        },
        details: cashFlowDetails,
        metadata: {
          generatedAt: new Date(),
          tenantId,
          parameters: params
        }
      });

    } catch (error) {
      console.error('Error generating Cash Flow Statement:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate Cash Flow Statement' 
      });
    }
  }

  /**
   * 📊 PROFIT & LOSS STATEMENT
   * GET /api/v1/reports/profit-loss
   */
  static async getProfitLoss(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params = ReportDateRangeSchema.parse(req.query);
      
      const { startDate, endDate } = params;
      const dateFilter = ReportsController.buildDateFilter(startDate, endDate);

      // Get revenue and expense accounts
      const accounts = await prisma.account.findMany({
        where: {
          tenantId,
          type: { in: ['REVENUE', 'EXPENSE'] },
          isActive: true
        },
        include: {
          entries: {
            where: dateFilter
          }
        },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' }
        ]
      });

      let totalRevenue = 0;
      let totalExpenses = 0;
      const revenueAccounts: any[] = [];
      const expenseAccounts: any[] = [];

      accounts.forEach(account => {
        const debits = account.entries
          .filter(entry => entry.type === 'DEBIT')
          .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);
        
        const credits = account.entries
          .filter(entry => entry.type === 'CREDIT')
          .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

        const netAmount = account.type === 'REVENUE' ? credits - debits : debits - credits;

        const accountData = {
          code: account.code,
          name: account.name,
          amount: Math.abs(netAmount)
        };

        if (account.type === 'REVENUE') {
          totalRevenue += Math.abs(netAmount);
          revenueAccounts.push(accountData);
        } else {
          totalExpenses += Math.abs(netAmount);
          expenseAccounts.push(accountData);
        }
      });

      const grossProfit = totalRevenue;
      const netIncome = totalRevenue - totalExpenses;

      res.json({
        success: true,
        report: 'Profit & Loss Statement',
        summary: {
          totalRevenue,
          totalExpenses,
          grossProfit,
          netIncome,
          profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
        },
        revenue: {
          accounts: revenueAccounts,
          total: totalRevenue
        },
        expenses: {
          accounts: expenseAccounts,
          total: totalExpenses
        },
        metadata: {
          generatedAt: new Date(),
          tenantId,
          dateRange: { startDate, endDate },
          parameters: params
        }
      });

    } catch (error) {
      console.error('Error generating Profit & Loss Statement:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate Profit & Loss Statement' 
      });
    }
  }

  /**
   * 📋 REPORTS MENU
   * GET /api/v1/reports/menu
   */
  static async getReportsMenu(req: Request, res: Response): Promise<void> {
    try {
      const reportsMenu = {
        categories: [
          {
            id: 'financial-statements',
            name: 'Financial Statements',
            icon: '📊',
            description: 'Core financial reports',
            reports: [
              {
                id: 'trial-balance',
                name: 'Trial Balance',
                description: 'Verify that debits equal credits',
                endpoint: '/api/v1/reports/trial-balance',
                icon: '⚖️'
              },
              {
                id: 'profit-loss',
                name: 'Profit & Loss Statement',
                description: 'Revenue and expenses overview',
                endpoint: '/api/v1/reports/profit-loss',
                icon: '💰'
              },
              {
                id: 'cash-flow',
                name: 'Cash Flow Statement',
                description: 'Cash inflows and outflows',
                endpoint: '/api/v1/reports/cash-flow',
                icon: '💸'
              }
            ]
          },
          {
            id: 'detailed-reports',
            name: 'Detailed Reports',
            icon: '📋',
            description: 'Transaction-level detail reports',
            reports: [
              {
                id: 'general-ledger',
                name: 'General Ledger',
                description: 'All account transactions with running balances',
                endpoint: '/api/v1/reports/general-ledger',
                icon: '📈'
              },
              {
                id: 'account-transactions',
                name: 'Account Transactions',
                description: 'Detailed transactions for specific accounts',
                endpoint: '/api/v1/reports/account-transactions',
                icon: '📋'
              },
              {
                id: 'journal-entries',
                name: 'Journal Report',
                description: 'All journal entries with details',
                endpoint: '/api/v1/reports/journal-entries',
                icon: '📖'
              }
            ]
          }
        ],
        quickActions: [
          {
            name: 'Monthly Trial Balance',
            endpoint: '/api/v1/reports/trial-balance?period=this_month'
          },
          {
            name: 'Year-to-Date P&L',
            endpoint: '/api/v1/reports/profit-loss?period=this_year'
          },
          {
            name: 'Cash Position',
            endpoint: '/api/v1/reports/cash-flow?period=this_month'
          }
        ]
      };

      res.json({
        success: true,
        menu: reportsMenu,
        metadata: {
          generatedAt: new Date(),
          version: '1.0.0'
        }
      });

    } catch (error) {
      console.error('Error getting reports menu:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get reports menu' 
      });
    }
  }

  // Helper methods
  private static buildDateFilter(startDate?: string, endDate?: string) {
    const filter: any = {};
    if (startDate || endDate) {
      filter.postedAt = {};
      if (startDate) filter.postedAt.gte = new Date(startDate);
      if (endDate) filter.postedAt.lte = new Date(endDate);
    }
    return filter;
  }

  private static isDebitAccount(accountType: string): boolean {
    return ['ASSET', 'EXPENSE'].includes(accountType);
  }
}