import { Request, Response } from 'express';
import { BankReconciliationEngine } from '../accounting/engines/BankReconciliationEngine';
import { AuditTrailEngine } from '../accounting/engines/AuditTrailEngine';

export class BankReconciliationController {
  /**
   * 📄 IMPORT BANK STATEMENT
   * POST /api/v1/banking/reconciliation/import-statement
   */
  static async importBankStatement(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      
      const {
        paymentMethodId,
        statementDate,
        openingBalance,
        closingBalance,
        transactions
      } = req.body;

      if (!paymentMethodId || !statementDate || openingBalance === undefined || closingBalance === undefined || !transactions) {
        res.status(400).json({ 
          error: 'Missing required fields: paymentMethodId, statementDate, openingBalance, closingBalance, transactions' 
        });
        return;
      }

      const reconciliationEngine = new BankReconciliationEngine(tenantId);
      const auditEngine = new AuditTrailEngine(tenantId);

      // Import bank statement
      const statement = await reconciliationEngine.importBankStatement({
        paymentMethodId,
        statementDate: new Date(statementDate),
        openingBalance: Number(openingBalance),
        closingBalance: Number(closingBalance),
        transactions: transactions.map((txn: any) => ({
          transactionDate: new Date(txn.transactionDate),
          description: txn.description,
          reference: txn.reference,
          amount: Number(txn.amount),
          type: txn.type
        }))
      });

      // Log audit event
      await auditEngine.logFinancialTransaction({
        transactionType: 'BANK_TRANSACTION',
        transactionId: statement.id,
        action: 'CREATE',
        userId,
        userEmail,
        amount: Number(closingBalance),
        currency: 'MMK',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Bank statement import'
      });

      res.status(201).json({
        message: 'Bank statement imported successfully',
        statement: {
          id: statement.id,
          paymentMethodId: statement.paymentMethodId,
          statementDate: statement.statementDate,
          openingBalance: statement.openingBalance,
          closingBalance: statement.closingBalance,
          transactionCount: statement.transactions.length
        }
      });

    } catch (error) {
      console.error('Error importing bank statement:', error);
      res.status(500).json({ 
        error: 'Failed to import bank statement',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔍 AUTO-MATCH TRANSACTIONS
   * POST /api/v1/banking/reconciliation/:statementId/auto-match
   */
  static async autoMatchTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      const { statementId } = req.params;

      const reconciliationEngine = new BankReconciliationEngine(tenantId);
      const auditEngine = new AuditTrailEngine(tenantId);

      // Perform auto-matching
      const result = await reconciliationEngine.autoMatchTransactions(statementId);

      // Log audit event
      await auditEngine.logAuditEvent({
        entityType: 'BANK_RECONCILIATION',
        entityId: statementId,
        action: 'RECONCILE',
        userId,
        userEmail,
        newValues: {
          matched: result.matched,
          unmatched: result.unmatched,
          matches: result.matches
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Auto-match transactions'
      });

      res.json({
        message: 'Transaction matching completed',
        result: {
          matched: result.matched,
          unmatched: result.unmatched,
          totalMatches: result.matches.length,
          averageConfidence: result.matches.reduce((sum, match) => sum + match.confidence, 0) / (result.matches.length || 1)
        }
      });

    } catch (error) {
      console.error('Error auto-matching transactions:', error);
      res.status(500).json({ 
        error: 'Failed to auto-match transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * ✅ MANUAL TRANSACTION MATCH
   * POST /api/v1/banking/reconciliation/match
   */
  static async manualTransactionMatch(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      
      const { statementTransactionId, bookTransactionId } = req.body;

      if (!statementTransactionId || !bookTransactionId) {
        res.status(400).json({ 
          error: 'Missing required fields: statementTransactionId, bookTransactionId' 
        });
        return;
      }

      const reconciliationEngine = new BankReconciliationEngine(tenantId);
      const auditEngine = new AuditTrailEngine(tenantId);

      // Create manual match
      await reconciliationEngine.createTransactionMatch(statementTransactionId, bookTransactionId);

      // Log audit event
      await auditEngine.logAuditEvent({
        entityType: 'TRANSACTION_MATCH',
        entityId: `${statementTransactionId}-${bookTransactionId}`,
        action: 'CREATE',
        userId,
        userEmail,
        newValues: {
          statementTransactionId,
          bookTransactionId,
          matchType: 'MANUAL'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Manual transaction match'
      });

      res.json({
        message: 'Transaction matched successfully',
        match: {
          statementTransactionId,
          bookTransactionId,
          matchedAt: new Date(),
          matchType: 'MANUAL'
        }
      });

    } catch (error) {
      console.error('Error matching transactions:', error);
      res.status(500).json({ 
        error: 'Failed to match transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 PERFORM RECONCILIATION
   * POST /api/v1/banking/reconciliation/:paymentMethodId/reconcile
   */
  static async performReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const userId = req.user?.uid || 'system';
      const userEmail = req.user?.email;
      const { paymentMethodId } = req.params;
      const { statementId, reconciliationDate } = req.body;

      if (!statementId) {
        res.status(400).json({ error: 'Statement ID is required' });
        return;
      }

      const reconciliationEngine = new BankReconciliationEngine(tenantId);
      const auditEngine = new AuditTrailEngine(tenantId);

      // Perform reconciliation
      const reconciliation = await reconciliationEngine.performReconciliation(
        paymentMethodId,
        statementId,
        reconciliationDate ? new Date(reconciliationDate) : undefined
      );

      // Log audit event
      await auditEngine.logFinancialTransaction({
        transactionType: 'BANK_TRANSACTION',
        transactionId: reconciliation.id,
        action: 'RECONCILE',
        userId,
        userEmail,
        amount: reconciliation.variance,
        currency: 'MMK',
        newValues: {
          statementBalance: reconciliation.statementBalance,
          bookBalance: reconciliation.bookBalance,
          variance: reconciliation.variance,
          isBalanced: reconciliation.isBalanced
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Bank reconciliation'
      });

      res.json({
        message: reconciliation.isBalanced ? 'Reconciliation completed successfully' : 'Reconciliation completed with variance',
        reconciliation: {
          id: reconciliation.id,
          paymentMethodId: reconciliation.paymentMethodId,
          reconciliationDate: reconciliation.reconciliationDate,
          statementBalance: reconciliation.statementBalance,
          bookBalance: reconciliation.bookBalance,
          variance: reconciliation.variance,
          isBalanced: reconciliation.isBalanced,
          status: reconciliation.status,
          outstandingItemsCount: reconciliation.outstandingItems.length,
          matchedTransactions: reconciliation.matchedTransactions,
          unmatchedTransactions: reconciliation.unmatchedTransactions
        }
      });

    } catch (error) {
      console.error('Error performing reconciliation:', error);
      res.status(500).json({ 
        error: 'Failed to perform reconciliation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📈 GET RECONCILIATION HISTORY
   * GET /api/v1/banking/reconciliation/:paymentMethodId/history
   */
  static async getReconciliationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const { paymentMethodId } = req.params;
      const limit = parseInt(req.query.limit as string) || 12;

      const reconciliationEngine = new BankReconciliationEngine(tenantId);

      const history = await reconciliationEngine.getReconciliationHistory(paymentMethodId, limit);

      res.json({
        message: 'Reconciliation history retrieved successfully',
        history,
        count: history.length
      });

    } catch (error) {
      console.error('Error getting reconciliation history:', error);
      res.status(500).json({ 
        error: 'Failed to get reconciliation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}