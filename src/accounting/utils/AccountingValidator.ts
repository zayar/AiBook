import { AccountType } from '@prisma/client';
import { JournalEntry, JournalEntryValidation, ValidationError, ValidationWarning } from '../models/JournalEntry';
import { Account } from '../models/Account';

/**
 * ✅ ACCOUNTING VALIDATOR
 * 
 * Comprehensive validation for all accounting operations including:
 * - Double-entry validation
 * - Account code validation
 * - Transaction validation
 * - Financial statement validation
 * - Compliance checks
 */
export class AccountingValidator {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 📖 VALIDATE JOURNAL ENTRY
   * Complete validation of journal entry structure and rules
   */
  validateJournalEntry(entry: Partial<JournalEntry>): JournalEntryValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Basic structure validation
    this.validateBasicStructure(entry, errors);

    // 2. Double-entry validation
    const { totalDebits, totalCredits, isBalanced } = this.validateDoubleEntry(entry, errors);

    // 3. Account validation
    this.validateAccounts(entry, errors, warnings);

    // 4. Amount validation
    this.validateAmounts(entry, errors, warnings);

    // 5. Date validation
    this.validateDates(entry, errors, warnings);

    // 6. Business rule validation
    this.validateBusinessRules(entry, errors, warnings);

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
   * 🏗️ VALIDATE ACCOUNT STRUCTURE
   * Validate account code and hierarchy
   */
  validateAccount(account: Partial<Account>): {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Account code validation
    if (!account.code) {
      errors.push({
        code: 'MISSING_ACCOUNT_CODE',
        message: 'Account code is required',
        field: 'code'
      });
    } else {
      const codeValidation = this.validateAccountCode(account.code);
      if (!codeValidation.isValid) {
        errors.push(...codeValidation.errors);
      }
    }

    // Account name validation
    if (!account.name?.trim()) {
      errors.push({
        code: 'MISSING_ACCOUNT_NAME',
        message: 'Account name is required',
        field: 'name'
      });
    } else if (account.name.length > 100) {
      warnings.push({
        code: 'LONG_ACCOUNT_NAME',
        message: 'Account name is very long. Consider shortening for better readability.',
        field: 'name'
      });
    }

    // Account type validation
    if (!account.type) {
      errors.push({
        code: 'MISSING_ACCOUNT_TYPE',
        message: 'Account type is required',
        field: 'type'
      });
    }

    // Parent account validation
    if (account.parentCode && account.code) {
      if (account.parentCode === account.code) {
        errors.push({
          code: 'CIRCULAR_REFERENCE',
          message: 'Account cannot be its own parent',
          field: 'parentCode'
        });
      }

      // Check hierarchy consistency
      if (!this.isValidAccountHierarchy(account.code, account.parentCode)) {
        errors.push({
          code: 'INVALID_HIERARCHY',
          message: 'Account hierarchy is inconsistent with account code numbering',
          field: 'parentCode'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 💰 VALIDATE TRANSACTION AMOUNTS
   * Validate monetary amounts and calculations
   */
  validateTransactionAmounts(transaction: {
    subtotal?: number;
    taxAmount?: number;
    totalAmount?: number;
    items?: Array<{ quantity: number; unitPrice: number; totalPrice: number }>;
  }): {
    isValid: boolean;
    errors: ValidationError[];
    calculatedTotals: {
      subtotal: number;
      taxAmount: number;
      totalAmount: number;
    };
  } {
    const errors: ValidationError[] = [];
    let calculatedSubtotal = 0;
    let calculatedTaxAmount = transaction.taxAmount || 0;

    // Validate item calculations
    if (transaction.items) {
      for (let i = 0; i < transaction.items.length; i++) {
        const item = transaction.items[i];
        const expectedTotal = item.quantity * item.unitPrice;
        
        if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
          errors.push({
            code: 'INCORRECT_LINE_TOTAL',
            message: `Line ${i + 1}: Expected total $${expectedTotal.toFixed(2)}, got $${item.totalPrice.toFixed(2)}`,
            field: `items[${i}].totalPrice`
          });
        }

        calculatedSubtotal += expectedTotal;
      }
    } else {
      calculatedSubtotal = transaction.subtotal || 0;
    }

    // Validate subtotal
    if (transaction.subtotal && Math.abs(transaction.subtotal - calculatedSubtotal) > 0.01) {
      errors.push({
        code: 'INCORRECT_SUBTOTAL',
        message: `Expected subtotal $${calculatedSubtotal.toFixed(2)}, got $${transaction.subtotal.toFixed(2)}`,
        field: 'subtotal'
      });
    }

    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

    // Validate total amount
    if (transaction.totalAmount && Math.abs(transaction.totalAmount - calculatedTotal) > 0.01) {
      errors.push({
        code: 'INCORRECT_TOTAL',
        message: `Expected total $${calculatedTotal.toFixed(2)}, got $${transaction.totalAmount.toFixed(2)}`,
        field: 'totalAmount'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      calculatedTotals: {
        subtotal: calculatedSubtotal,
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotal
      }
    };
  }

  /**
   * 🗓️ VALIDATE ACCOUNTING PERIODS
   * Ensure transactions are in open periods
   */
  validateAccountingPeriod(transactionDate: Date): {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const now = new Date();

    // Check if date is in the future
    if (transactionDate > now) {
      errors.push({
        code: 'FUTURE_DATE',
        message: 'Transaction date cannot be in the future',
        field: 'transactionDate'
      });
    }

    // Check if date is too far in the past (more than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    if (transactionDate < twoYearsAgo) {
      warnings.push({
        code: 'OLD_TRANSACTION',
        message: 'Transaction is more than 2 years old. Verify this is correct.',
        field: 'transactionDate'
      });
    }

    // Check if date is in a previous month (potential late entry)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (transactionDate < startOfMonth) {
      warnings.push({
        code: 'PREVIOUS_PERIOD',
        message: 'Transaction is in a previous accounting period',
        field: 'transactionDate'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Private validation methods

  private validateBasicStructure(entry: Partial<JournalEntry>, errors: ValidationError[]): void {
    if (!entry.description?.trim()) {
      errors.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Journal entry description is required',
        field: 'description'
      });
    }

    if (!entry.entries || entry.entries.length < 2) {
      errors.push({
        code: 'INSUFFICIENT_ENTRIES',
        message: 'Journal entry must have at least 2 line items',
        field: 'entries'
      });
    }

    if (!entry.transactionDate) {
      errors.push({
        code: 'MISSING_DATE',
        message: 'Transaction date is required',
        field: 'transactionDate'
      });
    }
  }

  private validateDoubleEntry(entry: Partial<JournalEntry>, errors: ValidationError[]): {
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  } {
    let totalDebits = 0;
    let totalCredits = 0;

    if (entry.entries) {
      for (const line of entry.entries) {
        if (line.type === 'DEBIT') {
          totalDebits += line.amount || 0;
        } else if (line.type === 'CREDIT') {
          totalCredits += line.amount || 0;
        } else {
          errors.push({
            code: 'INVALID_ENTRY_TYPE',
            message: 'Entry type must be DEBIT or CREDIT',
            field: 'entries'
          });
        }
      }
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    if (!isBalanced) {
      errors.push({
        code: 'UNBALANCED_ENTRY',
        message: `Entry is not balanced. Debits: $${totalDebits.toFixed(2)}, Credits: $${totalCredits.toFixed(2)}`,
        field: 'entries'
      });
    }

    return { totalDebits, totalCredits, isBalanced };
  }

  private validateAccounts(entry: Partial<JournalEntry>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!entry.entries) return;

    const usedAccounts = new Set<string>();

    for (let i = 0; i < entry.entries.length; i++) {
      const line = entry.entries[i];

      if (!line.accountCode) {
        errors.push({
          code: 'MISSING_ACCOUNT_CODE',
          message: 'Account code is required',
          field: 'entries',
          lineNumber: i + 1
        });
        continue;
      }

      // Validate account code format
      const codeValidation = this.validateAccountCode(line.accountCode);
      if (!codeValidation.isValid) {
        errors.push({
          code: 'INVALID_ACCOUNT_CODE',
          message: `Invalid account code: ${codeValidation.errors.join(', ')}`,
          field: 'entries',
          lineNumber: i + 1
        });
      }

      // Check for duplicate accounts (warning only)
      if (usedAccounts.has(line.accountCode)) {
        warnings.push({
          code: 'DUPLICATE_ACCOUNT',
          message: `Account ${line.accountCode} used multiple times`,
          field: 'entries',
          lineNumber: i + 1
        });
      }
      usedAccounts.add(line.accountCode);
    }
  }

  private validateAmounts(entry: Partial<JournalEntry>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!entry.entries) return;

    for (let i = 0; i < entry.entries.length; i++) {
      const line = entry.entries[i];

      if (!line.amount || line.amount <= 0) {
        errors.push({
          code: 'INVALID_AMOUNT',
          message: 'Amount must be positive',
          field: 'entries',
          lineNumber: i + 1
        });
      }

      // Check for unusually large amounts
      if (line.amount > 1000000) {
        warnings.push({
          code: 'LARGE_AMOUNT',
          message: 'Very large amount detected. Please verify accuracy.',
          field: 'entries',
          lineNumber: i + 1
        });
      }

      // Check for very small amounts
      if (line.amount < 0.01) {
        warnings.push({
          code: 'SMALL_AMOUNT',
          message: 'Very small amount detected. Consider rounding.',
          field: 'entries',
          lineNumber: i + 1
        });
      }
    }
  }

  private validateDates(entry: Partial<JournalEntry>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!entry.transactionDate) return;

    const periodValidation = this.validateAccountingPeriod(entry.transactionDate);
    errors.push(...periodValidation.errors);
    warnings.push(...periodValidation.warnings);
  }

  private validateBusinessRules(entry: Partial<JournalEntry>, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!entry.entries) return;

    // Rule: Cash account entries should have proper documentation
    const cashAccounts = ['1111', '1112', '1113'];
    const hasCashEntry = entry.entries.some(line => cashAccounts.includes(line.accountCode));
    
    if (hasCashEntry && !entry.reference) {
      warnings.push({
        code: 'CASH_NEEDS_REFERENCE',
        message: 'Cash transactions should include a reference number',
        field: 'reference'
      });
    }

    // Rule: Large journal entries should have detailed descriptions
    const totalAmount = entry.entries
      .filter(line => line.type === 'DEBIT')
      .reduce((sum, line) => sum + (line.amount || 0), 0);

    if (totalAmount > 10000 && (!entry.description || entry.description.length < 20)) {
      warnings.push({
        code: 'LARGE_ENTRY_NEEDS_DETAIL',
        message: 'Large transactions should have detailed descriptions',
        field: 'description'
      });
    }
  }

  private validateAccountCode(code: string): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Must be 4 digits
    if (!/^\d{4}$/.test(code)) {
      errors.push({
        code: 'INVALID_ACCOUNT_FORMAT',
        message: 'Account code must be exactly 4 digits'
      });
    }

    // Check valid ranges
    const firstDigit = parseInt(code[0]);
    if (firstDigit < 1 || firstDigit > 9) {
      errors.push({
        code: 'INVALID_ACCOUNT_RANGE',
        message: 'Account code must start with digits 1-9'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidAccountHierarchy(accountCode: string, parentCode: string): boolean {
    // Parent should have fewer significant digits than child
    const accountLevel = this.getAccountLevel(accountCode);
    const parentLevel = this.getAccountLevel(parentCode);
    
    return parentLevel < accountLevel;
  }

  private getAccountLevel(code: string): number {
    // Level based on significant digits: 1000=1, 1100=2, 1110=3, 1111=4
    if (code.endsWith('000')) return 1;
    if (code.endsWith('00')) return 2;
    if (code.endsWith('0')) return 3;
    return 4;
  }
} 