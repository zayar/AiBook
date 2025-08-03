import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import { 
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  approveExpense,
  deleteExpense,
  getExpenseStats,
  getNextExpenseNumber
} from '../controllers/expenseController';

const router = Router();

/**
 * 📊 GET EXPENSE STATISTICS
 * GET /api/v1/expenses/stats
 * Returns comprehensive expense statistics
 */
router.get('/stats',
  requirePermission('expense:read'),
  getExpenseStats
);

/**
 * 🆔 GET NEXT EXPENSE NUMBER
 * GET /api/v1/expenses/next-number
 * Returns the next expense number
 */
router.get('/next-number',
  requirePermission('expense:create'),
  getNextExpenseNumber
);

/**
 * 💰 LIST ALL EXPENSES
 * GET /api/v1/expenses
 * Returns all expenses with advanced filtering and pagination
 */
router.get('/',
  requirePermission('expense:read'),
  listExpenses
);

/**
 * ➕ CREATE NEW EXPENSE
 * POST /api/v1/expenses
 * Creates a new expense with double-entry bookkeeping
 */
router.post('/',
  requirePermission('expense:create'),
  createExpense
);

/**
 * 🔍 GET EXPENSE BY ID
 * GET /api/v1/expenses/:id
 * Retrieve single expense with full details and journal entries
 */
router.get('/:id',
  requirePermission('expense:read'),
  getExpense
);

/**
 * ✏️ UPDATE EXPENSE
 * PUT /api/v1/expenses/:id
 * Updates expense with validation
 */
router.put('/:id',
  requirePermission('expense:update'),
  updateExpense
);

/**
 * ✅ APPROVE EXPENSE
 * POST /api/v1/expenses/:id/approve
 * Approves expense and creates journal entries
 */
router.post('/:id/approve',
  requirePermission('expense:approve'),
  approveExpense
);

/**
 * 🗑️ DELETE EXPENSE
 * DELETE /api/v1/expenses/:id
 * Soft delete expense (changes status to REJECTED)
 */
router.delete('/:id',
  requirePermission('expense:delete'),
  deleteExpense
);

export default router;