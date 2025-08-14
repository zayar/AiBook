import { Router } from 'express';
import BankingController from '../controllers/bankingController';

const router = Router();

// Banking routes
router.get('/overview', BankingController.getBankingOverview);
router.get('/payment-methods', BankingController.getPaymentMethods);
router.post('/payment-methods', BankingController.createPaymentMethod);
router.post('/payment-methods-simple', BankingController.createPaymentMethodSimple);
router.put('/payment-methods/:id', BankingController.updatePaymentMethod);
router.delete('/payment-methods/:id', BankingController.deletePaymentMethod);

// Bank transaction and reconciliation routes
router.get('/payment-methods/:paymentMethodId/transactions', BankingController.getBankTransactions);
router.post('/payment-methods/:paymentMethodId/transactions', BankingController.createBankTransaction);
router.get('/payment-methods/:paymentMethodId/insights', BankingController.getTransactionInsights);
router.post('/payment-methods/:paymentMethodId/reconcile', BankingController.reconcileTransactions);
router.get('/payment-methods/:paymentMethodId/reconciliation-history', BankingController.getReconciliationHistory);

// Account balance management
router.post('/recalculate-balances', BankingController.recalculateAccountBalances);

export default router; 