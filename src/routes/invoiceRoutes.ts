import { Router } from 'express';
import InvoiceController from '@/controllers/invoiceController';

const router = Router();

/**
 * 🧾 INVOICE MANAGEMENT ROUTES
 * Complete invoice lifecycle with AI-enhanced features
 */

// Create new invoice
router.post('/', InvoiceController.createInvoice);

// Get all invoices with filtering and pagination
router.get('/', InvoiceController.getInvoices);

// Get invoice analytics and insights
router.get('/analytics', InvoiceController.getInvoiceAnalytics);

// Get next invoice number with configurable format
router.get('/next-number', async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || 'default';
    const { prefix = 'INV', separator = '-', includeDate = true, seriesStart = 1, seriesOffset = 0 } = req.query;
    
    // Get current invoice count for this tenant
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.invoice.count({
      where: { tenantId }
    });
    await prisma.$disconnect();
    
    // Calculate next number
    const nextNumber = parseInt(seriesStart as string) + count + parseInt(seriesOffset as string);
    
    // Format the invoice number
    let invoiceNumber = prefix as string;
    
    if (separator) {
      invoiceNumber += separator;
    }
    
    if (includeDate === 'true') {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const year = today.getFullYear();
      invoiceNumber += `${month}/${day}/${year}`;
      
      if (separator) {
        invoiceNumber += separator;
      }
    }
    
    invoiceNumber += String(nextNumber).padStart(2, '0');
    
    res.json({ 
      invoiceNumber,
      settings: {
        prefix,
        separator,
        includeDate: includeDate === 'true',
        seriesStart: parseInt(seriesStart as string),
        seriesOffset: parseInt(seriesOffset as string),
        nextNumber
      }
    });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    res.json({ 
      invoiceNumber: `INV-${month}/${day}/${year}-01`,
      settings: {
        prefix: 'INV',
        separator: '-',
        includeDate: true,
        seriesStart: 1,
        seriesOffset: 0,
        nextNumber: 1
      }
    });
  }
});

// Get specific invoice by ID
router.get('/:id', InvoiceController.getInvoiceById);

// Process payment for an invoice
router.post('/:id/pay', InvoiceController.processPayment);

// Send invoice via email
router.post('/:id/send', InvoiceController.sendInvoice);

// Get AI suggestions
router.post('/ai-suggestions', async (req, res) => {
  // Mock AI suggestions for now
  res.json({
    suggestions: [
      {
        field: 'dueDate',
        value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 0.9,
        reason: 'Based on customer payment history, 30-day terms are recommended'
      },
      {
        field: 'terms',
        value: 'Payment due within 30 days. Late fees may apply.',
        confidence: 0.85,
        reason: 'Standard payment terms for this customer type'
      }
    ]
  });
});

// Update invoice (PUT)
router.put('/:id', async (req, res) => {
  res.status(501).json({ 
    message: 'Invoice update endpoint - Implementation in progress',
    availableEndpoints: [
      'POST /',
      'GET /',
      'GET /analytics',
      'GET /:id',
      'POST /:id/pay',
      'POST /:id/send'
    ]
  });
});

// Delete invoice (soft delete)
router.delete('/:id', async (req, res) => {
  res.status(501).json({ 
    message: 'Invoice deletion endpoint - Implementation in progress',
    note: 'Will implement soft delete for audit trail compliance'
  });
});

/**
 * 🔄 RECURRING INVOICE ROUTES
 */
router.get('/:id/recurring', async (req, res) => {
  res.status(501).json({ 
    message: 'Recurring invoice management - Implementation in progress',
    features: [
      'Automatic invoice generation',
      'Schedule management',
      'Customer notifications'
    ]
  });
});

/**
 * 📄 INVOICE PDF GENERATION
 */
router.get('/:id/pdf', async (req, res) => {
  res.status(501).json({ 
    message: 'PDF generation endpoint - Implementation in progress',
    plannedFeatures: [
      'Professional invoice templates',
      'Company branding',
      'Multi-language support',
      'Digital signatures'
    ]
  });
});

/**
 * 📧 INVOICE EMAIL TRACKING
 */
router.get('/:id/email-status', async (req, res) => {
  res.status(501).json({ 
    message: 'Email tracking endpoint - Implementation in progress',
    features: [
      'Delivery status',
      'Open tracking',
      'Click tracking',
      'Response tracking'
    ]
  });
});

/**
 * 💰 PAYMENT MANAGEMENT
 */
// Record payment against an invoice
router.post('/:id/payments', InvoiceController.recordPayment);

// Get all payments for an invoice
router.get('/:id/payments', InvoiceController.getInvoicePayments);

export default router; 