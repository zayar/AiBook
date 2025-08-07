import express from 'express';
import { PaymentReceivedController } from '../controllers/paymentReceivedController';

const router = express.Router();

/**
 * 💰 PAYMENT RECEIVED ROUTES
 * RESTful API endpoints for managing customer payments
 */

// Get all payments received with filtering and pagination
router.get('/', (req, res) => PaymentReceivedController.getPaymentsReceived(req, res));

// Get analytics for payments received
router.get('/analytics', (req, res) => {
  // TODO: Implement analytics endpoint
  res.json({
    success: true,
    data: {
      totalReceived: 0,
      monthlyTrend: [],
      paymentMethods: [],
      customerBreakdown: []
    }
  });
});

// Get eligible deposit accounts for Chart of Accounts integration
router.get('/deposit-accounts', (req, res) => PaymentReceivedController.getDepositAccounts(req, res));

// Get unpaid invoices for a specific customer
router.get('/customer/:customerId/unpaid-invoices', (req, res) => PaymentReceivedController.getUnpaidInvoices(req, res));

// Get specific payment received by ID
router.get('/:id', (req, res) => PaymentReceivedController.getPaymentReceivedById(req, res));

// Create new payment received
router.post('/', (req, res) => PaymentReceivedController.createPaymentReceived(req, res));

// Update payment received
router.put('/:id', (req, res) => PaymentReceivedController.updatePaymentReceived(req, res));

// Delete payment received
router.delete('/:id', (req, res) => PaymentReceivedController.deletePaymentReceived(req, res));

export default router;