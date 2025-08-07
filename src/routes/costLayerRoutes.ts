import { Router } from 'express';
import { CostLayerController } from '../controllers/costLayerController';

const router = Router();

/**
 * 📦 COST LAYER ROUTES
 * Dedicated API for inventory cost layer management and COGS calculations
 */

// Create single cost layer
router.post('/', CostLayerController.createCostLayer);

// Bulk create cost layers
router.post('/bulk', CostLayerController.bulkCreateCostLayers);

// Get cost layers for an inventory item
router.get('/:inventoryItemId', CostLayerController.getCostLayers);

// Calculate COGS manually
router.post('/calculate-cogs', CostLayerController.calculateCOGS);

export default router;