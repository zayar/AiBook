import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import { ReportsController } from '../controllers/reportsController';

const router = Router();

/**
 * 📊 FINANCIAL REPORTS ROUTES
 * Comprehensive reporting endpoints for accounting data
 */

// Reports Menu
router.get('/menu',
  ReportsController.getReportsMenu
);

// Financial Statements
router.get('/trial-balance',
  ReportsController.getTrialBalance
);

router.get('/profit-loss',
  ReportsController.getProfitLoss
);

router.get('/cash-flow',
  ReportsController.getCashFlow
);

// Detailed Reports
router.get('/general-ledger',
  ReportsController.getGeneralLedger
);

router.get('/account-transactions',
  ReportsController.getAccountTransactions
);

router.get('/journal-entries',
  ReportsController.getJournalReport
);

export default router;