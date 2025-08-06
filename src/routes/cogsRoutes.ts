import express from 'express';
import { COGSController } from '../controllers/cogsController';

const router = express.Router();

/**
 * 🏭 COST OF GOODS SOLD (COGS) ROUTES
 * 
 * API endpoints for COGS operations, reporting, and cost layer management.
 * All routes require tenant authentication.
 */

// Inventory Cost Summary
router.get('/inventory/:inventoryItemId/cost-summary', COGSController.getInventoryCostSummary);

// COGS Calculations
router.get('/calculations', COGSController.getCOGSCalculations);
router.get('/calculations/:id', COGSController.getCOGSCalculationDetails);

// Cost Layers
router.get('/cost-layers', COGSController.getCostLayers);

// Inventory Returns
router.post('/returns', COGSController.processInventoryReturn);

// COGS Reports
router.get('/reports', COGSController.generateCOGSReport);

export { router as cogsRoutes };