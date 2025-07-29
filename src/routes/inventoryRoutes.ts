import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Apply middleware to all inventory routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * 📦 INVENTORY MANAGEMENT ROUTES
 * 
 * POST   /inventory/items          - Create new inventory item
 * GET    /inventory/items          - Get paginated list of inventory items
 * GET    /inventory/items/:id      - Get specific inventory item
 * PUT    /inventory/items/:id      - Update inventory item
 * DELETE /inventory/items/:id      - Delete inventory item
 * 
 * POST   /inventory/:id/adjust     - Adjust stock levels
 * GET    /inventory/reports        - Get inventory reports
 * 
 * GET    /inventory/categories     - Get inventory categories
 * GET    /inventory/low-stock      - Get low stock items
 * GET    /inventory/activity       - Get recent inventory activity
 */

// Create new inventory item
router.post('/items', InventoryController.createItem);

// Get paginated list of inventory items
router.get('/items', InventoryController.getItems);

// Get specific inventory item
router.get('/items/:id', InventoryController.getItem);

// Adjust inventory stock
router.post('/:id/adjust', InventoryController.adjustStock);

// Get inventory reports
router.get('/reports', InventoryController.getReports);

export default router; 