/**
 * 📖 JOURNAL ENTRY MODELS
 * Core models for double-entry bookkeeping system
 */

export interface JournalEntry {
  id: string;
  entryNumber: string;
  description: string;
  reference?: string;
  transactionDate: Date;
  totalAmount: number;
  status: JournalEntryStatus;
  sourceDocument?: SourceDocument;
  entries: JournalLineItem[];
  createdBy: string;
  approvedBy?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLineItem {
  id: string;
  journalEntryId: string;
  accountCode: string;
  accountName: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
  reference?: string;
  lineNumber: number;
}

export interface SourceDocument {
  type: 'INVOICE' | 'BILL' | 'PAYMENT' | 'ADJUSTMENT' | 'EXPENSE' | 'TRANSFER' | 'OPENING_BALANCE';
  id: string;
  number?: string;
  metadata?: Record<string, any>;
}

export type JournalEntryStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'POSTED'
  | 'CANCELLED'
  | 'REVERSED';

/**
 * 📋 JOURNAL ENTRY TEMPLATE
 * Pre-defined journal entry templates for common transactions
 */
export interface JournalEntryTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  entryLines: JournalTemplateLineItem[];
  isActive: boolean;
  tenantId: string;
}

export interface JournalTemplateLineItem {
  accountCode: string;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  isVariable: boolean; // If amount needs to be entered
  defaultAmount?: number;
  calculationFormula?: string; // For calculated amounts
}

export type TemplateCategory = 
  | 'SALES'
  | 'PURCHASES'
  | 'PAYMENTS'
  | 'ADJUSTMENTS'
  | 'PAYROLL'
  | 'BANKING'
  | 'INVENTORY'
  | 'DEPRECIATION';

/**
 * 📊 JOURNAL ENTRY BATCH
 * For processing multiple journal entries together
 */
export interface JournalEntryBatch {
  id: string;
  batchNumber: string;
  description: string;
  totalEntries: number;
  totalAmount: number;
  status: BatchStatus;
  entries: JournalEntry[];
  processedAt?: Date;
  processedBy?: string;
  tenantId: string;
  createdAt: Date;
}

export type BatchStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * ⚖️ JOURNAL ENTRY VALIDATION
 * Validation rules and results for journal entries
 */
export interface JournalEntryValidation {
  isValid: boolean;
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  lineNumber?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  lineNumber?: number;
}

/**
 * 🔄 JOURNAL ENTRY REVERSAL
 * Information about reversed entries
 */
export interface JournalEntryReversal {
  id: string;
  originalEntryId: string;
  reversalEntryId: string;
  reason: string;
  reversalDate: Date;
  reversedBy: string;
  isAutoReversal: boolean;
  tenantId: string;
  createdAt: Date;
}

/**
 * 🎯 JOURNAL ENTRY UTILITIES
 * Helper functions for journal entry operations
 */
export class JournalEntryUtils {
  /**
   * Validate a journal entry follows double-entry principles
   */
  static validateJournalEntry(entry: Partial<JournalEntry>): JournalEntryValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!entry.entries || entry.entries.length < 2) {
      errors.push({
        code: 'INSUFFICIENT_ENTRIES',
        message: 'Journal entry must have at least 2 line items'
      });
    }

    if (!entry.description?.trim()) {
      errors.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Journal entry description is required'
      });
    }

    let totalDebits = 0;
    let totalCredits = 0;

    entry.entries?.forEach((line, index) => {
      // Validate line item
      if (!line.accountCode) {
        errors.push({
          code: 'MISSING_ACCOUNT',
          message: 'Account code is required',
          lineNumber: index + 1
        });
      }

      if (!line.amount || line.amount <= 0) {
        errors.push({
          code: 'INVALID_AMOUNT',
          message: 'Amount must be positive',
          lineNumber: index + 1
        });
      }

      if (line.type === 'DEBIT') {
        totalDebits += line.amount || 0;
      } else {
        totalCredits += line.amount || 0;
      }
    });

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    if (!isBalanced) {
      errors.push({
        code: 'UNBALANCED_ENTRY',
        message: `Entry is not balanced. Debits: $${totalDebits.toFixed(2)}, Credits: $${totalCredits.toFixed(2)}`
      });
    }

    // Add warnings for unusual patterns
    if (entry.entries && entry.entries.length > 10) {
      warnings.push({
        code: 'MANY_LINE_ITEMS',
        message: 'Journal entry has many line items. Consider breaking into multiple entries.'
      });
    }

    if (totalDebits > 100000) {
      warnings.push({
        code: 'LARGE_AMOUNT',
        message: 'Large transaction amount detected. Please verify accuracy.'
      });
    }

    return {
      isValid: errors.length === 0,
      isBalanced,
      totalDebits,
      totalCredits,
      errors,
      warnings
    };
  }

  /**
   * Generate entry number based on sequence
   */
  static generateEntryNumber(sequence: number, prefix = 'JE'): string {
    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Create a reversing entry for the given entry
   */
  static createReversingEntry(originalEntry: JournalEntry, reason: string): Partial<JournalEntry> {
    return {
      description: `REVERSAL: ${originalEntry.description}`,
      reference: `REV-${originalEntry.entryNumber}`,
      transactionDate: new Date(),
      sourceDocument: {
        type: 'ADJUSTMENT',
        id: originalEntry.id,
        metadata: { reversalReason: reason }
      },
      entries: originalEntry.entries.map(line => ({
        ...line,
        id: '', // Will be generated
        type: line.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        description: `REVERSAL: ${line.description}`
      }))
    };
  }

  /**
   * Calculate the total amount for a journal entry
   */
  static calculateTotalAmount(entries: JournalLineItem[]): number {
    return entries
      .filter(entry => entry.type === 'DEBIT')
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  /**
   * Group entries by account for summary display
   */
  static groupEntriesByAccount(entries: JournalLineItem[]): Record<string, {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    netAmount: number;
  }> {
    const grouped: Record<string, any> = {};

    entries.forEach(entry => {
      if (!grouped[entry.accountCode]) {
        grouped[entry.accountCode] = {
          accountCode: entry.accountCode,
          accountName: entry.accountName,
          debitAmount: 0,
          creditAmount: 0,
          netAmount: 0
        };
      }

      if (entry.type === 'DEBIT') {
        grouped[entry.accountCode].debitAmount += entry.amount;
      } else {
        grouped[entry.accountCode].creditAmount += entry.amount;
      }

      grouped[entry.accountCode].netAmount = 
        grouped[entry.accountCode].debitAmount - grouped[entry.accountCode].creditAmount;
    });

    return grouped;
  }
} 