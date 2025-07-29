import { Router } from 'express';
import { TransactionController, processSmartTransaction } from '@/controllers/transactionController';

const router = Router();

// Test endpoint
router.get('/test-validation', TransactionController.testValidation);

// Smart transaction processing
router.post('/smart-process', processSmartTransaction);

// Journal entry routes
router.post('/journal-entries', TransactionController.createJournalEntry);

// Account balance routes
router.get('/accounts/:accountCode/balance', TransactionController.getAccountBalance);
router.get('/accounts/:accountCode/ledger', TransactionController.getAccountLedger);

// Trial balance
router.get('/trial-balance', TransactionController.getTrialBalance);

export default router; 