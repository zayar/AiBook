import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import { 
  listVendorPayments,
  getVendorPayment,
  createVendorPayment,
  deleteVendorPayment,
  getVendorPaymentStats,
  getNextPaymentNumber,
  getVendorPendingBills
} from '../controllers/vendorPaymentController';

const router = Router();

/**
 * 📊 GET VENDOR PAYMENT STATISTICS
 * GET /api/v1/vendor-payments/stats
 * Returns comprehensive vendor payment statistics
 */
router.get('/stats',
  requirePermission('vendor-payment:read'),
  getVendorPaymentStats
);

/**
 * 🆔 GET NEXT PAYMENT NUMBER
 * GET /api/v1/vendor-payments/next-number
 * Returns the next payment number
 */
router.get('/next-number',
  requirePermission('vendor-payment:create'),
  getNextPaymentNumber
);

/**
 * 📋 GET VENDOR PENDING BILLS
 * GET /api/v1/vendor-payments/vendor/:vendorId/pending-bills
 * Returns pending bills for a specific vendor
 */
router.get('/vendor/:vendorId/pending-bills',
  requirePermission('vendor-payment:read'),
  getVendorPendingBills
);

/**
 * 💰 LIST ALL VENDOR PAYMENTS
 * GET /api/v1/vendor-payments
 * Returns all vendor payments with advanced filtering and pagination
 */
router.get('/',
  requirePermission('vendor-payment:read'),
  listVendorPayments
);

/**
 * ➕ CREATE NEW VENDOR PAYMENT
 * POST /api/v1/vendor-payments
 * Creates a new vendor payment with double-entry bookkeeping
 */
router.post('/',
  requirePermission('vendor-payment:create'),
  createVendorPayment
);

/**
 * 🔍 GET VENDOR PAYMENT BY ID
 * GET /api/v1/vendor-payments/:id
 * Retrieve single vendor payment with full details and journal entries
 */
router.get('/:id',
  requirePermission('vendor-payment:read'),
  getVendorPayment
);

/**
 * 🗑️ DELETE VENDOR PAYMENT
 * DELETE /api/v1/vendor-payments/:id
 * Soft delete vendor payment (reverses journal entries)
 */
router.delete('/:id',
  requirePermission('vendor-payment:delete'),
  deleteVendorPayment
);

export default router;