import prisma from '../utils/database';
import { AppError } from '../middleware/errorHandler';

export interface JournalEntry {
  id?: string;
  memo: string;
  reference?: string;
  date: string;
  entries: JournalEntryLine[];
  tenantId: string;
  bookId: string;
  status?: 'DRAFT' | 'POSTED' | 'VOIDED';
  metadata?: any;
}

export interface JournalEntryLine {
  id?: string;
  accountId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  currency?: string;
  exchangeRate?: number;
  description?: string;
  metadata?: any;
}

export interface BalanceValidationResult {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  errors: string[];
  warnings: string[];
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
  entryCount: number;
}

export class AccountingLedgerEngine {
  /**
   * 🔍 VALIDATE JOURNAL ENTRY
   * Comprehensive validation of journal entries before posting
   */
  static async validateJournalEntry(entry: JournalEntry): Promise<BalanceValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!entry.memo || entry.memo.trim().length === 0) {
      errors.push('Memo is required');
    }
    
    if (!entry.entries || entry.entries.length < 2) {
      errors.push('At least two entries are required for double-entry accounting');
    }
    
    if (entry.entries.length > 100) {
      warnings.push('Large number of entries detected. Consider splitting into multiple journal entries.');
    }
    
    // Calculate totals
    const totalDebits = entry.entries
      .filter(line => line.type === 'DEBIT')
      .reduce((sum, line) => sum + Math.abs(line.amount), 0);
    
    const totalCredits = entry.entries
      .filter(line => line.type === 'CREDIT')
      .reduce((sum, line) => sum + Math.abs(line.amount), 0);
    
    const difference = Math.abs(totalDebits - totalCredits);
    const isValid = difference < 0.01; // Allow for small rounding differences
    
    if (!isValid) {
      errors.push(`Entries are not balanced. Difference: $${difference.toFixed(2)}`);
    }
    
    // Validate accounts exist and are active
    const accountIds = [...new Set(entry.entries.map(line => line.accountId))];
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        tenantId: entry.tenantId,
        isActive: true
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isActive: true
      }
    });
    
    const foundAccountIds = new Set(accounts.map(acc => acc.id));
    const missingAccounts = accountIds.filter(id => !foundAccountIds.has(id));
    
    if (missingAccounts.length > 0) {
      errors.push(`Invalid or inactive accounts: ${missingAccounts.join(', ')}`);
    }
    
    // Validate account types and entry types
    for (const line of entry.entries) {
      const account = accounts.find(acc => acc.id === line.accountId);
      if (account) {
        // Check for unusual entry patterns
        if (account.type === 'ASSET' && line.type === 'CREDIT' && line.amount > 10000) {
          warnings.push(`Large credit to asset account ${account.code} detected`);
        }
        
        if (account.type === 'LIABILITY' && line.type === 'DEBIT' && line.amount > 10000) {
          warnings.push(`Large debit to liability account ${account.code} detected`);
        }
        
        if (account.type === 'EQUITY' && line.type === 'DEBIT' && line.amount > 5000) {
          warnings.push(`Debit to equity account ${account.code} detected`);
        }
      }
    }
    
    // Check for duplicate entries
    const entrySignatures = entry.entries.map(line => 
      `${line.accountId}-${line.type}-${line.amount}`
    );
    const uniqueSignatures = new Set(entrySignatures);
    
    if (entrySignatures.length !== uniqueSignatures.size) {
      warnings.push('Duplicate entries detected');
    }
    
    // Validate currency and exchange rates
    for (const line of entry.entries) {
      if (line.currency && line.currency !== 'USD') {
        if (!line.exchangeRate || line.exchangeRate <= 0) {
          errors.push(`Exchange rate required for non-USD currency: ${line.currency}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      totalDebits,
      totalCredits,
      difference,
      errors,
      warnings
    };
  }

  /**
   * 📝 POST JOURNAL ENTRY
   * Post a validated journal entry to the ledger
   */
  static async postJournalEntry(entry: JournalEntry): Promise<{
    journalId: string;
    postedEntries: any[];
    balanceChanges: AccountBalance[];
  }> {
    // Validate the entry first
    const validation = await this.validateJournalEntry(entry);
    if (!validation.isValid) {
      throw new AppError(`Journal entry validation failed: ${validation.errors.join(', ')}`, 400);
    }
    
    // Generate journal ID
    const journalId = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Post entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const postedEntries = [];
      const balanceChanges: AccountBalance[] = [];
      
      // Create entries
      for (const line of entry.entries) {
        const postedEntry = await tx.entry.create({
          data: {
            accountId: line.accountId,
            bookId: entry.bookId,
            tenantId: entry.tenantId,
            amount: line.amount,
            currency: line.currency || 'USD',
            exchangeRate: line.exchangeRate || 1,
            type: line.type,
            memo: line.description || entry.memo,
            reference: entry.reference,
            journalId,
            metadata: line.metadata
          }
        });
        
        postedEntries.push(postedEntry);
        
        // Update account balance
        const account = await tx.account.findUnique({
          where: { id: line.accountId }
        });
        
        if (account) {
          const balanceChange = line.type === 'DEBIT' ? line.amount : -line.amount;
          const newBalance = parseFloat(account.balance.toString()) + balanceChange;
          
          await tx.account.update({
            where: { id: line.accountId },
            data: { balance: newBalance }
          });
          
          balanceChanges.push({
            accountId: line.accountId,
            accountCode: account.code,
            accountName: account.name,
            balance: newBalance,
            currency: account.currency,
            lastUpdated: new Date(),
            entryCount: 1
          });
        }
      }
      
      return { postedEntries, balanceChanges };
    });
    
    return {
      journalId,
      postedEntries: result.postedEntries,
      balanceChanges: result.balanceChanges
    };
  }

  /**
   * 🔄 VOID JOURNAL ENTRY
   * Void a posted journal entry with automatic balance reversal
   */
  static async voidJournalEntry(journalId: string, tenantId: string, reason?: string): Promise<{
    voidedEntries: any[];
    balanceReversals: AccountBalance[];
  }> {
    // Find all entries for this journal
    const entries = await prisma.entry.findMany({
      where: { journalId, tenantId },
      include: { account: true }
    });
    
    if (entries.length === 0) {
      throw new AppError('Journal entry not found', 404);
    }
    
    // Create reversal entries
    const reversalJournalId = `REV-${journalId}`;
    const reversalEntries: JournalEntryLine[] = entries.map(entry => ({
      accountId: entry.accountId,
      amount: parseFloat(entry.amount.toString()),
      type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      currency: entry.currency,
      exchangeRate: parseFloat(entry.exchangeRate.toString()),
      description: `Reversal: ${entry.memo}`,
      metadata: { 
        originalJournalId: journalId,
        reversalReason: reason || 'Manual void',
        reversedAt: new Date()
      }
    }));
    
    // Post reversal entries
    const result = await this.postJournalEntry({
      memo: `Reversal of ${journalId}`,
      reference: reversalJournalId,
      date: new Date().toISOString().split('T')[0],
      entries: reversalEntries,
      tenantId,
      bookId: entries[0].bookId,
      status: 'POSTED',
      metadata: { reversalReason: reason }
    });
    
    return {
      voidedEntries: entries,
      balanceReversals: result.balanceChanges
    };
  }

  /**
   * 📊 GET TRIAL BALANCE
   * Generate trial balance with real-time account balances
   */
  static async getTrialBalance(tenantId: string, bookId?: string, asOfDate?: Date): Promise<{
    accounts: AccountBalance[];
    totals: {
      totalDebits: number;
      totalCredits: number;
      difference: number;
    };
    summary: {
      totalAccounts: number;
      activeAccounts: number;
      zeroBalanceAccounts: number;
    };
  }> {
    const where: any = { tenantId, isActive: true };
    if (bookId) where.bookId = bookId;
    
    const accounts = await prisma.account.findMany({
      where,
      include: {
        entries: {
          where: asOfDate ? {
            postedAt: { lte: asOfDate }
          } : undefined
        }
      }
    });
    
    const accountBalances: AccountBalance[] = accounts.map(account => {
      const balance = account.entries.reduce((sum, entry) => {
        const amount = parseFloat(entry.amount.toString());
        return sum + (entry.type === 'DEBIT' ? amount : -amount);
      }, 0);
      
      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        balance,
        currency: account.currency,
        lastUpdated: new Date(),
        entryCount: account.entries.length
      };
    });
    
    // Calculate totals
    const totalDebits = accountBalances
      .filter(acc => acc.balance > 0)
      .reduce((sum, acc) => sum + acc.balance, 0);
    
    const totalCredits = accountBalances
      .filter(acc => acc.balance < 0)
      .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
    
    const difference = Math.abs(totalDebits - totalCredits);
    
    return {
      accounts: accountBalances,
      totals: {
        totalDebits,
        totalCredits,
        difference
      },
      summary: {
        totalAccounts: accountBalances.length,
        activeAccounts: accountBalances.filter(acc => acc.entryCount > 0).length,
        zeroBalanceAccounts: accountBalances.filter(acc => Math.abs(acc.balance) < 0.01).length
      }
    };
  }

  /**
   * 🔍 REAL-TIME BALANCE VALIDATION
   * Continuous monitoring of account balances for anomalies
   */
  static async validateAccountBalances(tenantId: string): Promise<{
    anomalies: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      issue: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      suggestedAction: string;
    }>;
    summary: {
      totalAnomalies: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
    };
  }> {
    const anomalies = [];
    
    // Get all accounts with recent activity
    const accounts = await prisma.account.findMany({
      where: { tenantId, isActive: true },
      include: {
        entries: {
          where: {
            postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          },
          orderBy: { postedAt: 'desc' }
        }
      }
    });
    
    for (const account of accounts) {
      const balance = parseFloat(account.balance.toString());
      const recentEntries = account.entries;
      
      // Check for unusual balance patterns
      if (account.type === 'ASSET' && balance < 0) {
        anomalies.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          issue: 'Negative asset balance detected',
          severity: 'HIGH' as const,
          suggestedAction: 'Review recent transactions and consider adjustments'
        });
      }
      
      if (account.type === 'LIABILITY' && balance > 0) {
        anomalies.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          issue: 'Positive liability balance detected',
          severity: 'MEDIUM' as const,
          suggestedAction: 'Verify liability calculations and payment records'
        });
      }
      
      if (account.type === 'REVENUE' && balance < 0) {
        anomalies.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          issue: 'Negative revenue balance detected',
          severity: 'HIGH' as const,
          suggestedAction: 'Review revenue recognition and adjustments'
        });
      }
      
          // Check for unusual transaction patterns
    if (recentEntries.length > 0) {
      const largeTransactions = recentEntries.filter(entry => 
        parseFloat(entry.amount.toString()) > 10000
      );
      
      if (largeTransactions.length > 5) {
        anomalies.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          issue: 'Unusual number of large transactions',
          severity: 'MEDIUM' as const,
          suggestedAction: 'Review transaction patterns for accuracy'
        });
      }
    }
    
    // Check for dormant accounts with recent activity
    if (recentEntries.length === 0 && balance !== 0) {
      anomalies.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        issue: 'Dormant account with non-zero balance',
        severity: 'LOW' as const,
        suggestedAction: 'Consider account cleanup or reconciliation'
      });
    }
    }
    
    const summary = {
      totalAnomalies: anomalies.length,
      highSeverity: anomalies.filter(a => a.severity === 'HIGH').length,
      mediumSeverity: anomalies.filter(a => a.severity === 'MEDIUM').length,
      lowSeverity: anomalies.filter(a => a.severity === 'LOW').length
    };
    
    return { anomalies, summary };
  }

  /**
   * 📈 GENERATE ACCOUNTING INSIGHTS
   * AI-powered insights based on ledger analysis
   */
  static async generateAccountingInsights(tenantId: string): Promise<Array<{
    type: 'PERFORMANCE' | 'COMPLIANCE' | 'EFFICIENCY' | 'RISK';
    title: string;
    description: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
    data?: any;
    recommendations: string[];
  }>> {
    const insights = [];
    
    // Get trial balance
    const trialBalance = await this.getTrialBalance(tenantId);
    
    // Analyze balance sheet ratios
    const assetAccounts = trialBalance.accounts.filter(acc => 
      acc.accountCode.startsWith('1') || acc.accountName.toLowerCase().includes('asset')
    );
    const liabilityAccounts = trialBalance.accounts.filter(acc => 
      acc.accountCode.startsWith('2') || acc.accountName.toLowerCase().includes('liability')
    );
    const equityAccounts = trialBalance.accounts.filter(acc => 
      acc.accountCode.startsWith('3') || acc.accountName.toLowerCase().includes('equity')
    );
    
    const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
    const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    // Current ratio analysis
    const currentAssets = assetAccounts.filter(acc => 
      acc.accountName.toLowerCase().includes('cash') || 
      acc.accountName.toLowerCase().includes('receivable') ||
      acc.accountName.toLowerCase().includes('inventory')
    ).reduce((sum, acc) => sum + acc.balance, 0);
    
    const currentLiabilities = liabilityAccounts.filter(acc => 
      acc.accountName.toLowerCase().includes('payable') ||
      acc.accountName.toLowerCase().includes('short-term')
    ).reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
    
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    
    if (currentRatio < 1) {
      insights.push({
        type: 'RISK' as const,
        title: 'Low Liquidity Ratio',
        description: `Current ratio of ${currentRatio.toFixed(2)} indicates potential liquidity issues`,
        impact: 'NEGATIVE' as const,
        confidence: 0.85,
        data: { currentRatio, currentAssets, currentLiabilities },
        recommendations: [
          'Increase current assets through better cash management',
          'Reduce current liabilities by negotiating payment terms',
          'Consider short-term financing options'
        ]
      });
    } else if (currentRatio > 3) {
      insights.push({
        type: 'EFFICIENCY' as const,
        title: 'High Liquidity Ratio',
        description: `Current ratio of ${currentRatio.toFixed(2)} may indicate underutilized assets`,
        impact: 'NEUTRAL' as const,
        confidence: 0.75,
        data: { currentRatio, currentAssets, currentLiabilities },
        recommendations: [
          'Consider investing excess cash for better returns',
          'Review working capital management strategies',
          'Evaluate opportunities for growth investments'
        ]
      });
    }
    
    // Debt-to-equity analysis
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;
    
    if (debtToEquity > 1) {
      insights.push({
        type: 'RISK' as const,
        title: 'High Leverage',
        description: `Debt-to-equity ratio of ${debtToEquity.toFixed(2)} indicates significant leverage`,
        impact: 'NEGATIVE' as const,
        confidence: 0.80,
        data: { debtToEquity, totalLiabilities, totalEquity },
        recommendations: [
          'Monitor debt levels closely',
          'Consider debt reduction strategies',
          'Review interest coverage ratios'
        ]
      });
    }
    
    // Account activity analysis
    const inactiveAccounts = trialBalance.accounts.filter(acc => acc.entryCount === 0);
    
    if (inactiveAccounts.length > 5) {
      insights.push({
        type: 'EFFICIENCY' as const,
        title: 'Inactive Accounts',
        description: `${inactiveAccounts.length} accounts have no recent activity`,
        impact: 'NEUTRAL' as const,
        confidence: 0.90,
        data: { inactiveAccounts: inactiveAccounts.length },
        recommendations: [
          'Review and potentially close unused accounts',
          'Consolidate similar inactive accounts',
          'Update chart of accounts structure'
        ]
      });
    }
    
    // Balance accuracy check
    const accountingEquation = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    
    if (accountingEquation > 1) {
      insights.push({
        type: 'COMPLIANCE' as const,
        title: 'Accounting Equation Imbalance',
        description: `Assets ≠ Liabilities + Equity (difference: $${accountingEquation.toFixed(2)})`,
        impact: 'NEGATIVE' as const,
        confidence: 0.95,
        data: { accountingEquation, totalAssets, totalLiabilities, totalEquity },
        recommendations: [
          'Investigate and correct the imbalance',
          'Review recent journal entries for errors',
          'Perform account reconciliation'
        ]
      });
    }
    
    return insights;
  }
} 