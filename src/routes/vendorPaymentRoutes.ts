import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware';
import { 
  listVendorPayments,
  getVendorPayment,
  createVendorPayment,
  deleteVendorPayment,
  getVendorPaymentStats,
  getNextPaymentNumber,
  getVendorPendingBills,
  getPaidThroughAccounts
} from '../controllers/vendorPaymentController';

const router = Router();

/**
 * 📊 GET VENDOR PAYMENT STATISTICS
 * GET /api/v1/vendor-payments/stats
 * Returns comprehensive vendor payment statistics
 */
router.get('/stats',
  // requirePermission('vendor-payment:read'), // Temporarily disabled for development
  getVendorPaymentStats
);

/**
 * 🆔 GET NEXT PAYMENT NUMBER
 * GET /api/v1/vendor-payments/next-number
 * Returns the next payment number
 */
router.get('/next-number',
  // requirePermission('vendor-payment:create'), // Temporarily disabled for development
  getNextPaymentNumber
);

/**
 * 🏦 GET PAID THROUGH ACCOUNTS
 * GET /api/v1/vendor-payments/paid-through-accounts
 * Returns accounts eligible for "Paid Through" in vendor payments
 */
router.get('/paid-through-accounts',
  // requirePermission('vendor-payment:read'), // Temporarily disabled for development
  getPaidThroughAccounts
);

/**
 * 📋 GET VENDOR PENDING BILLS
 * GET /api/v1/vendor-payments/vendor/:vendorId/pending-bills
 * Returns pending bills for a specific vendor
 */
router.get('/vendor/:vendorId/pending-bills',
  // requirePermission('vendor-payment:read'), // Temporarily disabled for development
  getVendorPendingBills
);

/**
 * 💰 LIST ALL VENDOR PAYMENTS
 * GET /api/v1/vendor-payments
 * Returns all vendor payments with advanced filtering and pagination
 */
router.get('/',
  // requirePermission('vendor-payment:read'), // Temporarily disabled for development
  listVendorPayments
);

/**
 * ➕ CREATE NEW VENDOR PAYMENT
 * POST /api/v1/vendor-payments
 * Creates a new vendor payment with double-entry bookkeeping
 */
router.post('/',
  // requirePermission('vendor-payment:create'), // Temporarily disabled for development
  createVendorPayment
);

/**
 * 🔍 GET VENDOR PAYMENT BY ID
 * GET /api/v1/vendor-payments/:id
 * Retrieve single vendor payment with full details and journal entries
 */
router.get('/:id',
  // requirePermission('vendor-payment:read'), // Temporarily disabled for development
  getVendorPayment
);

/**
 * 🗑️ DELETE VENDOR PAYMENT
 * DELETE /api/v1/vendor-payments/:id
 * Soft delete vendor payment (reverses journal entries)
 */
router.delete('/:id',
  // requirePermission('vendor-payment:delete'), // Temporarily disabled for development
  deleteVendorPayment
);

export default router;