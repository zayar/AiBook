import { Router } from 'express';
import { TaxController } from '../controllers/taxController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Apply middleware to all tax routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * 🧮 TAX MANAGEMENT ROUTES
 * 
 * POST   /taxes/calculate          - Calculate tax for an amount
 * GET    /taxes/reports            - Get tax reports
 * GET    /taxes/rates              - Get tax rates
 * POST   /taxes/rates              - Create new tax rate
 * PUT    /taxes/rates/:id          - Update tax rate
 * DELETE /taxes/rates/:id          - Delete tax rate
 * 
 * GET    /taxes/compliance         - Get compliance status
 * GET    /taxes/liability          - Get tax liability summary
 * GET    /taxes/jurisdictions      - Get available jurisdictions
 */

// Calculate tax
router.post('/calculate', TaxController.calculateTax);

// Get tax reports
router.get('/reports', TaxController.getTaxReports);

// Tax rates management
router.get('/rates', TaxController.getTaxRates);
router.post('/rates', TaxController.createTaxRate);
router.put('/rates/:id', TaxController.updateTaxRate);

export default router; 