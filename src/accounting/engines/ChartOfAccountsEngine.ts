import { PrismaClient } from '@prisma/client';
import { AccountType } from '@prisma/client';

const prisma = new PrismaClient();

export interface AccountStructure {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  description?: string;
  isActive: boolean;
  level: number;
}

export interface AccountBalance {
  accountCode: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  lastUpdated: Date;
}

/**
 * 🏗️ CHART OF ACCOUNTS ENGINE
 * Manages the chart of accounts for a tenant
 */
export class ChartOfAccountsEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

    /**
   * 🏗️ CREATE STANDARD CHART OF ACCOUNTS
   * Initialize with standard accounting structure
   */
  async createStandardChartOfAccounts(): Promise<AccountStructure[]> {
    const accountDefinitions = [
      // Assets
      { code: '1000', name: 'Assets', type: 'ASSET' as AccountType, parentCode: undefined },
      { code: '1100', name: 'Current Assets', type: 'ASSET' as AccountType, parentCode: '1000' },
      { code: '1110', name: 'Cash and Cash Equivalents', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1111', name: 'Cash', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1112', name: 'Petty Cash', type: 'ASSET' as AccountType, parentCode: '1110' },
      { code: '1120', name: 'Accounts Receivable', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1130', name: 'Inventory', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1140', name: 'Prepaid Expenses', type: 'ASSET' as AccountType, parentCode: '1100' },
      { code: '1200', name: 'Fixed Assets', type: 'ASSET' as AccountType, parentCode: '1000' },
      { code: '1210', name: 'Equipment', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1220', name: 'Furniture and Fixtures', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1230', name: 'Buildings', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1240', name: 'Land', type: 'ASSET' as AccountType, parentCode: '1200' },
      { code: '1250', name: 'Accumulated Depreciation', type: 'ASSET' as AccountType, parentCode: '1200' },

      // Liabilities
      { code: '2000', name: 'Liabilities', type: 'LIABILITY' as AccountType, parentCode: undefined },
      { code: '2100', name: 'Current Liabilities', type: 'LIABILITY' as AccountType, parentCode: '2000' },
      { code: '2110', name: 'Accounts Payable', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2120', name: 'Accrued Expenses', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2130', name: 'Sales Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2140', name: 'Income Tax Payable', type: 'LIABILITY' as AccountType, parentCode: '2100' },
      { code: '2200', name: 'Long-term Liabilities', type: 'LIABILITY' as AccountType, parentCode: '2000' },
      { code: '2210', name: 'Notes Payable', type: 'LIABILITY' as AccountType, parentCode: '2200' },
      { code: '2220', name: 'Mortgages Payable', type: 'LIABILITY' as AccountType, parentCode: '2200' },

      // Equity
      { code: '3000', name: 'Equity', type: 'EQUITY' as AccountType, parentCode: undefined },
      { code: '3100', name: 'Owner\'s Equity', type: 'EQUITY' as AccountType, parentCode: '3000' },
      { code: '3110', name: 'Capital', type: 'EQUITY' as AccountType, parentCode: '3100' },
      { code: '3120', name: 'Owner\'s Draw', type: 'EQUITY' as AccountType, parentCode: '3100' },
      { code: '3200', name: 'Retained Earnings', type: 'EQUITY' as AccountType, parentCode: '3000' },

      // Revenue
      { code: '4000', name: 'Revenue', type: 'REVENUE' as AccountType, parentCode: undefined },
      { code: '4100', name: 'Sales Revenue', type: 'REVENUE' as AccountType, parentCode: '4000' },
      { code: '4110', name: 'Product Sales', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4120', name: 'Service Revenue', type: 'REVENUE' as AccountType, parentCode: '4100' },
      { code: '4200', name: 'Other Revenue', type: 'REVENUE' as AccountType, parentCode: '4000' },
      { code: '4210', name: 'Interest Income', type: 'REVENUE' as AccountType, parentCode: '4200' },
      { code: '4220', name: 'Gain on Sale of Assets', type: 'REVENUE' as AccountType, parentCode: '4200' },

      // Expenses
      { code: '5000', name: 'Expenses', type: 'EXPENSE' as AccountType, parentCode: undefined },
      { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE' as AccountType, parentCode: '5000' },
      { code: '5110', name: 'Direct Labor', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5120', name: 'Direct Materials', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5130', name: 'Manufacturing Overhead', type: 'EXPENSE' as AccountType, parentCode: '5100' },
      { code: '5200', name: 'Operating Expenses', type: 'EXPENSE' as AccountType, parentCode: '5000' },
      { code: '5210', name: 'Salaries and Wages', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5220', name: 'Rent Expense', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5230', name: 'Utilities', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5240', name: 'Office Supplies', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5250', name: 'Insurance', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5260', name: 'Depreciation', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5270', name: 'Advertising', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5280', name: 'Travel and Entertainment', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5290', name: 'Professional Services', type: 'EXPENSE' as AccountType, parentCode: '5200' },
      { code: '5300', name: 'Other Expenses', type: 'EXPENSE' as AccountType, parentCode: '5000' },
      { code: '5310', name: 'Interest Expense', type: 'EXPENSE' as AccountType, parentCode: '5300' },
      { code: '5320', name: 'Loss on Sale of Assets', type: 'EXPENSE' as AccountType, parentCode: '5300' },
    ];

    const standardAccounts: Omit<AccountStructure, 'level'>[] = accountDefinitions.map(acc => ({
      ...acc,
      isActive: true,
      description: undefined
    }));

    const accountsWithLevels = this.calculateAccountLevels(standardAccounts);
    const createdAccounts: AccountStructure[] = [];

    for (const accountData of accountsWithLevels) {
      const createdAccount = await this.createAccount(accountData);
      createdAccounts.push(createdAccount);
    }

    return createdAccounts;
  }

  /**
   * Calculate account hierarchy levels
   */
  private calculateAccountLevels(accounts: Omit<AccountStructure, 'level'>[]): AccountStructure[] {
    return accounts.map(account => ({
      ...account,
      level: this.getAccountLevel(account.code),
      isActive: true,
      description: account.description || undefined
    }));
  }

  /**
   * Get account level based on code structure
   */
  private getAccountLevel(code: string): number {
    return Math.floor(code.length / 4);
  }

  /**
   * 🏗️ CREATE INDIVIDUAL ACCOUNT
   */
  async createAccount(accountData: AccountStructure): Promise<AccountStructure> {
    // First, find the parent account if parentCode is provided
    let parentId: string | null = null;
    if (accountData.parentCode) {
      const parentAccount = await prisma.account.findFirst({
        where: {
          code: accountData.parentCode,
          tenantId: this.tenantId
        }
      });
      parentId = parentAccount?.id || null;
    }

    const bookId = await this.getDefaultBookId();

    const account = await prisma.account.upsert({
      where: {
        tenantId_code: {
          code: accountData.code,
          tenantId: this.tenantId
        }
      },
      update: {
        name: accountData.name,
        type: accountData.type,
        parentId: parentId,
        description: accountData.description,
        isActive: accountData.isActive
      },
      create: {
        code: accountData.code,
        name: accountData.name,
        type: accountData.type,
        parentId: parentId,
        description: accountData.description,
        isActive: accountData.isActive,
        tenantId: this.tenantId,
        bookId: bookId
      }
    });

    return {
      code: account.code,
      name: account.name,
      type: account.type,
      parentCode: accountData.parentCode,
      description: account.description || undefined,
      isActive: account.isActive,
      level: accountData.level
    };
  }

  /**
   * Get the default book ID for this tenant
   */
  private async getDefaultBookId(): Promise<string> {
    const book = await prisma.book.findFirst({
      where: { tenantId: this.tenantId }
    });
    
    if (!book) {
      // Create default book if it doesn't exist
      const newBook = await prisma.book.create({
        data: {
          name: 'General Ledger',
          currency: 'USD',
          tenantId: this.tenantId
        }
      });
      return newBook.id;
    }
    
    return book.id;
  }

  /**
   * 📊 GET ACCOUNT BALANCE
   * Calculate current balance for an account
   */
  async getAccountBalance(accountCode: string): Promise<AccountBalance> {
    const account = await prisma.account.findFirst({
      where: {
        code: accountCode,
        tenantId: this.tenantId
      }
    });

    if (!account) {
      throw new Error(`Account ${accountCode} not found`);
    }

    // Get all entries for this account
    const entries = await prisma.entry.findMany({
      where: {
        accountId: account.id,
        tenantId: this.tenantId
      }
    });

    const debitBalance = entries
      .filter(entry => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    const creditBalance = entries
      .filter(entry => entry.type === 'CREDIT')
      .reduce((sum, entry) => sum + parseFloat(entry.amount.toString()), 0);

    // Calculate net balance based on account type
    let netBalance: number;
    if (['ASSET', 'EXPENSE'].includes(account.type)) {
      // Normal debit balance accounts
      netBalance = debitBalance - creditBalance;
    } else {
      // Normal credit balance accounts (LIABILITY, EQUITY, REVENUE)
      netBalance = creditBalance - debitBalance;
    }

    return {
      accountCode,
      debitBalance,
      creditBalance,
      netBalance,
      lastUpdated: new Date()
    };
  }

  /**
   * 🏗️ GET ACCOUNT HIERARCHY
   * Return accounts in hierarchical structure
   */
  async getAccountHierarchy(): Promise<AccountStructure[]> {
    const accounts = await prisma.account.findMany({
      where: { tenantId: this.tenantId, isActive: true },
      orderBy: { code: 'asc' }
    });

    return accounts.map(account => ({
      code: account.code,
      name: account.name,
      type: account.type as AccountType,
      parentCode: undefined, // We'll need to implement parent code lookup if needed
      description: account.description || undefined,
      isActive: account.isActive,
      level: this.getAccountLevel(account.code)
    }));
  }

  /**
   * ✅ VALIDATE ACCOUNT CODE
   * Ensure account code follows proper format
   */
  validateAccountCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if code is numeric
    if (!/^\d+$/.test(code)) {
      errors.push('Account code must be numeric');
    }

    // Check if code is 4 digits
    if (code.length !== 4) {
      errors.push('Account code must be exactly 4 digits');
    }

    // Check if code follows hierarchical structure
    if (code.length > 0) {
      const level = Math.floor(code.length / 4);
      if (level > 3) {
        errors.push('Account code cannot exceed 3 levels (12 digits)');
      }
    }

    // Check for reserved codes
    const reservedCodes = ['0000', '9999'];
    if (reservedCodes.includes(code)) {
      errors.push(`Account code ${code} is reserved`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 📊 GET TRIAL BALANCE
   * Generate trial balance report
   */
  async getTrialBalance(): Promise<{
    accounts: (AccountBalance & { name: string; type: AccountType })[];
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  }> {
    const accounts = await prisma.account.findMany({
      where: { tenantId: this.tenantId, isActive: true },
      orderBy: { code: 'asc' }
    });

    const accountBalances: (AccountBalance & { name: string; type: AccountType })[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.code);
      accountBalances.push({
        ...balance,
        name: account.name,
        type: account.type
      });

      if (['ASSET', 'EXPENSE'].includes(account.type)) {
        totalDebits += balance.netBalance > 0 ? balance.netBalance : 0;
        totalCredits += balance.netBalance < 0 ? Math.abs(balance.netBalance) : 0;
      } else {
        totalCredits += balance.netBalance > 0 ? balance.netBalance : 0;
        totalDebits += balance.netBalance < 0 ? Math.abs(balance.netBalance) : 0;
      }
    }

    return {
      accounts: accountBalances,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 // Allow for rounding differences
    };
  }
} 