import { PrismaClient } from '@prisma/client';
import { ChartOfAccountsEngine } from './ChartOfAccountsEngine';

const prisma = new PrismaClient();

export interface JournalEntryData {
  description: string;
  reference?: string;
  entries: JournalLineItem[];
  transactionDate?: Date;
  sourceDocument?: {
    type: 'INVOICE' | 'BILL' | 'PAYMENT' | 'ADJUSTMENT' | 'EXPENSE';
    id: string;
  };
}

export interface JournalLineItem {
  accountCode: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
}

export interface JournalEntryResult {
  id: string;
  entryNumber: string;
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  entries: any[];
}

/**
 * 📝 JOURNAL ENTRY ENGINE
 * Manages double-entry journal entries
 */
export class JournalEntryEngine {
  private tenantId: string;
  private chartEngine: ChartOfAccountsEngine;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.chartEngine = new ChartOfAccountsEngine(tenantId);
  }

  /**
   * 📝 CREATE JOURNAL ENTRY
   * Create a balanced double-entry journal entry
   */
  async createJournalEntry(entryData: JournalEntryData): Promise<JournalEntryResult> {
    // Validate the entry
    const validation = this.validateJournalEntry(entryData);
    if (!validation.isValid) {
      throw new Error(`Invalid journal entry: ${validation.errors.join(', ')}`);
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber();

    // Create the main journal entry record
    const book = await this.getOrCreateBook();
    
    // Get account IDs for all account codes
    const accountIds = await this.getAccountIds(entryData.entries.map(e => e.accountCode));
    
    const journalId = `JE-${entryNumber}`;

    // Create individual entry lines
    const entryLines = [];
    for (const line of entryData.entries) {
      const accountId = accountIds[line.accountCode];
      if (!accountId) {
        throw new Error(`Account not found: ${line.accountCode}`);
      }

      const entryLine = await prisma.entry.create({
        data: {
          bookId: book.id,
          accountId: accountId,
          type: line.type,
          amount: line.amount,
          memo: line.description || entryData.description,
          reference: entryData.reference,
          journalId: journalId,
          postedAt: entryData.transactionDate || new Date(),
          tenantId: this.tenantId
        }
      });
      entryLines.push(entryLine);
    }

    const totalDebits = entryData.entries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredits = entryData.entries
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      id: journalId,
      entryNumber,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      totalDebits,
      totalCredits,
      entries: entryLines
    };
  }

  /**
   * Get account IDs for account codes
   */
  private async getAccountIds(accountCodes: string[]): Promise<Record<string, string>> {
    const accounts = await prisma.account.findMany({
      where: {
        code: { in: accountCodes },
        tenantId: this.tenantId
      },
      select: { id: true, code: true }
    });

    const accountIds: Record<string, string> = {};
    for (const account of accounts) {
      accountIds[account.code] = account.id;
    }

    return accountIds;
  }

  /**
   * ✅ VALIDATE JOURNAL ENTRY
   * Ensure entry follows double-entry principles
   */
  validateJournalEntry(entryData: JournalEntryData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Must have at least 2 entries
    if (entryData.entries.length < 2) {
      errors.push('Journal entry must have at least 2 line items');
    }

    // Calculate totals
    const totalDebits = entryData.entries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredits = entryData.entries
      .filter(e => e.type === 'CREDIT')  
      .reduce((sum, e) => sum + e.amount, 0);

    // Must be balanced (debits = credits)
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      errors.push(`Entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }

    // All amounts must be positive
    if (entryData.entries.some(e => e.amount <= 0)) {
      errors.push('All entry amounts must be positive');
    }

    // Account codes must be valid
    for (const entry of entryData.entries) {
      const validation = this.chartEngine.validateAccountCode(entry.accountCode);
      if (!validation.isValid) {
        errors.push(`Invalid account code ${entry.accountCode}: ${validation.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 📄 CREATE INVOICE ENTRIES
   * Create journal entries for an invoice
   */
  async createInvoiceEntries(invoice: any): Promise<JournalEntryResult> {
    const entries: JournalLineItem[] = [];

    // Debit Accounts Receivable
    entries.push({
      accountCode: '1120', // Accounts Receivable
      type: 'DEBIT',
      amount: invoice.totalAmount,
      description: `Invoice ${invoice.invoiceNumber}`
    });

    // Credit Sales Revenue
    entries.push({
      accountCode: '4110', // Product Sales
      type: 'CREDIT',
      amount: invoice.subtotal,
      description: `Sales for invoice ${invoice.invoiceNumber}`
    });

    // Credit Sales Tax Payable if applicable
    if (invoice.taxAmount > 0) {
      entries.push({
        accountCode: '2130', // Sales Tax Payable
        type: 'CREDIT',
        amount: invoice.taxAmount,
        description: `Sales tax for invoice ${invoice.invoiceNumber}`
      });
    }

    return await this.createJournalEntry({
      description: `Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      entries,
      transactionDate: invoice.issueDate
    });
  }

  /**
   * 💰 CREATE PAYMENT ENTRIES
   * Create journal entries for a payment
   */
  async createPaymentEntries(payment: any, invoice?: any): Promise<JournalEntryResult> {
    const entries: JournalLineItem[] = [];

    // Debit Cash
    entries.push({
      accountCode: '1111', // Cash
      type: 'DEBIT',
      amount: payment.amount,
      description: `Payment ${payment.reference}`
    });

    // Credit Accounts Receivable
    entries.push({
      accountCode: '1120', // Accounts Receivable
      type: 'CREDIT',
      amount: payment.amount,
      description: `Payment for ${invoice ? `invoice ${invoice.invoiceNumber}` : 'outstanding balance'}`
    });

    return await this.createJournalEntry({
      description: `Payment ${payment.reference}`,
      reference: payment.reference,
      entries,
      transactionDate: payment.paymentDate
    });
  }

  /**
   * 📦 CREATE PURCHASE ENTRIES
   * Create journal entries for a purchase
   */
  async createPurchaseEntries(bill: any): Promise<JournalEntryResult> {
    const entries: JournalLineItem[] = [];

    // Debit Inventory or Expense
    entries.push({
      accountCode: '1130', // Inventory
      type: 'DEBIT',
      amount: bill.subtotal,
      description: `Purchase ${bill.billNumber}`
    });

    // Credit Accounts Payable
    entries.push({
      accountCode: '2110', // Accounts Payable
      type: 'CREDIT',
      amount: bill.totalAmount,
      description: `Bill ${bill.billNumber}`
    });

    // Debit Sales Tax if applicable
    if (bill.taxAmount > 0) {
      entries.push({
        accountCode: '2130', // Sales Tax Payable
        type: 'DEBIT',
        amount: bill.taxAmount,
        description: `Sales tax for bill ${bill.billNumber}`
      });
    }

    return await this.createJournalEntry({
      description: `Purchase ${bill.billNumber}`,
      reference: bill.billNumber,
      entries,
      transactionDate: bill.billDate
    });
  }

  /**
   * 💸 CREATE EXPENSE ENTRIES
   * Create journal entries for an expense
   */
  async createExpenseEntries(expense: any): Promise<JournalEntryResult> {
    const entries: JournalLineItem[] = [];

    // Debit Expense Account
    entries.push({
      accountCode: expense.accountCode || '5240', // Office Supplies default
      type: 'DEBIT',
      amount: expense.amount,
      description: expense.description
    });

    // Credit Cash
    entries.push({
      accountCode: '1111', // Cash
      type: 'CREDIT',
      amount: expense.amount,
      description: `Payment for ${expense.description}`
    });

    return await this.createJournalEntry({
      description: expense.description,
      reference: expense.reference,
      entries,
      transactionDate: expense.expenseDate
    });
  }

  /**
   * ↩️ REVERSE JOURNAL ENTRY
   * Create a reversing entry for an existing entry
   */
  async reverseJournalEntry(originalEntryId: string, reason: string): Promise<JournalEntryResult> {
    const originalEntries = await prisma.entry.findMany({
      where: { journalId: originalEntryId, tenantId: this.tenantId },
      include: { account: true }
    });

    if (originalEntries.length === 0) {
      throw new Error(`Journal entry ${originalEntryId} not found`);
    }

         const reversedEntries: JournalLineItem[] = originalEntries.map(entry => ({
       accountCode: entry.account.code,
       type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
       amount: parseFloat(entry.amount.toString()),
       description: `REVERSAL: ${entry.memo}`
     }));

    return await this.createJournalEntry({
      description: `Reversal: ${reason}`,
      reference: `REV-${originalEntryId}`,
      entries: reversedEntries
    });
  }

  /**
   * 🔢 GENERATE ENTRY NUMBER
   * Create unique journal entry number
   */
  private async generateEntryNumber(): Promise<string> {
    const lastEntry = await prisma.entry.findFirst({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastEntry) {
      return 'JE-0001';
    }

    const lastNumber = parseInt(lastEntry.journalId.split('-')[1] || '0');
    return `JE-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  /**
   * 📚 GET OR CREATE BOOK
   * Ensure default book exists
   */
  private async getOrCreateBook(): Promise<any> {
    const book = await prisma.book.findFirst({
      where: { tenantId: this.tenantId }
    });

    if (book) {
      return book;
    }

    return await prisma.book.create({
      data: {
        name: 'General Ledger',
        currency: 'USD',
        tenantId: this.tenantId
      }
    });
  }

  /**
   * 📋 GET JOURNAL ENTRIES
   * Retrieve journal entries with filtering
   */
  async getJournalEntries(options: {
    startDate?: Date;
    endDate?: Date;
    accountCode?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const where: any = { tenantId: this.tenantId };

    if (options.startDate || options.endDate) {
      where.postedAt = {};
      if (options.startDate) where.postedAt.gte = options.startDate;
      if (options.endDate) where.postedAt.lte = options.endDate;
    }

    if (options.accountCode) {
      const account = await prisma.account.findFirst({
        where: { code: options.accountCode, tenantId: this.tenantId }
      });
      if (account) {
        where.accountId = account.id;
      }
    }

    return await prisma.entry.findMany({
      where,
      include: {
        account: true,
        book: true
      },
      orderBy: { postedAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    });
  }
} 