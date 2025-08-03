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
   * Create journal entries for an invoice based on status
   * 
   * Status-based Journal Entry Logic:
   * - DRAFT: No journal entries (no accounting impact)
   * - SENT: Creates A/R and Revenue recognition entries
   * - PAID: Handled separately in createPaymentEntries
   * 
   * SENT Invoice Entries:
   * DR: Accounts Receivable (Asset) - Customer owes money
   * CR: Sales Revenue (Revenue) - Revenue recognition
   * CR: Sales Tax Payable (Liability) - Tax owed to government
   */
  async createInvoiceEntries(invoice: any): Promise<JournalEntryResult> {
    // Validate invoice status - only create entries for SENT invoices
    if (invoice.status === 'DRAFT') {
      throw new Error(`Cannot create journal entries for DRAFT invoice ${invoice.invoiceNumber}. Invoice must be SENT first.`);
    }

    if (invoice.status !== 'SENT' && invoice.status !== 'VIEWED' && invoice.status !== 'PARTIALLY_PAID' && invoice.status !== 'OVERDUE') {
      console.warn(`Warning: Creating journal entries for invoice ${invoice.invoiceNumber} with status ${invoice.status}. This may not be appropriate.`);
    }

    const entries: JournalLineItem[] = [];

    // 1. Debit Accounts Receivable (Asset increases)
    // Customer now owes us money
    entries.push({
      accountCode: '1100', // Accounts Receivable
      type: 'DEBIT',
      amount: invoice.totalAmount,
      description: `A/R - Invoice ${invoice.invoiceNumber} (${invoice.customer?.name || 'Customer'})`
    });

    // 2. Credit Sales Revenue (Revenue increases)
    // Revenue recognition when invoice is sent (accrual accounting)
    entries.push({
      accountCode: '4000', // Sales Revenue
      type: 'CREDIT',
      amount: invoice.subtotal,
      description: `Sales Revenue - Invoice ${invoice.invoiceNumber}`
    });

    // 3. Credit Sales Tax Payable if applicable (Liability increases)
    // We owe sales tax to the government
    if (invoice.taxAmount > 0) {
      entries.push({
        accountCode: '2300', // Sales Tax Payable (changed from 2100 for clarity)
        type: 'CREDIT',
        amount: invoice.taxAmount,
        description: `Sales Tax Payable - Invoice ${invoice.invoiceNumber}`
      });
    }

    console.log(`✅ Creating journal entries for ${invoice.status} invoice ${invoice.invoiceNumber}:`, {
      totalAmount: invoice.totalAmount,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      entriesCount: entries.length
    });

    return await this.createJournalEntry({
      description: `Invoice ${invoice.invoiceNumber} - Revenue Recognition`,
      reference: invoice.invoiceNumber,
      entries,
      transactionDate: invoice.issueDate
    });
  }

  /**
   * 💰 CREATE PAYMENT ENTRIES
   * Create journal entries for a payment against an invoice
   * 
   * Payment Logic:
   * - Only create entries for invoices that are SENT, VIEWED, PARTIALLY_PAID, or OVERDUE
   * - DRAFT invoices cannot receive payments (no A/R balance exists)
   * - PAID invoices should not receive additional payments (validates status)
   * 
   * Payment Entries:
   * DR: Cash/Bank Account (Asset) - Money received
   * CR: Accounts Receivable (Asset) - Customer debt reduced
   */
  async createPaymentEntries(payment: any, invoice?: any): Promise<JournalEntryResult> {
    // Validate that we can apply payment to this invoice
    if (invoice) {
      if (invoice.status === 'DRAFT') {
        throw new Error(`Cannot apply payment to DRAFT invoice ${invoice.invoiceNumber}. Invoice must be SENT first.`);
      }
      
      if (invoice.status === 'PAID') {
        console.warn(`Warning: Applying payment to already PAID invoice ${invoice.invoiceNumber}. This may create overpayment.`);
      }

      if (invoice.status === 'CANCELLED') {
        throw new Error(`Cannot apply payment to CANCELLED invoice ${invoice.invoiceNumber}.`);
      }
    }

    const entries: JournalLineItem[] = [];

    // 1. Debit Cash/Bank Account (Asset increases)
    // We receive money from customer
    const accountCode = payment.paymentMethodId ? '1010' : '1000'; // Bank vs Cash
    entries.push({
      accountCode, // Cash (1000) or Bank (1010)
      type: 'DEBIT',
      amount: payment.amount,
      description: `Payment received - ${payment.reference} ${invoice ? `(Invoice ${invoice.invoiceNumber})` : ''}`
    });

    // 2. Credit Accounts Receivable (Asset decreases)
    // Customer debt is reduced
    entries.push({
      accountCode: '1100', // Accounts Receivable
      type: 'CREDIT',
      amount: payment.amount,
      description: `A/R reduction - ${payment.reference} ${invoice ? `(Invoice ${invoice.invoiceNumber})` : ''}`
    });

    // Handle bank charges if applicable
    if (payment.bankCharges && payment.bankCharges > 0) {
      // Debit Bank Charges Expense
      entries.push({
        accountCode: '6200', // Bank Charges Expense
        type: 'DEBIT',
        amount: payment.bankCharges,
        description: `Bank charges - ${payment.reference}`
      });

      // Additional credit to cash to balance the bank charges
      entries.push({
        accountCode,
        type: 'CREDIT',
        amount: payment.bankCharges,
        description: `Bank charges deduction - ${payment.reference}`
      });
    }

    console.log(`✅ Creating payment entries for ${payment.reference}:`, {
      amount: payment.amount,
      bankCharges: payment.bankCharges || 0,
      invoice: invoice ? `${invoice.invoiceNumber} (${invoice.status})` : 'N/A',
      entriesCount: entries.length
    });

    return await this.createJournalEntry({
      description: `Payment Received - ${payment.reference}${invoice ? ` (Invoice ${invoice.invoiceNumber})` : ''}`,
      reference: payment.reference,
      entries,
      transactionDate: payment.paymentDate
    });
  }

  /**
   * 🔄 HANDLE INVOICE STATUS CHANGE
   * Manages journal entries based on invoice status transitions
   * 
   * Status Transition Logic:
   * DRAFT → SENT: Create revenue recognition entries
   * SENT → PAID: Create payment entries (handled separately)
   * SENT → CANCELLED: Create reversal entries
   * PAID → REFUNDED: Create refund entries
   */
  async handleInvoiceStatusChange(invoice: any, oldStatus: string, newStatus: string): Promise<JournalEntryResult | null> {
    console.log(`🔄 Invoice ${invoice.invoiceNumber} status change: ${oldStatus} → ${newStatus}`);

    switch (`${oldStatus}_TO_${newStatus}`) {
      case 'DRAFT_TO_SENT':
      case 'DRAFT_TO_VIEWED':
        // Create revenue recognition entries when invoice is sent
        return await this.createInvoiceEntries(invoice);

      case 'SENT_TO_CANCELLED':
      case 'VIEWED_TO_CANCELLED':
      case 'PARTIALLY_PAID_TO_CANCELLED':
        // Create reversal entries to cancel the invoice
        return await this.createInvoiceReversalEntries(invoice);

      case 'PAID_TO_REFUNDED':
        // Create refund entries
        return await this.createRefundEntries(invoice);

      case 'SENT_TO_OVERDUE':
      case 'VIEWED_TO_OVERDUE':
      case 'PARTIALLY_PAID_TO_OVERDUE':
        // No journal entries needed for overdue status - just a status change
        console.log(`✅ Invoice ${invoice.invoiceNumber} marked as overdue - no journal entries required`);
        return null;

      case 'SENT_TO_PAID':
      case 'VIEWED_TO_PAID':
      case 'PARTIALLY_PAID_TO_PAID':
      case 'OVERDUE_TO_PAID':
        // Payment entries are handled separately in createPaymentEntries
        console.log(`✅ Invoice ${invoice.invoiceNumber} marked as paid - payment entries handled separately`);
        return null;

      default:
        console.log(`⚠️ No journal entry action defined for status change: ${oldStatus} → ${newStatus}`);
        return null;
    }
  }

  /**
   * ↩️ CREATE INVOICE REVERSAL ENTRIES
   * Creates reversing entries when an invoice is cancelled
   */
  async createInvoiceReversalEntries(invoice: any): Promise<JournalEntryResult> {
    const entries: JournalLineItem[] = [];

    // Reverse the original invoice entries by swapping debits/credits
    
    // 1. Credit Accounts Receivable (reverse the original debit)
    entries.push({
      accountCode: '1100', // Accounts Receivable
      type: 'CREDIT',
      amount: invoice.totalAmount,
      description: `A/R Reversal - Cancelled Invoice ${invoice.invoiceNumber}`
    });

    // 2. Debit Sales Revenue (reverse the original credit)
    entries.push({
      accountCode: '4000', // Sales Revenue
      type: 'DEBIT',
      amount: invoice.subtotal,
      description: `Sales Revenue Reversal - Cancelled Invoice ${invoice.invoiceNumber}`
    });

    // 3. Debit Sales Tax Payable if applicable (reverse the original credit)
    if (invoice.taxAmount > 0) {
      entries.push({
        accountCode: '2300', // Sales Tax Payable
        type: 'DEBIT',
        amount: invoice.taxAmount,
        description: `Sales Tax Reversal - Cancelled Invoice ${invoice.invoiceNumber}`
      });
    }

    console.log(`❌ Creating reversal entries for cancelled invoice ${invoice.invoiceNumber}:`, {
      totalAmount: invoice.totalAmount,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      entriesCount: entries.length
    });

    return await this.createJournalEntry({
      description: `Invoice ${invoice.invoiceNumber} - Cancellation Reversal`,
      reference: `${invoice.invoiceNumber}-CANCELLED`,
      entries,
      transactionDate: new Date()
    });
  }

  /**
   * 💸 CREATE REFUND ENTRIES
   * Creates entries when refunding a paid invoice
   */
  async createRefundEntries(invoice: any): Promise<JournalEntryResult> {
    const entries: JournalLineItem[] = [];

    // Refund process: reverse the payment and revenue
    
    // 1. Credit Cash/Bank (money going out)
    entries.push({
      accountCode: '1000', // Cash (could be enhanced to use actual payment method)
      type: 'CREDIT',
      amount: invoice.totalAmount,
      description: `Refund - Invoice ${invoice.invoiceNumber}`
    });

    // 2. Debit Accounts Receivable (recreate the debt)
    entries.push({
      accountCode: '1100', // Accounts Receivable
      type: 'DEBIT',
      amount: invoice.totalAmount,
      description: `A/R Restoration - Refund Invoice ${invoice.invoiceNumber}`
    });

    // Note: In practice, you might also want to reverse revenue depending on accounting policy

    console.log(`💸 Creating refund entries for invoice ${invoice.invoiceNumber}:`, {
      totalAmount: invoice.totalAmount,
      entriesCount: entries.length
    });

    return await this.createJournalEntry({
      description: `Invoice ${invoice.invoiceNumber} - Refund`,
      reference: `${invoice.invoiceNumber}-REFUND`,
      entries,
      transactionDate: new Date()
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
      return '0001';
    }

    // Extract number from journalId (e.g., "JE-0001" -> 1)
    const journalIdParts = lastEntry.journalId.split('-');
    const lastNumberStr = journalIdParts[journalIdParts.length - 1] || '0';
    const lastNumber = parseInt(lastNumberStr);
    
    if (isNaN(lastNumber)) {
      return '0001';
    }
    
    return String(lastNumber + 1).padStart(4, '0');
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

    // Get tenant's base currency
    const tenant = await prisma.tenant.findFirst({
      where: { id: this.tenantId },
      select: { baseCurrency: true }
    });

    const baseCurrency = tenant?.baseCurrency || 'MMK';

    return await prisma.book.create({
      data: {
        name: 'General Ledger',
        currency: baseCurrency,
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
    reference?: string;
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

    if (options.reference) {
      where.reference = options.reference;
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