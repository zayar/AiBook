/**
 * 📚 BOOKKEEPING AGENT
 * 
 * Specialized AI agent for automated bookkeeping tasks including:
 * - Transaction categorization and processing
 * - Journal entry creation and validation
 * - Account reconciliation assistance
 * - Data entry automation
 * - Compliance checks
 */

import { EventEmitter } from 'events';

export interface BookkeepingAgentConfig {
  autoCategorizationEnabled: boolean;
  confidenceThreshold: number;
  reconciliationFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  complianceLevel: 'BASIC' | 'STANDARD' | 'STRICT';
  learningMode: boolean;
}

export interface TransactionProcessingResult {
  transactionId: string;
  category: string;
  confidence: number;
  journalEntries: JournalEntryData[];
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
  recommendations: string[];
  processingTime: number;
}

export interface JournalEntryData {
  accountCode: string;
  accountName: string;
  debitAmount?: number;
  creditAmount?: number;
  description: string;
  reference?: string;
}

export interface ReconciliationTask {
  id: string;
  accountId: string;
  bankStatementId?: string;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  discrepancies: Discrepancy[];
  resolutionSuggestions: string[];
}

export interface Discrepancy {
  type: 'MISSING_TRANSACTION' | 'AMOUNT_MISMATCH' | 'DUPLICATE' | 'TIMING_DIFFERENCE';
  amount: number;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedAction: string;
}

export class BookkeepingAgent extends EventEmitter {
  private tenantId: string;
  private config: BookkeepingAgentConfig;
  private isActive: boolean = false;
  private processingQueue: any[] = [];
  private performance: {
    transactionsProcessed: number;
    averageAccuracy: number;
    averageProcessingTime: number;
    lastUpdated: Date;
  };

  constructor(tenantId: string, config: BookkeepingAgentConfig) {
    super();
    this.tenantId = tenantId;
    this.config = config;
    this.performance = {
      transactionsProcessed: 0,
      averageAccuracy: 0,
      averageProcessingTime: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * 🚀 AGENT LIFECYCLE
   */

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('BookkeepingAgent is already active');
    }

    console.log(`📚 Starting Bookkeeping Agent for tenant ${this.tenantId}`);
    this.isActive = true;
    
    // Start processing queue
    this.startQueueProcessor();
    
    // Schedule reconciliation tasks
    this.scheduleReconciliation();
    
    this.emit('agentStarted', { tenantId: this.tenantId, timestamp: new Date() });
  }

  async stop(): Promise<void> {
    console.log(`📚 Stopping Bookkeeping Agent for tenant ${this.tenantId}`);
    this.isActive = false;
    this.emit('agentStopped', { tenantId: this.tenantId, timestamp: new Date() });
  }

  /**
   * 💳 TRANSACTION PROCESSING
   */

  /**
   * Process a single transaction with AI categorization
   */
  async processTransaction(transaction: any): Promise<TransactionProcessingResult> {
    const startTime = Date.now();
    
    console.log(`💳 Processing transaction: ${transaction.id}`);
    
    try {
      // Step 1: AI Categorization
      const categorization = await this.categorizeTransaction(transaction);
      
      // Step 2: Generate Journal Entries
      const journalEntries = await this.generateJournalEntries(transaction, categorization);
      
      // Step 3: Compliance Check
      const complianceCheck = await this.checkCompliance(transaction, journalEntries);
      
      // Step 4: Generate Recommendations
      const recommendations = await this.generateRecommendations(transaction, categorization, complianceCheck);
      
      const processingTime = Date.now() - startTime;
      
      const result: TransactionProcessingResult = {
        transactionId: transaction.id,
        category: categorization.category,
        confidence: categorization.confidence,
        journalEntries,
        complianceStatus: complianceCheck.status,
        recommendations,
        processingTime
      };

      // Update performance metrics
      this.updatePerformanceMetrics(result);
      
      // Emit processing event
      this.emit('transactionProcessed', result);
      
      console.log(`✅ Transaction ${transaction.id} processed successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to process transaction ${transaction.id}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple transactions in batch
   */
  async processBatch(transactions: any[]): Promise<TransactionProcessingResult[]> {
    console.log(`📦 Processing batch of ${transactions.length} transactions`);
    
    const results: TransactionProcessingResult[] = [];
    
    for (const transaction of transactions) {
      try {
        const result = await this.processTransaction(transaction);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process transaction ${transaction.id} in batch:`, error);
        // Continue with other transactions
      }
    }
    
    this.emit('batchProcessed', { 
      totalTransactions: transactions.length,
      successfulTransactions: results.length,
      failedTransactions: transactions.length - results.length,
      results
    });
    
    return results;
  }

  /**
   * 🔍 TRANSACTION CATEGORIZATION
   */

  private async categorizeTransaction(transaction: any): Promise<{
    category: string;
    subcategory?: string;
    confidence: number;
    reasoning: string;
  }> {
    // Extract features for categorization
    const features = this.extractTransactionFeatures(transaction);
    
    // Use ML model for categorization (mock implementation)
    const categorization = await this.runCategorizationModel(features);
    
    // Apply business rules if confidence is low
    if (categorization.confidence < this.config.confidenceThreshold) {
      const ruleBasedCategory = await this.applyBusinessRules(transaction);
      if (ruleBasedCategory.confidence > categorization.confidence) {
        return ruleBasedCategory;
      }
    }
    
    return categorization;
  }

  private extractTransactionFeatures(transaction: any): Record<string, any> {
    return {
      amount: transaction.amount,
      description: transaction.description,
      vendor: transaction.vendor,
      dateFeatures: this.extractDateFeatures(transaction.date),
      amountFeatures: this.extractAmountFeatures(transaction.amount),
      textFeatures: this.extractTextFeatures(transaction.description)
    };
  }

  private extractDateFeatures(date: Date): Record<string, any> {
    return {
      dayOfWeek: date.getDay(),
      monthOfYear: date.getMonth(),
      isWeekend: [0, 6].includes(date.getDay()),
      isMonthEnd: date.getDate() > 25,
      quarter: Math.ceil((date.getMonth() + 1) / 3)
    };
  }

  private extractAmountFeatures(amount: number): Record<string, any> {
    return {
      magnitude: Math.log10(amount + 1),
      isRoundNumber: amount % 1 === 0,
      isCommonAmount: [25, 50, 100, 250, 500, 1000].includes(amount),
      range: this.categorizeAmountRange(amount)
    };
  }

  private extractTextFeatures(description: string): Record<string, any> {
    const words = description.toLowerCase().split(/\s+/);
    return {
      wordCount: words.length,
      hasNumbers: /\d/.test(description),
      containsKeywords: this.checkForKeywords(words),
      averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length
    };
  }

  /**
   * 📋 JOURNAL ENTRY GENERATION
   */

  private async generateJournalEntries(
    transaction: any, 
    categorization: any
  ): Promise<JournalEntryData[]> {
    const entries: JournalEntryData[] = [];
    
    // Get account mapping for category
    const accounts = await this.getAccountMapping(categorization.category);
    
    // Create debit entry
    entries.push({
      accountCode: accounts.debitAccount.code,
      accountName: accounts.debitAccount.name,
      debitAmount: transaction.amount,
      description: `${categorization.category}: ${transaction.description}`,
      reference: transaction.reference
    });
    
    // Create credit entry
    entries.push({
      accountCode: accounts.creditAccount.code,
      accountName: accounts.creditAccount.name,
      creditAmount: transaction.amount,
      description: `Payment for ${transaction.description}`,
      reference: transaction.reference
    });
    
    return entries;
  }

  /**
   * ✅ COMPLIANCE CHECKING
   */

  private async checkCompliance(
    transaction: any, 
    journalEntries: JournalEntryData[]
  ): Promise<{
    status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
    issues: string[];
    severity: number;
  }> {
    const issues: string[] = [];
    let severity = 0;
    
    // Check amount limits
    if (transaction.amount > 10000 && !transaction.approvedBy) {
      issues.push('Large transaction requires approval');
      severity += 2;
    }
    
    // Check documentation
    if (!transaction.receipt && transaction.amount > 75) {
      issues.push('Receipt required for transactions over $75');
      severity += 1;
    }
    
    // Check account validity
    for (const entry of journalEntries) {
      if (!await this.isValidAccount(entry.accountCode)) {
        issues.push(`Invalid account code: ${entry.accountCode}`);
        severity += 3;
      }
    }
    
    // Check balanced entries
    const totalDebits = journalEntries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
    const totalCredits = journalEntries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      issues.push('Journal entries are not balanced');
      severity += 3;
    }
    
    // Determine overall status
    let status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
    if (severity === 0) {
      status = 'COMPLIANT';
    } else if (severity <= 2) {
      status = 'WARNING';
    } else {
      status = 'NON_COMPLIANT';
    }
    
    return { status, issues, severity };
  }

  /**
   * 🎯 RECOMMENDATIONS
   */

  private async generateRecommendations(
    transaction: any,
    categorization: any,
    complianceCheck: any
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Categorization recommendations
    if (categorization.confidence < 0.8) {
      recommendations.push(`Review categorization: ${categorization.category} (${(categorization.confidence * 100).toFixed(1)}% confidence)`);
    }
    
    // Compliance recommendations
    complianceCheck.issues.forEach((issue: string) => {
      recommendations.push(`Compliance: ${issue}`);
    });
    
    // Best practice recommendations
    if (!transaction.tags || transaction.tags.length === 0) {
      recommendations.push('Consider adding tags for better tracking');
    }
    
    if (transaction.amount > 1000 && !transaction.projectId) {
      recommendations.push('Large expense should be associated with a project');
    }
    
    return recommendations;
  }

  /**
   * 🔄 RECONCILIATION
   */

  async performReconciliation(accountId: string, bankStatementId?: string): Promise<ReconciliationTask> {
    const task: ReconciliationTask = {
      id: `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      bankStatementId,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
      status: 'PENDING',
      discrepancies: [],
      resolutionSuggestions: []
    };
    
    console.log(`🔄 Starting reconciliation for account ${accountId}`);
    task.status = 'IN_PROGRESS';
    
    try {
      // Get book entries and bank transactions
      const bookEntries = await this.getBookEntries(accountId, task.startDate, task.endDate);
      const bankTransactions = await this.getBankTransactions(accountId, task.startDate, task.endDate);
      
      // Perform matching
      const matchingResults = await this.matchTransactions(bookEntries, bankTransactions);
      
      // Identify discrepancies
      task.discrepancies = await this.identifyDiscrepancies(matchingResults);
      
      // Generate resolution suggestions
      task.resolutionSuggestions = await this.generateResolutionSuggestions(task.discrepancies);
      
      task.status = 'COMPLETED';
      
      this.emit('reconciliationCompleted', task);
      console.log(`✅ Reconciliation completed for account ${accountId}`);
      
    } catch (error) {
      console.error(`❌ Reconciliation failed for account ${accountId}:`, error);
      task.status = 'FAILED';
    }
    
    return task;
  }

  /**
   * 🔧 PRIVATE HELPER METHODS
   */

  private async runCategorizationModel(features: Record<string, any>): Promise<{
    category: string;
    confidence: number;
    reasoning: string;
  }> {
    // Mock ML model prediction
    const categories = ['Office Supplies', 'Travel', 'Meals', 'Software', 'Marketing', 'Utilities'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const confidence = 0.7 + Math.random() * 0.3;
    
    return {
      category,
      confidence,
      reasoning: `Classified based on description patterns and amount range`
    };
  }

  private async applyBusinessRules(transaction: any): Promise<{
    category: string;
    confidence: number;
    reasoning: string;
  }> {
    // Simple rule-based categorization
    const description = transaction.description.toLowerCase();
    
    if (description.includes('uber') || description.includes('lyft')) {
      return { category: 'Travel', confidence: 0.9, reasoning: 'Ride-sharing service detected' };
    }
    
    if (description.includes('starbucks') || description.includes('restaurant')) {
      return { category: 'Meals', confidence: 0.85, reasoning: 'Food/beverage vendor detected' };
    }
    
    return { category: 'Other', confidence: 0.5, reasoning: 'No specific rules matched' };
  }

  private categorizeAmountRange(amount: number): string {
    if (amount < 25) return 'micro';
    if (amount < 100) return 'small';
    if (amount < 500) return 'medium';
    if (amount < 2500) return 'large';
    return 'very_large';
  }

  private checkForKeywords(words: string[]): Record<string, boolean> {
    const keywords = {
      travel: ['uber', 'lyft', 'hotel', 'flight', 'taxi'],
      food: ['restaurant', 'starbucks', 'lunch', 'dinner'],
      office: ['office', 'supplies', 'printer', 'paper'],
      software: ['software', 'saas', 'subscription', 'license']
    };
    
    const result: Record<string, boolean> = {};
    
    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      result[category] = words.some(word => categoryKeywords.includes(word));
    }
    
    return result;
  }

  private async getAccountMapping(category: string): Promise<{
    debitAccount: { code: string; name: string };
    creditAccount: { code: string; name: string };
  }> {
    // Mock account mapping
    const mappings: Record<string, any> = {
      'Travel': {
        debitAccount: { code: '6100', name: 'Travel Expenses' },
        creditAccount: { code: '1000', name: 'Cash' }
      },
      'Meals': {
        debitAccount: { code: '6200', name: 'Meals & Entertainment' },
        creditAccount: { code: '1000', name: 'Cash' }
      },
      'Office Supplies': {
        debitAccount: { code: '6300', name: 'Office Supplies' },
        creditAccount: { code: '1000', name: 'Cash' }
      }
    };
    
    return mappings[category] || {
      debitAccount: { code: '6999', name: 'General Expenses' },
      creditAccount: { code: '1000', name: 'Cash' }
    };
  }

  private async isValidAccount(accountCode: string): Promise<boolean> {
    // Mock account validation
    return /^\d{4}$/.test(accountCode);
  }

  private startQueueProcessor(): void {
    if (!this.isActive) return;
    
    setInterval(async () => {
      if (this.processingQueue.length > 0 && this.isActive) {
        const item = this.processingQueue.shift();
        try {
          await this.processTransaction(item);
        } catch (error) {
          console.error('Queue processing error:', error);
        }
      }
    }, 5000); // Process every 5 seconds
  }

  private scheduleReconciliation(): void {
    // Schedule reconciliation based on frequency
    const intervals = {
      'DAILY': 24 * 60 * 60 * 1000,
      'WEEKLY': 7 * 24 * 60 * 60 * 1000,
      'MONTHLY': 30 * 24 * 60 * 60 * 1000
    };
    
    setInterval(() => {
      if (this.isActive) {
        // Trigger automatic reconciliation for all accounts
        this.emit('scheduledReconciliation', { tenantId: this.tenantId });
      }
    }, intervals[this.config.reconciliationFrequency]);
  }

  private updatePerformanceMetrics(result: TransactionProcessingResult): void {
    this.performance.transactionsProcessed++;
    this.performance.averageProcessingTime = 
      (this.performance.averageProcessingTime + result.processingTime) / 2;
    this.performance.lastUpdated = new Date();
  }

  // Mock methods for reconciliation
  private async getBookEntries(accountId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return []; // Mock implementation
  }

  private async getBankTransactions(accountId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return []; // Mock implementation
  }

  private async matchTransactions(bookEntries: any[], bankTransactions: any[]): Promise<any> {
    return {}; // Mock implementation
  }

  private async identifyDiscrepancies(matchingResults: any): Promise<Discrepancy[]> {
    return []; // Mock implementation
  }

  private async generateResolutionSuggestions(discrepancies: Discrepancy[]): Promise<string[]> {
    return []; // Mock implementation
  }

  /**
   * Get agent performance metrics
   */
  getPerformance() {
    return { ...this.performance };
  }

  /**
   * Update agent configuration
   */
  updateConfig(newConfig: Partial<BookkeepingAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }
} 