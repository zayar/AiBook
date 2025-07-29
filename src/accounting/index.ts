/**
 * 📚 ACCOUNTING MODULE - Core Business Logic
 * 
 * This module contains all accounting-related functionality including:
 * - Chart of Accounts management
 * - Journal Entry processing  
 * - Double-entry bookkeeping engine
 * - Financial reporting
 * - Account reconciliation
 * - Accounting rules and validation
 */

// Core accounting engines
export { ChartOfAccountsEngine } from './engines/ChartOfAccountsEngine';
export { JournalEntryEngine } from './engines/JournalEntryEngine';
export { ReportingEngine } from './engines/ReportingEngine';

// Accounting models and types
export * from './models/Account';
export * from './models/JournalEntry';
export * from './models/Transaction';
export * from './models/FinancialStatement';

// Accounting utilities
export { AccountingValidator } from './utils/AccountingValidator';
export { FinancialCalculator } from './utils/FinancialCalculator';
export { AccountingFormatter } from './utils/AccountingFormatter';

// Accounting rules engine
export { AccountingRulesEngine } from './rules/AccountingRulesEngine';
export { TaxRulesEngine } from './rules/TaxRulesEngine';

// Export main accounting service
export { AccountingService } from './AccountingService'; 