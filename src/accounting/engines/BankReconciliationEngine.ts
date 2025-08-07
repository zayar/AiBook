import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🏦 BANK RECONCILIATION ENGINE
 * 
 * Implements comprehensive bank reconciliation functionality for accurate cash management.
 * 
 * Key Features:
 * - Bank statement import and processing
 * - Automatic transaction matching
 * - Outstanding items tracking
 * - Reconciliation variance analysis
 * - Multi-period reconciliation support
 */

export interface BankStatement {
  id: string;
  paymentMethodId: string;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: BankStatementTransaction[];
  tenantId: string;
}

export interface BankStatementTransaction {
  id?: string;
  statementId?: string;
  transactionDate: Date;
  description: string;
  reference?: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  isMatched: boolean;
  matchedTransactionId?: string;
  tenantId: string;
}

export interface ReconciliationItem {
  id: string;
  type: 'OUTSTANDING_DEPOSIT' | 'OUTSTANDING_WITHDRAWAL' | 'BANK_ERROR' | 'BOOK_ERROR';
  description: string;
  amount: number;
  transactionDate: Date;
  reference?: string;
  isResolved: boolean;
}

export interface ReconciliationResult {
  id: string;
  paymentMethodId: string;
  reconciliationDate: Date;
  statementBalance: number;
  bookBalance: number;
  adjustedBookBalance: number;
  variance: number;
  isBalanced: boolean;
  outstandingItems: ReconciliationItem[];
  matchedTransactions: number;
  unmatchedTransactions: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';
}

export class BankReconciliationEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 📄 IMPORT BANK STATEMENT
   * Import and process bank statement data
   */
  async importBankStatement(data: {
    paymentMethodId: string;
    statementDate: Date;
    openingBalance: number;
    closingBalance: number;
    transactions: Omit<BankStatementTransaction, 'id' | 'statementId' | 'isMatched' | 'tenantId'>[];
  }): Promise<BankStatement> {
    try {
      // Create bank statement record
      const statement = await prisma.bankStatement.create({
        data: {
          paymentMethodId: data.paymentMethodId,
          statementDate: data.statementDate,
          openingBalance: data.openingBalance,
          closingBalance: data.closingBalance,
          tenantId: this.tenantId,
          status: 'IMPORTED'
        }
      });

      // Import statement transactions
      const transactions = await Promise.all(
        data.transactions.map(async (txn) => {
          return await prisma.bankStatementTransaction.create({
            data: {
              statementId: statement.id,
              transactionDate: txn.transactionDate,
              description: txn.description,
              reference: txn.reference,
              amount: txn.amount,
              type: txn.type,
              isMatched: false,
              tenantId: this.tenantId
            }
          });
        })
      );

      console.log(`✅ Imported bank statement with ${transactions.length} transactions`);

      return {
        id: statement.id,
        paymentMethodId: statement.paymentMethodId,
        statementDate: statement.statementDate,
        openingBalance: Number(statement.openingBalance),
        closingBalance: Number(statement.closingBalance),
        transactions: transactions.map(t => ({
          id: t.id,
          statementId: t.statementId,
          transactionDate: t.transactionDate,
          description: t.description,
          reference: t.reference || undefined,
          amount: Number(t.amount),
          type: t.type as 'DEPOSIT' | 'WITHDRAWAL',
          isMatched: t.isMatched,
          matchedTransactionId: t.matchedTransactionId || undefined,
          tenantId: t.tenantId
        })),
        tenantId: statement.tenantId
      };

    } catch (error) {
      console.error('❌ Error importing bank statement:', error);
      throw error;
    }
  }

  /**
   * 🔍 AUTO-MATCH TRANSACTIONS
   * Automatically match bank statement transactions with book transactions
   */
  async autoMatchTransactions(statementId: string): Promise<{
    matched: number;
    unmatched: number;
    matches: Array<{ statementTxnId: string; bookTxnId: string; confidence: number }>;
  }> {
    try {
      // Get statement transactions
      const statementTransactions = await prisma.bankStatementTransaction.findMany({
        where: { 
          statementId,
          isMatched: false,
          tenantId: this.tenantId 
        }
      });

      // Get statement info
      const statement = await prisma.bankStatement.findUnique({
        where: { id: statementId }
      });

      if (!statement) {
        throw new Error('Bank statement not found');
      }

      // Get book transactions for the same period
      const startDate = new Date(statement.statementDate);
      startDate.setDate(startDate.getDate() - 30); // Look back 30 days

      const endDate = new Date(statement.statementDate);
      endDate.setDate(endDate.getDate() + 5); // Look forward 5 days for timing differences

      const bookTransactions = await prisma.bankTransaction.findMany({
        where: {
          paymentMethodId: statement.paymentMethodId,
          transactionDate: {
            gte: startDate,
            lte: endDate
          },
          tenantId: this.tenantId
        }
      });

      const matches: Array<{ statementTxnId: string; bookTxnId: string; confidence: number }> = [];
      let matchedCount = 0;

      // Auto-matching algorithm
      for (const stmtTxn of statementTransactions) {
        let bestMatch: { bookTxnId: string; confidence: number } | null = null;

        for (const bookTxn of bookTransactions) {
          // Skip if already matched
          if (await this.isTransactionMatched(bookTxn.id)) continue;

          const confidence = this.calculateMatchConfidence(stmtTxn, bookTxn);
          
          // Require high confidence for auto-matching
          if (confidence >= 0.85 && (!bestMatch || confidence > bestMatch.confidence)) {
            bestMatch = { bookTxnId: bookTxn.id, confidence };
          }
        }

        // Create match if high confidence
        if (bestMatch && bestMatch.confidence >= 0.90) {
          await this.createTransactionMatch(stmtTxn.id, bestMatch.bookTxnId);
          matches.push({
            statementTxnId: stmtTxn.id,
            bookTxnId: bestMatch.bookTxnId,
            confidence: bestMatch.confidence
          });
          matchedCount++;
        }
      }

      const unmatchedCount = statementTransactions.length - matchedCount;

      console.log(`✅ Auto-matched ${matchedCount} transactions, ${unmatchedCount} remain unmatched`);

      return {
        matched: matchedCount,
        unmatched: unmatchedCount,
        matches
      };

    } catch (error) {
      console.error('❌ Error auto-matching transactions:', error);
      throw error;
    }
  }

  /**
   * 🎯 CALCULATE MATCH CONFIDENCE
   * Calculate confidence score for transaction matching
   */
  private calculateMatchConfidence(
    stmtTxn: any,
    bookTxn: any
  ): number {
    let confidence = 0;

    // Amount match (most important)
    if (Math.abs(Number(stmtTxn.amount) - Number(bookTxn.amount)) < 0.01) {
      confidence += 0.5;
    } else if (Math.abs(Number(stmtTxn.amount) - Number(bookTxn.amount)) < 1) {
      confidence += 0.3;
    }

    // Date proximity
    const dateDiff = Math.abs(
      stmtTxn.transactionDate.getTime() - bookTxn.transactionDate.getTime()
    ) / (1000 * 60 * 60 * 24); // Days

    if (dateDiff === 0) {
      confidence += 0.3;
    } else if (dateDiff <= 1) {
      confidence += 0.2;
    } else if (dateDiff <= 3) {
      confidence += 0.1;
    }

    // Reference match
    if (stmtTxn.reference && bookTxn.reference) {
      if (stmtTxn.reference === bookTxn.reference) {
        confidence += 0.2;
      } else if (stmtTxn.reference.includes(bookTxn.reference) || 
                 bookTxn.reference.includes(stmtTxn.reference)) {
        confidence += 0.1;
      }
    }

    // Type consistency
    const stmtIsDeposit = stmtTxn.type === 'DEPOSIT';
    const bookIsDeposit = Number(bookTxn.amount) > 0;
    
    if (stmtIsDeposit === bookIsDeposit) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * ✅ CREATE TRANSACTION MATCH
   * Manually or automatically match transactions
   */
  async createTransactionMatch(
    statementTransactionId: string,
    bookTransactionId: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Update statement transaction
        await tx.bankStatementTransaction.update({
          where: { id: statementTransactionId },
          data: {
            isMatched: true,
            matchedTransactionId: bookTransactionId
          }
        });

        // Update book transaction
        await tx.bankTransaction.update({
          where: { id: bookTransactionId },
          data: {
            reconciled: true,
            reconciledAt: new Date()
          }
        });

        // Create match record for audit
        await tx.transactionMatch.create({
          data: {
            statementTransactionId,
            bookTransactionId,
            matchedAt: new Date(),
            tenantId: this.tenantId
          }
        });
      });

      console.log(`✅ Matched statement transaction ${statementTransactionId} with book transaction ${bookTransactionId}`);

    } catch (error) {
      console.error('❌ Error creating transaction match:', error);
      throw error;
    }
  }

  /**
   * 🔍 CHECK IF TRANSACTION IS MATCHED
   */
  private async isTransactionMatched(bookTransactionId: string): Promise<boolean> {
    const match = await prisma.transactionMatch.findFirst({
      where: { bookTransactionId }
    });
    return !!match;
  }

  /**
   * 📊 PERFORM RECONCILIATION
   * Complete bank reconciliation process
   */
  async performReconciliation(
    paymentMethodId: string,
    statementId: string,
    reconciliationDate: Date = new Date()
  ): Promise<ReconciliationResult> {
    try {
      // Get statement data
      const statement = await prisma.bankStatement.findUnique({
        where: { id: statementId },
        include: {
          transactions: true
        }
      });

      if (!statement) {
        throw new Error('Bank statement not found');
      }

      // Calculate book balance as of reconciliation date
      const bookBalance = await this.calculateBookBalance(paymentMethodId, reconciliationDate);

      // Get outstanding items
      const outstandingItems = await this.getOutstandingItems(paymentMethodId, reconciliationDate);

      // Calculate adjustments
      const outstandingDeposits = outstandingItems
        .filter(item => item.type === 'OUTSTANDING_DEPOSIT')
        .reduce((sum, item) => sum + item.amount, 0);

      const outstandingWithdrawals = outstandingItems
        .filter(item => item.type === 'OUTSTANDING_WITHDRAWAL')
        .reduce((sum, item) => sum + Math.abs(item.amount), 0);

      const adjustedBookBalance = bookBalance + outstandingDeposits - outstandingWithdrawals;
      const variance = Number(statement.closingBalance) - adjustedBookBalance;
      const isBalanced = Math.abs(variance) < 0.01;

      // Count matched/unmatched transactions
      const matchedTransactions = statement.transactions.filter(t => t.isMatched).length;
      const unmatchedTransactions = statement.transactions.filter(t => !t.isMatched).length;

      // Create reconciliation record
      const reconciliation = await prisma.bankReconciliation.create({
        data: {
          paymentMethodId,
          statementId,
          reconciliationDate,
          statementBalance: statement.closingBalance,
          bookBalance,
          adjustedBookBalance,
          variance,
          isBalanced,
          status: isBalanced ? 'COMPLETED' : 'IN_PROGRESS',
          tenantId: this.tenantId
        }
      });

      console.log(`✅ Bank reconciliation ${isBalanced ? 'completed' : 'created'} - Variance: ${variance.toFixed(2)}`);

      return {
        id: reconciliation.id,
        paymentMethodId: reconciliation.paymentMethodId,
        reconciliationDate: reconciliation.reconciliationDate,
        statementBalance: Number(reconciliation.statementBalance),
        bookBalance: Number(reconciliation.bookBalance),
        adjustedBookBalance: Number(reconciliation.adjustedBookBalance),
        variance: Number(reconciliation.variance),
        isBalanced: reconciliation.isBalanced,
        outstandingItems,
        matchedTransactions,
        unmatchedTransactions,
        status: reconciliation.status as 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED'
      };

    } catch (error) {
      console.error('❌ Error performing reconciliation:', error);
      throw error;
    }
  }

  /**
   * 💰 CALCULATE BOOK BALANCE
   */
  private async calculateBookBalance(
    paymentMethodId: string,
    asOfDate: Date
  ): Promise<number> {
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        paymentMethodId,
        transactionDate: { lte: asOfDate },
        tenantId: this.tenantId
      },
      orderBy: { transactionDate: 'asc' }
    });

    return transactions.reduce((balance, txn) => balance + Number(txn.amount), 0);
  }

  /**
   * 📋 GET OUTSTANDING ITEMS
   */
  private async getOutstandingItems(
    paymentMethodId: string,
    asOfDate: Date
  ): Promise<ReconciliationItem[]> {
    // Get unreconciled transactions
    const unreconciledTransactions = await prisma.bankTransaction.findMany({
      where: {
        paymentMethodId,
        transactionDate: { lte: asOfDate },
        reconciled: false,
        tenantId: this.tenantId
      }
    });

    return unreconciledTransactions.map(txn => ({
      id: txn.id,
      type: Number(txn.amount) > 0 ? 'OUTSTANDING_DEPOSIT' : 'OUTSTANDING_WITHDRAWAL',
      description: txn.description,
      amount: Number(txn.amount),
      transactionDate: txn.transactionDate,
      reference: txn.reference || undefined,
      isResolved: false
    }));
  }

  /**
   * 📊 GET RECONCILIATION HISTORY
   */
  async getReconciliationHistory(
    paymentMethodId: string,
    limit: number = 12
  ): Promise<ReconciliationResult[]> {
    const reconciliations = await prisma.bankReconciliation.findMany({
      where: {
        paymentMethodId,
        tenantId: this.tenantId
      },
      orderBy: { reconciliationDate: 'desc' },
      take: limit
    });

    return reconciliations.map(r => ({
      id: r.id,
      paymentMethodId: r.paymentMethodId,
      reconciliationDate: r.reconciliationDate,
      statementBalance: Number(r.statementBalance),
      bookBalance: Number(r.bookBalance),
      adjustedBookBalance: Number(r.adjustedBookBalance),
      variance: Number(r.variance),
      isBalanced: r.isBalanced,
      outstandingItems: [], // Would need separate query for full data
      matchedTransactions: 0, // Would need separate query
      unmatchedTransactions: 0, // Would need separate query
      status: r.status as 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED'
    }));
  }
}