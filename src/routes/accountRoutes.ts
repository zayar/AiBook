import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import { 
  listAccounts, 
  getAccount, 
  createAccount, 
  updateAccount, 
  deleteAccount, 
  getAccountsByType, 
  getAccountHierarchy 
} from '../controllers/accountController';

const router = Router();

/**
 * 📊 LIST ALL ACCOUNTS
 * GET /api/v1/accounts
 * Returns all accounts with advanced filtering and pagination
 */
router.get('/',
  // requirePermission('account:read'), // Temporarily disabled for development
  listAccounts
);

/**
 * 🌳 GET ACCOUNT HIERARCHY
 * GET /api/v1/accounts/hierarchy
 * Returns accounts in hierarchical tree structure
 */
router.get('/hierarchy',
  requirePermission('account:read'),
  getAccountHierarchy
);

/**
 * 🏭 GET ACCOUNTS BY TYPE
 * GET /api/v1/accounts/by-type/:type
 * Get accounts filtered by type (ASSET, LIABILITY, etc.)
 */
router.get('/by-type/:type',
  requirePermission('account:read'),
  getAccountsByType
);

/**
 * ➕ CREATE NEW ACCOUNT
 * POST /api/v1/accounts
 * Creates a new account with ALE compliance validation
 */
router.post('/',
  // requirePermission('account:create'), // Temporarily disabled for development
  createAccount
);

/**
 * 🔍 GET ACCOUNT BY ID
 * GET /api/v1/accounts/:id
 * Retrieve single account with full details
 */
router.get('/:id',
  // requirePermission('account:read'), // Temporarily disabled for development
  getAccount
);

/**
 * ✏️ UPDATE ACCOUNT
 * PUT /api/v1/accounts/:id
 * Updates account with validation and ALE compliance
 */
router.put('/:id',
  requirePermission('account:update'),
  updateAccount
);

/**
 * 🗑️ DELETE ACCOUNT
 * DELETE /api/v1/accounts/:id
 * Soft delete with ALE compliance validation
 */
router.delete('/:id',
  requirePermission('account:delete'),
  deleteAccount
);

export default router; 