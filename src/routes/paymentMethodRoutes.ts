import { Router } from 'express';
import * as PaymentMethodController from '../controllers/paymentMethodController';
import { requirePermission } from '../middleware/authMiddleware';

const router = Router();

// Payment method routes
router.get('/', requirePermission('payment:read'), PaymentMethodController.getPaymentMethods);
router.get('/:id', requirePermission('payment:read'), PaymentMethodController.getPaymentMethod);
router.post('/', requirePermission('payment:create'), PaymentMethodController.createPaymentMethod);
router.put('/:id', requirePermission('payment:update'), PaymentMethodController.updatePaymentMethod);
router.delete('/:id', requirePermission('payment:delete'), PaymentMethodController.deletePaymentMethod);
router.patch('/:id/default', requirePermission('payment:update'), PaymentMethodController.setDefaultPaymentMethod);

export default router; 