import { Router } from 'express';
import BankingController from '../controllers/bankingController';

const router = Router();

// Banking routes
router.get('/overview', BankingController.getBankingOverview);
router.get('/payment-methods', BankingController.getPaymentMethods);
router.post('/payment-methods', BankingController.createPaymentMethod);
router.put('/payment-methods/:id', BankingController.updatePaymentMethod);
router.delete('/payment-methods/:id', BankingController.deletePaymentMethod);

// Bank transaction and reconciliation routes
router.get('/payment-methods/:paymentMethodId/transactions', BankingController.getBankTransactions);
router.post('/payment-methods/:paymentMethodId/reconcile', BankingController.reconcileTransactions);
router.get('/payment-methods/:paymentMethodId/reconciliation-history', BankingController.getReconciliationHistory);

export default router; 