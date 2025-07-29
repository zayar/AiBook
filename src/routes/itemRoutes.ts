import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  aiItemAssistance,
} from '../controllers/itemController';

const router = Router();

/**
 * 📝 LIST ALL ITEMS
 * GET /api/v1/items
 * Advanced listing with search, filtering, and pagination
 */
router.get('/',
  requirePermission('account:read'),
  listItems
);

/**
 * 📄 GET SINGLE ITEM
 * GET /api/v1/items/:id
 * Retrieve item details with AI insights
 */
router.get('/:id',
  requirePermission('account:read'),
  getItem
);

/**
 * ➕ CREATE NEW ITEM
 * POST /api/v1/items
 * Create item with AI-powered enhancements
 */
router.post('/',
  requirePermission('transaction:create'),
  createItem
);

/**
 * ✏️ UPDATE ITEM
 * PUT /api/v1/items/:id
 * Update item with AI analysis
 */
router.put('/:id',
  requirePermission('transaction:update'),
  updateItem
);

/**
 * 🗑️ DELETE ITEM
 * DELETE /api/v1/items/:id
 * Smart delete with dependency checking
 */
router.delete('/:id',
  requirePermission('transaction:delete'),
  deleteItem
);

/**
 * 🤖 AI ITEM ASSISTANCE
 * POST /api/v1/items/ai-assist
 * Various AI-powered item management features
 */
router.post('/ai-assist',
  requirePermission('account:read'),
  aiItemAssistance
);

export default router; 