import { AccountingService } from '../../src/accounting/AccountingService';

describe('AccountingService', () => {
  let accountingService: AccountingService;

  beforeEach(() => {
    accountingService = new AccountingService({ tenantId: 'test-tenant' });
  });

  describe('getTrialBalance', () => {
    it('should return trial balance', async () => {
      const mockTrialBalanceEngine = {
        getTrialBalance: jest.fn().mockResolvedValue({
          accounts: [
            { accountCode: '1000', debitBalance: 1000, creditBalance: 0 },
            { accountCode: '3000', debitBalance: 0, creditBalance: 1000 }
          ],
          totalDebits: 1000,
          totalCredits: 1000
        })
      };

      (accountingService as any).chartEngine = mockTrialBalanceEngine;

      const result = await accountingService.getTrialBalance();

      expect(result.totalDebits).toBe(1000);
      expect(result.totalCredits).toBe(1000);
      expect(mockTrialBalanceEngine.getTrialBalance).toHaveBeenCalled();
    });
  });

  describe('createJournalEntry', () => {
    it('should create journal entry', async () => {
      const mockJournalEngine = {
        createJournalEntry: jest.fn().mockResolvedValue({
          id: 'journal-123',
          entryNumber: 'JE-001',
          isBalanced: true,
          totalDebits: 100,
          totalCredits: 100,
          entries: [
            { accountCode: '1000', amount: 100, type: 'DEBIT' },
            { accountCode: '3000', amount: 100, type: 'CREDIT' }
          ]
        })
      };

      (accountingService as any).journalEngine = mockJournalEngine;

      const request = {
        description: 'Test entry',
        entries: [
          { accountCode: '1000', amount: 100, type: 'DEBIT' as const },
          { accountCode: '3000', amount: 100, type: 'CREDIT' as const }
        ]
      };

      const result = await accountingService.createJournalEntry(request);

      expect(result.entryNumber).toBe('JE-001');
      expect(mockJournalEngine.createJournalEntry).toHaveBeenCalledWith(request);
    });
  });

  describe('initializeChartOfAccounts', () => {
    it('should initialize chart of accounts', async () => {
      const mockChartAccountsEngine = {
        createStandardChartOfAccounts: jest.fn().mockResolvedValue([
          { code: '1000', name: 'Assets', type: 'ASSET' },
          { code: '3000', name: 'Equity', type: 'EQUITY' }
        ])
      };

      (accountingService as any).chartEngine = mockChartAccountsEngine;

      const result = await accountingService.initializeChartOfAccounts();

      expect(result).toHaveLength(2);
      expect(mockChartAccountsEngine.createStandardChartOfAccounts).toHaveBeenCalled();
    });
  });

  describe('generateBalanceSheet', () => {
    it('should generate balance sheet', async () => {
      const mockBalanceSheetEngine = {
        generateBalanceSheet: jest.fn().mockResolvedValue({
          id: 'bs-123',
          statementType: 'BALANCE_SHEET',
          period: { startDate: new Date(), endDate: new Date(), periodType: 'MONTHLY', fiscalYear: 2024 },
          data: {
            assets: { current: [], nonCurrent: [], total: 10000 },
            liabilities: { current: [], nonCurrent: [], total: 5000 },
            equity: { items: [], total: 5000 },
            isBalanced: true
          },
          totals: { assets: 10000, liabilities: 5000, equity: 5000 },
          generatedAt: new Date(),
          generatedBy: 'test',
          tenantId: 'test-tenant'
        })
      };

      (accountingService as any).reportingEngine = mockBalanceSheetEngine;

      const result = await accountingService.generateBalanceSheet();

      expect(result.data.assets.total).toBe(10000);
      expect(mockBalanceSheetEngine.generateBalanceSheet).toHaveBeenCalled();
    });
  });

  describe('generateIncomeStatement', () => {
    it('should generate income statement', async () => {
      const mockIncomeStatementEngine = {
        generateIncomeStatement: jest.fn().mockResolvedValue({
          id: 'is-123',
          statementType: 'INCOME_STATEMENT',
          period: { startDate: new Date(), endDate: new Date(), periodType: 'MONTHLY', fiscalYear: 2024 },
          data: {
            revenue: { items: [], total: 15000 },
            costOfGoodsSold: { items: [], total: 5000 },
            grossProfit: 10000,
            grossProfitMargin: 66.67,
            operatingExpenses: { items: [], total: 5000 },
            operatingIncome: 5000,
            operatingMargin: 33.33,
            otherIncome: { items: [], total: 0 },
            otherExpenses: { items: [], total: 0 },
            netIncome: 5000,
            netMargin: 33.33
          },
          totals: { revenue: 15000, expenses: 10000, netIncome: 5000 },
          generatedAt: new Date(),
          generatedBy: 'test',
          tenantId: 'test-tenant'
        })
      };

      (accountingService as any).reportingEngine = mockIncomeStatementEngine;

      const result = await accountingService.generateIncomeStatement(new Date(), new Date());

      expect(result.data.netIncome).toBe(5000);
      expect(mockIncomeStatementEngine.generateIncomeStatement).toHaveBeenCalled();
    });
  });
}); 