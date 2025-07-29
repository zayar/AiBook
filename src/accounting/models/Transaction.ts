/**
 * 💳 TRANSACTION MODELS
 * Core transaction models for business operations
 */

export interface BaseTransaction {
  id: string;
  transactionNumber: string;
  transactionDate: Date;
  description: string;
  reference?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  exchangeRate: number;
  status: TransactionStatus;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate?: number;
  accountCode?: string;
}

export type TransactionStatus = 
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REVERSED';

/**
 * 🧾 INVOICE TRANSACTION
 */
export interface InvoiceTransaction extends BaseTransaction {
  type: 'INVOICE';
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  dueDate: Date;
  items: TransactionItem[];
  payments: PaymentTransaction[];
  isOverdue: boolean;
  daysPastDue: number;
}

/**
 * 💰 PAYMENT TRANSACTION
 */
export interface PaymentTransaction {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string;
  invoiceId?: string;
  customerId?: string;
  bankAccountId?: string;
  status: TransactionStatus;
  tenantId: string;
}

export type PaymentMethod = 
  | 'CASH'
  | 'CHECK'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'ACH'
  | 'PAYPAL'
  | 'OTHER';

/**
 * 🛒 PURCHASE TRANSACTION
 */
export interface PurchaseTransaction extends BaseTransaction {
  type: 'PURCHASE';
  vendorId: string;
  vendorName: string;
  purchaseNumber: string;
  items: TransactionItem[];
  bills: BillTransaction[];
}

/**
 * 📄 BILL TRANSACTION
 */
export interface BillTransaction extends BaseTransaction {
  type: 'BILL';
  vendorId: string;
  vendorName: string;
  billNumber: string;
  dueDate: Date;
  purchaseId?: string;
  items: TransactionItem[];
  payments: PaymentTransaction[];
  isOverdue: boolean;
  daysPastDue: number;
}

/**
 * 💸 EXPENSE TRANSACTION
 */
export interface ExpenseTransaction {
  id: string;
  description: string;
  amount: number;
  expenseDate: Date;
  category: string;
  subcategory?: string;
  accountCode: string;
  vendor?: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  billable: boolean;
  customerId?: string;
  projectId?: string;
  status: TransactionStatus;
  tenantId: string;
  userId: string;
}

/**
 * 🏦 BANK TRANSACTION
 */
export interface BankTransaction {
  id: string;
  bankAccountId: string;
  description: string;
  amount: number;
  transactionDate: Date;
  type: BankTransactionType;
  reference?: string;
  balance?: number;
  category?: string;
  matched: boolean;
  matchedEntryId?: string;
  tenantId: string;
}

export type BankTransactionType = 
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'FEE'
  | 'INTEREST'
  | 'ADJUSTMENT';

/**
 * 🎯 TRANSACTION UTILITIES
 */
export class TransactionUtils {
  /**
   * Calculate transaction totals
   */
  static calculateTotals(items: TransactionItem[]): {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemTax = item.totalPrice * ((item.taxRate || 0) / 100);
      return sum + itemTax;
    }, 0);
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  }

  /**
   * Determine if transaction is overdue
   */
  static isOverdue(dueDate: Date): boolean {
    return new Date() > dueDate;
  }

  /**
   * Calculate days past due
   */
  static daysPastDue(dueDate: Date): number {
    if (!this.isOverdue(dueDate)) return 0;
    
    const now = new Date();
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate transaction number
   */
  static generateTransactionNumber(type: string, sequence: number): string {
    const prefixes = {
      INVOICE: 'INV',
      PAYMENT: 'PMT',
      PURCHASE: 'PO',
      BILL: 'BILL',
      EXPENSE: 'EXP'
    };

    const prefix = prefixes[type as keyof typeof prefixes] || 'TXN';
    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Validate transaction data
   */
  static validateTransaction(transaction: Partial<BaseTransaction>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!transaction.description?.trim()) {
      errors.push('Description is required');
    }

    if (!transaction.transactionDate) {
      errors.push('Transaction date is required');
    }

    if (!transaction.totalAmount || transaction.totalAmount <= 0) {
      errors.push('Total amount must be positive');
    }

    if (transaction.subtotal && transaction.taxAmount && transaction.totalAmount) {
      const expectedTotal = transaction.subtotal + transaction.taxAmount;
      if (Math.abs(transaction.totalAmount - expectedTotal) > 0.01) {
        errors.push('Total amount does not match subtotal + tax amount');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 