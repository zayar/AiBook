import { ChartOfAccountsEngine } from './engines/ChartOfAccountsEngine';
import { JournalEntryEngine } from './engines/JournalEntryEngine';
import { ReportingEngine } from './engines/ReportingEngine';

/**
 * 🏢 ACCOUNTING SERVICE
 * 
 * Main orchestrator for all accounting operations.
 * Provides a unified interface to all accounting engines.
 */
export class AccountingService {
  private tenantId: string;
  private chartEngine: ChartOfAccountsEngine;
  private journalEngine: JournalEntryEngine;
  private reportingEngine: ReportingEngine;

  constructor(options: { tenantId: string }) {
    this.tenantId = options.tenantId;
    this.chartEngine = new ChartOfAccountsEngine(this.tenantId);
    this.journalEngine = new JournalEntryEngine(this.tenantId);
    this.reportingEngine = new ReportingEngine(this.tenantId);
  }

  // Chart of Accounts operations
  async initializeChartOfAccounts() {
    return await this.chartEngine.createStandardChartOfAccounts();
  }

  async getAccountBalance(accountCode: string) {
    return await this.chartEngine.getAccountBalance(accountCode);
  }

  async getAccountHierarchy() {
    return await this.chartEngine.getAccountHierarchy();
  }

  async getTrialBalance() {
    return await this.chartEngine.getTrialBalance();
  }

  // Journal Entry operations
  async createInvoiceJournalEntries(invoice: any) {
    return await this.journalEngine.createInvoiceEntries(invoice);
  }

  async createPaymentJournalEntries(payment: any, invoice?: any) {
    return await this.journalEngine.createPaymentEntries(payment, invoice);
  }

  async createPurchaseJournalEntries(bill: any) {
    return await this.journalEngine.createPurchaseEntries(bill);
  }

  async createExpenseJournalEntries(expense: any) {
    return await this.journalEngine.createExpenseEntries(expense);
  }

  async handleInvoiceStatusChange(invoice: any, oldStatus: string, newStatus: string) {
    return await this.journalEngine.handleInvoiceStatusChange(invoice, oldStatus, newStatus);
  }

  async createJournalEntry(entryData: any) {
    return await this.journalEngine.createJournalEntry(entryData);
  }

  async reverseJournalEntry(entryId: string, reason: string) {
    return await this.journalEngine.reverseJournalEntry(entryId, reason);
  }

  async getJournalEntries(options: any) {
    return await this.journalEngine.getJournalEntries(options);
  }

  async getInvoiceJournalEntries(invoiceNumber: string) {
    return await this.journalEngine.getJournalEntries({
      reference: invoiceNumber
    });
  }

  // Financial Reporting operations
  async generateBalanceSheet(asOfDate?: Date) {
    return await this.reportingEngine.generateBalanceSheet(asOfDate);
  }

  async generateIncomeStatement(startDate: Date, endDate: Date) {
    return await this.reportingEngine.generateIncomeStatement(startDate, endDate);
  }

  async generateCashFlowStatement(startDate: Date, endDate: Date) {
    return await this.reportingEngine.generateCashFlowStatement(startDate, endDate);
  }

  async generateTrialBalance(asOfDate?: Date) {
    return await this.reportingEngine.generateTrialBalance(asOfDate);
  }

  async generateFinancialRatios(asOfDate?: Date) {
    return await this.reportingEngine.generateFinancialRatios(asOfDate);
  }
} 