import { AccountType } from '@prisma/client';

/**
 * 📊 ACCOUNT MODEL
 * Represents a single account in the chart of accounts
 */
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  description?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 📈 ACCOUNT BALANCE MODEL
 * Represents the current balance and activity for an account
 */
export interface AccountBalance {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  openingBalance: number;
  closingBalance: number;
  periodActivity: {
    debits: number;
    credits: number;
    netActivity: number;
  };
  lastTransactionDate?: Date;
  isReconciled: boolean;
}

/**
 * 🏗️ ACCOUNT HIERARCHY
 * Represents the hierarchical structure of accounts
 */
export interface AccountHierarchy {
  account: Account;
  level: number;
  children: AccountHierarchy[];
  parentAccount?: Account;
  totalBalance: number;
  hasActivity: boolean;
}

/**
 * ⚖️ ACCOUNT CATEGORIES
 * Standard account categories with their properties
 */
export const ACCOUNT_CATEGORIES = {
  ASSET: {
    normalBalance: 'DEBIT' as const,
    increaseOn: 'DEBIT' as const,
    decreaseOn: 'CREDIT' as const,
    statementType: 'BALANCE_SHEET' as const,
    section: 'ASSETS' as const
  },
  LIABILITY: {
    normalBalance: 'CREDIT' as const,
    increaseOn: 'CREDIT' as const,
    decreaseOn: 'DEBIT' as const,
    statementType: 'BALANCE_SHEET' as const,
    section: 'LIABILITIES' as const
  },
  EQUITY: {
    normalBalance: 'CREDIT' as const,
    increaseOn: 'CREDIT' as const,
    decreaseOn: 'DEBIT' as const,
    statementType: 'BALANCE_SHEET' as const,
    section: 'EQUITY' as const
  },
  REVENUE: {
    normalBalance: 'CREDIT' as const,
    increaseOn: 'CREDIT' as const,
    decreaseOn: 'DEBIT' as const,
    statementType: 'INCOME_STATEMENT' as const,
    section: 'REVENUE' as const
  },
  EXPENSE: {
    normalBalance: 'DEBIT' as const,
    increaseOn: 'DEBIT' as const,
    decreaseOn: 'CREDIT' as const,
    statementType: 'INCOME_STATEMENT' as const,
    section: 'EXPENSES' as const
  }
} as const;

/**
 * 🎯 ACCOUNT UTILITIES
 * Helper functions for account operations
 */
export class AccountUtils {
  /**
   * Get the normal balance side for an account type
   */
  static getNormalBalance(accountType: AccountType): 'DEBIT' | 'CREDIT' {
    return ACCOUNT_CATEGORIES[accountType].normalBalance;
  }

  /**
   * Determine if a balance is normal for the account type
   */
  static isNormalBalance(accountType: AccountType, balance: number): boolean {
    const normalBalance = this.getNormalBalance(accountType);
    return (normalBalance === 'DEBIT' && balance >= 0) || 
           (normalBalance === 'CREDIT' && balance <= 0);
  }

  /**
   * Calculate the display balance (always positive for assets, expenses)
   */
  static getDisplayBalance(accountType: AccountType, netBalance: number): number {
    if (['ASSET', 'EXPENSE'].includes(accountType)) {
      return Math.abs(netBalance);
    }
    return Math.abs(netBalance);
  }

  /**
   * Get the statement type for an account
   */
  static getStatementType(accountType: AccountType): 'BALANCE_SHEET' | 'INCOME_STATEMENT' {
    return ACCOUNT_CATEGORIES[accountType].statementType;
  }

  /**
   * Validate account code format
   */
  static validateAccountCode(code: string): {
    isValid: boolean;
    errors: string[];
    suggestions?: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Must be 4 digits
    if (!/^\d{4}$/.test(code)) {
      errors.push('Account code must be exactly 4 digits');
    }

    // Check valid ranges
    const firstDigit = parseInt(code[0]);
    const validRanges = {
      1: 'Assets (1000-1999)',
      2: 'Liabilities (2000-2999)',
      3: 'Equity (3000-3999)',
      4: 'Revenue (4000-4999)',
      5: 'Cost of Goods Sold (5000-5999)',
      6: 'Operating Expenses (6000-6999)',
      7: 'Other Expenses (7000-7999)',
      8: 'Other Income/Expenses (8000-8999)',
      9: 'Special Accounts (9000-9999)'
    };

    if (!validRanges[firstDigit as keyof typeof validRanges]) {
      errors.push('Invalid account code range');
      suggestions.push('Use 1xxx for Assets, 2xxx for Liabilities, etc.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Generate suggested account codes based on type
   */
  static suggestAccountCodes(accountType: AccountType, description?: string): string[] {
    const suggestions: string[] = [];
    
    switch (accountType) {
      case 'ASSET':
        suggestions.push('1100', '1110', '1120', '1130'); // Current assets
        break;
      case 'LIABILITY':
        suggestions.push('2100', '2110', '2120', '2130'); // Current liabilities
        break;
      case 'EQUITY':
        suggestions.push('3100', '3200', '3300'); // Equity accounts
        break;
      case 'REVENUE':
        suggestions.push('4100', '4110', '4120'); // Revenue accounts
        break;
      case 'EXPENSE':
        suggestions.push('6100', '6200', '6300', '6400'); // Operating expenses
        break;
    }

    return suggestions;
  }
} 