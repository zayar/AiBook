import { Router } from 'express';
import BankingController from '../controllers/bankingController';

const router = Router();

// Banking routes
router.get('/overview', BankingController.getBankingOverview);
router.get('/payment-methods', BankingController.getPaymentMethods);
router.post('/payment-methods', BankingController.createPaymentMethod);
router.put('/payment-methods/:id', BankingController.updatePaymentMethod);
router.delete('/payment-methods/:id', BankingController.deletePaymentMethod);

export default router; 