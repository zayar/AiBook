import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import { listAccounts, getAccount, getAccountsByType } from '../controllers/accountController';

const router = Router();

/**
 * 📊 LIST ALL ACCOUNTS
 * GET /api/v1/accounts
 * Returns all accounts for dropdowns and selection
 */
router.get('/',
  requirePermission('account:read'),
  listAccounts
);

/**
 * 🔍 GET ACCOUNT BY ID
 * GET /api/v1/accounts/:id
 * Retrieve single account details
 */
router.get('/:id',
  requirePermission('account:read'),
  getAccount
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

export default router; 