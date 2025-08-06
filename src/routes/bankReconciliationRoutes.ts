import { Router } from 'express';
import { BankReconciliationController } from '../controllers/bankReconciliationController';

const router = Router();

/**
 * 🏦 BANK RECONCILIATION ROUTES
 * 
 * Comprehensive bank reconciliation functionality for accurate cash management
 */

// Import bank statement
router.post('/import-statement', BankReconciliationController.importBankStatement);

// Auto-match transactions
router.post('/:statementId/auto-match', BankReconciliationController.autoMatchTransactions);

// Manual transaction matching
router.post('/match', BankReconciliationController.manualTransactionMatch);

// Perform reconciliation
router.post('/:paymentMethodId/reconcile', BankReconciliationController.performReconciliation);

// Get reconciliation history
router.get('/:paymentMethodId/history', BankReconciliationController.getReconciliationHistory);

export default router;