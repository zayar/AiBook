import { Router } from 'express';
import { BillController } from '../controllers/billController';

const router = Router();

// Bills CRUD routes
router.get('/', BillController.getAllBills);
router.get('/stats', BillController.getBillsStats);
router.get('/next-number', BillController.getNextBillNumber);
router.get('/:id', BillController.getBillById);
router.post('/', BillController.createBill);
router.put('/:id', BillController.updateBill);
router.delete('/:id', BillController.deleteBill);

export default router;