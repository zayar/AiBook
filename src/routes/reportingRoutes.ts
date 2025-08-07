import { Router } from 'express';
import { ReportingController } from '../controllers/reportingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Apply middleware to all reporting routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * 📊 FINANCIAL REPORTING ROUTES
 * 
 * GET    /reports/profit-loss       - Get profit & loss statement
 * GET    /reports/cash-flow         - Get cash flow statement
 * GET    /reports/balance-sheet     - Get balance sheet
 * GET    /reports/trial-balance     - Get trial balance
 * GET    /reports/general-ledger    - Get general ledger
 * 
 * GET    /reports/analytics         - Get AI-powered analytics
 * GET    /reports/trends            - Get financial trends
 * GET    /reports/forecasts         - Get financial forecasts
 * 
 * POST   /reports/export            - Export reports in various formats
 * GET    /reports/schedules         - Get scheduled reports
 */

// Core financial reports
// Temporarily disabled to prevent route conflicts
// router.get('/profit-loss', ReportingController.getProfitLossReport);
// Use the working cash flow implementation from ReportsController
// router.get('/cash-flow', ReportingController.getCashFlowReport);
router.get('/balance-sheet', ReportingController.getBalanceSheetReport);

// 📅 Fiscal year aware reports
router.get('/fiscal-year', ReportingController.getFiscalYearReports);
router.get('/fiscal-year/info', ReportingController.getFiscalYearInfo);
router.post('/validate-period', ReportingController.validateReportingPeriod);

export default router; 