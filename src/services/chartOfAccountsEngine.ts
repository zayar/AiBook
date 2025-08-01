import prisma from '../utils/database';
import { AppError } from '../middleware/errorHandler';

export interface ChartAccount {
  id?: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId?: string;
  description?: string;
  isActive: boolean;
  currency: string;
  metadata?: any;
}

export interface ChartTemplate {
  name: string;
  description: string;
  accounts: ChartAccount[];
  industry?: string;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE';
}

export class ChartOfAccountsEngine {
  /**
   * 📋 CREATE STANDARDIZED CHART OF ACCOUNTS
   * Create a complete chart of accounts based on industry standards
   */
  static async createStandardChart(tenantId: string, bookId: string, template: 'GENERAL' | 'RETAIL' | 'SERVICE' | 'MANUFACTURING' = 'GENERAL'): Promise<{
    accounts: ChartAccount[];
    summary: {
      totalAccounts: number;
      assetAccounts: number;
      liabilityAccounts: number;
      equityAccounts: number;
      revenueAccounts: number;
      expenseAccounts: number;
    };
  }> {
    const templates = this.getStandardTemplates();
    const selectedTemplate = templates[template];
    
    if (!selectedTemplate) {
      throw new AppError(`Template '${template}' not found`, 400);
    }
    
    const createdAccounts: ChartAccount[] = [];
    
    // Create accounts in hierarchical order
    for (const account of selectedTemplate.accounts) {
      const createdAccount = await prisma.account.create({
        data: {
          code: account.code,
          name: account.name,
          type: account.type,
          description: account.description,
          currency: account.currency || 'USD',
          isActive: account.isActive,
          balance: 0,
          parentId: null, // Will be updated after all accounts are created
          bookId,
          tenantId,
          // metadata: account.metadata // Removed as it's not in the schema
        }
      });
      
      createdAccounts.push({
        id: createdAccount.id,
        code: createdAccount.code,
        name: createdAccount.name,
        type: createdAccount.type,
        description: createdAccount.description || undefined,
        isActive: createdAccount.isActive,
        currency: createdAccount.currency
      });
    }
    
    // Update parent-child relationships
    for (let i = 0; i < selectedTemplate.accounts.length; i++) {
      const templateAccount = selectedTemplate.accounts[i];
      const createdAccount = createdAccounts[i];
      
      if (templateAccount.parentId) {
        const parentAccount = createdAccounts.find(acc => 
          acc.code === templateAccount.parentId
        );
        
        if (parentAccount) {
          await prisma.account.update({
            where: { id: createdAccount.id },
            data: { parentId: parentAccount.id }
          });
        }
      }
    }
    
    const summary = {
      totalAccounts: createdAccounts.length,
      assetAccounts: createdAccounts.filter(acc => acc.type === 'ASSET').length,
      liabilityAccounts: createdAccounts.filter(acc => acc.type === 'LIABILITY').length,
      equityAccounts: createdAccounts.filter(acc => acc.type === 'EQUITY').length,
      revenueAccounts: createdAccounts.filter(acc => acc.type === 'REVENUE').length,
      expenseAccounts: createdAccounts.filter(acc => acc.type === 'EXPENSE').length
    };
    
    return { accounts: createdAccounts, summary };
  }

  /**
   * 🔍 VALIDATE CHART OF ACCOUNTS
   * Validate chart of accounts structure and compliance
   */
  static async validateChartOfAccounts(tenantId: string, bookId?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
    structure: {
      totalAccounts: number;
      hierarchicalLevels: number;
      orphanedAccounts: number;
      duplicateCodes: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    const where: any = { tenantId, isActive: true };
    if (bookId) where.bookId = bookId;
    
    const accounts = await prisma.account.findMany({
      where,
      include: {
        parent: true,
        children: true,
        entries: {
          take: 1
        }
      },
      orderBy: { code: 'asc' }
    });
    
    // Check for duplicate account codes
    const codeCounts = new Map<string, number>();
    accounts.forEach(acc => {
      codeCounts.set(acc.code, (codeCounts.get(acc.code) || 0) + 1);
    });
    
    const duplicateCodes = Array.from(codeCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([code, _]) => code);
    
    if (duplicateCodes.length > 0) {
      errors.push(`Duplicate account codes found: ${duplicateCodes.join(', ')}`);
    }
    
    // Check for orphaned accounts (accounts with invalid parent references)
    const orphanedAccounts = accounts.filter(acc => 
      acc.parentId && !accounts.find(p => p.id === acc.parentId)
    );
    
    if (orphanedAccounts.length > 0) {
      errors.push(`${orphanedAccounts.length} orphaned accounts found`);
    }
    
    // Check for circular references
    const circularRefs = this.detectCircularReferences(accounts);
    if (circularRefs.length > 0) {
      errors.push(`Circular references detected in account hierarchy`);
    }
    
    // Check for missing required accounts
    const requiredAccounts = this.getRequiredAccounts();
    const missingRequired = requiredAccounts.filter(required => 
      !accounts.find(acc => acc.code === required.code)
    );
    
    if (missingRequired.length > 0) {
      warnings.push(`Missing recommended accounts: ${missingRequired.map(acc => acc.code).join(', ')}`);
    }
    
    // Check account code format
    const invalidCodes = accounts.filter(acc => !this.isValidAccountCode(acc.code));
    if (invalidCodes.length > 0) {
      warnings.push(`${invalidCodes.length} accounts have non-standard code formats`);
    }
    
    // Check for inactive accounts with balances
    const inactiveWithBalance = accounts.filter(acc => 
      !acc.isActive && parseFloat(acc.balance.toString()) !== 0
    );
    
    if (inactiveWithBalance.length > 0) {
      warnings.push(`${inactiveWithBalance.length} inactive accounts have non-zero balances`);
    }
    
    // Check for accounts without recent activity
    const inactiveAccounts = accounts.filter(acc => acc.entries.length === 0);
    if (inactiveAccounts.length > accounts.length * 0.3) {
      recommendations.push('Consider reviewing and potentially consolidating unused accounts');
    }
    
    // Calculate structure metrics
    const maxDepth = this.calculateMaxDepth(accounts);
    const orphanedCount = orphanedAccounts.length;
    const duplicateCount = duplicateCodes.length;
    
    const structure = {
      totalAccounts: accounts.length,
      hierarchicalLevels: maxDepth,
      orphanedAccounts: orphanedCount,
      duplicateCodes: duplicateCount
    };
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      structure
    };
  }

  /**
   * 📊 GET ACCOUNT HIERARCHY
   * Get hierarchical view of chart of accounts
   */
  static async getAccountHierarchy(tenantId: string, bookId?: string): Promise<{
    accounts: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      level: number;
      balance: number;
      children: any[];
      parent?: any;
    }>;
    summary: {
      totalAccounts: number;
      maxDepth: number;
      accountTypes: Record<string, number>;
    };
  }> {
    const where: any = { tenantId, isActive: true };
    if (bookId) where.bookId = bookId;
    
    const accounts = await prisma.account.findMany({
      where,
      include: {
        parent: true,
        children: true
      },
      orderBy: { code: 'asc' }
    });
    
    // Build hierarchy
    const rootAccounts = accounts.filter(acc => !acc.parentId);
    const hierarchicalAccounts = rootAccounts.map(acc => 
      this.buildAccountTree(acc, accounts, 0)
    );
    
    // Calculate summary
    const accountTypes = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxDepth = this.calculateMaxDepth(accounts);
    
    return {
      accounts: hierarchicalAccounts,
      summary: {
        totalAccounts: accounts.length,
        maxDepth,
        accountTypes
      }
    };
  }

  /**
   * 🔄 MIGRATE CHART OF ACCOUNTS
   * Migrate from one chart structure to another
   */
  static async migrateChartOfAccounts(
    tenantId: string, 
    bookId: string, 
    mapping: Array<{
      oldCode: string;
      newCode: string;
      action: 'MOVE' | 'MERGE' | 'SPLIT' | 'DELETE';
      newAccount?: ChartAccount;
    }>
  ): Promise<{
    migratedAccounts: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let migratedAccounts = 0;
    
    for (const mapItem of mapping) {
      try {
        const existingAccount = await prisma.account.findFirst({
          where: {
            tenantId,
            bookId,
            code: mapItem.oldCode,
            isActive: true
          }
        });
        
        if (!existingAccount) {
          warnings.push(`Account ${mapItem.oldCode} not found, skipping`);
          continue;
        }
        
        switch (mapItem.action) {
          case 'MOVE':
            // Update account code
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: { code: mapItem.newCode }
            });
            migratedAccounts++;
            break;
            
          case 'MERGE':
            // Find target account
            const targetAccount = await prisma.account.findFirst({
              where: {
                tenantId,
                bookId,
                code: mapItem.newCode,
                isActive: true
              }
            });
            
            if (targetAccount) {
              // Move all entries to target account
              await prisma.entry.updateMany({
                where: { accountId: existingAccount.id },
                data: { accountId: targetAccount.id }
              });
              
              // Update target account balance
              const totalBalance = parseFloat(existingAccount.balance.toString()) + 
                                 parseFloat(targetAccount.balance.toString());
              
              await prisma.account.update({
                where: { id: targetAccount.id },
                data: { balance: totalBalance }
              });
              
              // Deactivate old account
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: { isActive: false }
              });
              
              migratedAccounts++;
            } else {
              errors.push(`Target account ${mapItem.newCode} not found for merge`);
            }
            break;
            
          case 'SPLIT':
            if (mapItem.newAccount) {
              // Create new account
              const newAccount = await prisma.account.create({
                data: {
                  code: mapItem.newAccount.code,
                  name: mapItem.newAccount.name,
                  type: mapItem.newAccount.type,
                  description: mapItem.newAccount.description,
                  currency: mapItem.newAccount.currency || 'USD',
                  isActive: true,
                  balance: 0,
                  bookId,
                  tenantId,
                  // metadata: mapItem.newAccount.metadata // Removed as it's not in the schema
                }
              });
              
              // Move some entries to new account (this would need business logic)
              warnings.push(`Split operation requires manual entry allocation for ${mapItem.oldCode}`);
              migratedAccounts++;
            }
            break;
            
          case 'DELETE':
            // Check if account has balance
            if (parseFloat(existingAccount.balance.toString()) !== 0) {
              errors.push(`Cannot delete account ${mapItem.oldCode} with non-zero balance`);
            } else {
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: { isActive: false }
              });
              migratedAccounts++;
            }
            break;
        }
      } catch (error) {
        errors.push(`Failed to migrate account ${mapItem.oldCode}: ${error}`);
      }
    }
    
    return { migratedAccounts, errors, warnings };
  }

  // Private helper methods
  private static getStandardTemplates(): Record<string, ChartTemplate> {
    return {
      GENERAL: {
        name: 'General Business',
        description: 'Standard chart of accounts for general business operations',
        accounts: [
          // Assets (1000-1999)
          { code: '1000', name: 'Current Assets', type: 'ASSET', isActive: true, currency: 'USD' },
          { code: '1100', name: 'Cash and Cash Equivalents', type: 'ASSET', parentId: '1000', isActive: true, currency: 'USD' },
          { code: '1110', name: 'Checking Account', type: 'ASSET', parentId: '1100', isActive: true, currency: 'USD' },
          { code: '1120', name: 'Savings Account', type: 'ASSET', parentId: '1100', isActive: true, currency: 'USD' },
          { code: '1200', name: 'Accounts Receivable', type: 'ASSET', parentId: '1000', isActive: true, currency: 'USD' },
          { code: '1300', name: 'Inventory', type: 'ASSET', parentId: '1000', isActive: true, currency: 'USD' },
          { code: '1400', name: 'Prepaid Expenses', type: 'ASSET', parentId: '1000', isActive: true, currency: 'USD' },
          { code: '1500', name: 'Fixed Assets', type: 'ASSET', isActive: true, currency: 'USD' },
          { code: '1510', name: 'Equipment', type: 'ASSET', parentId: '1500', isActive: true, currency: 'USD' },
          { code: '1520', name: 'Furniture and Fixtures', type: 'ASSET', parentId: '1500', isActive: true, currency: 'USD' },
          { code: '1530', name: 'Vehicles', type: 'ASSET', parentId: '1500', isActive: true, currency: 'USD' },
          { code: '1540', name: 'Buildings', type: 'ASSET', parentId: '1500', isActive: true, currency: 'USD' },
          { code: '1550', name: 'Accumulated Depreciation', type: 'ASSET', parentId: '1500', isActive: true, currency: 'USD' },
          
          // Liabilities (2000-2999)
          { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', isActive: true, currency: 'USD' },
          { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', parentId: '2000', isActive: true, currency: 'USD' },
          { code: '2200', name: 'Accrued Expenses', type: 'LIABILITY', parentId: '2000', isActive: true, currency: 'USD' },
          { code: '2300', name: 'Short-term Loans', type: 'LIABILITY', parentId: '2000', isActive: true, currency: 'USD' },
          { code: '2400', name: 'Long-term Liabilities', type: 'LIABILITY', isActive: true, currency: 'USD' },
          { code: '2410', name: 'Long-term Loans', type: 'LIABILITY', parentId: '2400', isActive: true, currency: 'USD' },
          { code: '2420', name: 'Mortgages', type: 'LIABILITY', parentId: '2400', isActive: true, currency: 'USD' },
          
          // Equity (3000-3999)
          { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', isActive: true, currency: 'USD' },
          { code: '3100', name: 'Owner\'s Capital', type: 'EQUITY', parentId: '3000', isActive: true, currency: 'USD' },
          { code: '3200', name: 'Owner\'s Draw', type: 'EQUITY', parentId: '3000', isActive: true, currency: 'USD' },
          { code: '3300', name: 'Retained Earnings', type: 'EQUITY', parentId: '3000', isActive: true, currency: 'USD' },
          
          // Revenue (4000-4999)
          { code: '4000', name: 'Revenue', type: 'REVENUE', isActive: true, currency: 'USD' },
          { code: '4100', name: 'Sales Revenue', type: 'REVENUE', parentId: '4000', isActive: true, currency: 'USD' },
          { code: '4200', name: 'Service Revenue', type: 'REVENUE', parentId: '4000', isActive: true, currency: 'USD' },
          { code: '4300', name: 'Other Revenue', type: 'REVENUE', parentId: '4000', isActive: true, currency: 'USD' },
          
          // Expenses (5000-5999)
          { code: '5000', name: 'Expenses', type: 'EXPENSE', isActive: true, currency: 'USD' },
          { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', parentId: '5000', isActive: true, currency: 'USD' },
          { code: '5200', name: 'Operating Expenses', type: 'EXPENSE', parentId: '5000', isActive: true, currency: 'USD' },
          { code: '5210', name: 'Rent Expense', type: 'EXPENSE', parentId: '5200', isActive: true, currency: 'USD' },
          { code: '5220', name: 'Utilities Expense', type: 'EXPENSE', parentId: '5200', isActive: true, currency: 'USD' },
          { code: '5230', name: 'Insurance Expense', type: 'EXPENSE', parentId: '5200', isActive: true, currency: 'USD' },
          { code: '5240', name: 'Office Supplies', type: 'EXPENSE', parentId: '5200', isActive: true, currency: 'USD' },
          { code: '5250', name: 'Payroll Expense', type: 'EXPENSE', parentId: '5200', isActive: true, currency: 'USD' },
          { code: '5260', name: 'Advertising Expense', type: 'EXPENSE', parentId: '5200', isActive: true, currency: 'USD' },
          { code: '5300', name: 'Depreciation Expense', type: 'EXPENSE', parentId: '5000', isActive: true, currency: 'USD' },
          { code: '5400', name: 'Interest Expense', type: 'EXPENSE', parentId: '5000', isActive: true, currency: 'USD' },
          { code: '5500', name: 'Tax Expense', type: 'EXPENSE', parentId: '5000', isActive: true, currency: 'USD' }
        ]
      }
    };
  }

  private static getRequiredAccounts(): ChartAccount[] {
    return [
      { code: '1110', name: 'Checking Account', type: 'ASSET', isActive: true, currency: 'USD' },
      { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', isActive: true, currency: 'USD' },
      { code: '3100', name: 'Owner\'s Capital', type: 'EQUITY', isActive: true, currency: 'USD' },
      { code: '4100', name: 'Sales Revenue', type: 'REVENUE', isActive: true, currency: 'USD' },
      { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', isActive: true, currency: 'USD' }
    ];
  }

  private static isValidAccountCode(code: string): boolean {
    // Check if code follows standard format (4-digit numeric)
    return /^\d{4}$/.test(code);
  }

  private static detectCircularReferences(accounts: any[]): any[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularRefs: any[] = [];
    
    const dfs = (accountId: string, path: string[] = []) => {
      if (recursionStack.has(accountId)) {
        circularRefs.push([...path, accountId]);
        return;
      }
      
      if (visited.has(accountId)) return;
      
      visited.add(accountId);
      recursionStack.add(accountId);
      
      const account = accounts.find(acc => acc.id === accountId);
      if (account && account.parentId) {
        dfs(account.parentId, [...path, accountId]);
      }
      
      recursionStack.delete(accountId);
    };
    
    accounts.forEach(account => {
      if (!visited.has(account.id)) {
        dfs(account.id);
      }
    });
    
    return circularRefs;
  }

  private static calculateMaxDepth(accounts: any[]): number {
    const depthMap = new Map<string, number>();
    
    const getDepth = (accountId: string): number => {
      if (depthMap.has(accountId)) {
        return depthMap.get(accountId)!;
      }
      
      const account = accounts.find(acc => acc.id === accountId);
      if (!account || !account.parentId) {
        depthMap.set(accountId, 0);
        return 0;
      }
      
      const depth = getDepth(account.parentId) + 1;
      depthMap.set(accountId, depth);
      return depth;
    };
    
    let maxDepth = 0;
    accounts.forEach(account => {
      maxDepth = Math.max(maxDepth, getDepth(account.id));
    });
    
    return maxDepth;
  }

  private static buildAccountTree(account: any, allAccounts: any[], level: number): any {
    const children = allAccounts
      .filter(acc => acc.parentId === account.id)
      .map(child => this.buildAccountTree(child, allAccounts, level + 1));
    
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      level,
      balance: parseFloat(account.balance.toString()),
      children,
      parent: account.parent ? {
        id: account.parent.id,
        code: account.parent.code,
        name: account.parent.name
      } : undefined
    };
  }
} 