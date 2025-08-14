import { Router } from 'express';
import InvoiceController from '../controllers/invoiceController';
import JournalController from '../controllers/journalController';

const router = Router();

/**
 * 🧾 INVOICE MANAGEMENT ROUTES
 * Complete invoice lifecycle with AI-enhanced features
 */

// Create new invoice
router.post('/', (req, res) => InvoiceController.createInvoice(req, res));

// Get all invoices with filtering and pagination
router.get('/', (req, res) => InvoiceController.getInvoices(req, res));

// Get invoice analytics and insights
router.get('/analytics', (req, res) => InvoiceController.getInvoiceAnalytics(req, res));

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

/**
 * 🔗 PUBLIC/SHAREABLE INVOICE ROUTES
 */
// Create or refresh a share link for an invoice
router.post('/:id/share', async (req, res) => {
  try {
    const tenantId = (req as any).tenant?.tenantId || 'default';
    const { id } = req.params;
    const { expiresInDays = 30 } = req.body || {};

    // Check if invoice exists
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const invoice = await prisma.invoice.findFirst({ 
      where: { id, tenantId }, 
      select: { id: true } 
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate a unique URL-safe token
    const crypto = require('crypto');
    let token = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      token = crypto.randomBytes(16).toString('hex');
      const existing = await prisma.invoice.findFirst({ where: { shareToken: token } });
      if (!existing) break;
      if (attempt === 4) {
        return res.status(500).json({ error: 'Failed to generate unique token' });
      }
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));

    // Update invoice with share token
    try {
      await prisma.invoice.update({
        where: { id },
        data: { shareToken: token, shareExpiresAt: expiresAt }
      });
    } catch (dbError) {
      console.warn('⚠️ Share token update failed:', dbError);
      return res.status(500).json({ error: 'Failed to save share token' });
    }

    // Generate FRONTEND URL (not API). Prefer env, then infer from host.
    const forwardedHost = req.get('x-forwarded-host');
    const host = forwardedHost || req.get('host') || 'localhost:3000';
    // If running locally and host is 3001 (backend), switch to 3000 (frontend)
    const inferredHost = host.includes('3001') ? host.replace('3001', '3000') : host;
    const frontendOrigin = process.env.PUBLIC_APP_URL
      || process.env.FRONTEND_PUBLIC_URL
      || `${req.protocol}://${inferredHost}`;

    res.json({
      message: 'Share link generated',
      token,
      expiresAt,
      publicUrl: `${frontendOrigin}/invoices/public/${token}`
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get invoice by public share token (no auth, tenant inferred from invoice)
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Find invoice by share token
    const invoice = await prisma.invoice.findFirst({
      where: { shareToken: token },
      include: {
        customer: true,
        items: { include: { inventoryItem: true } },
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invalid or expired link' });
    }

    // Check if link has expired
    if (invoice.shareExpiresAt && invoice.shareExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Share link expired' });
    }

    res.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        status: invoice.status,
        customer: invoice.customer,
        items: invoice.items,
        payments: invoice.payments
      }
    });
  } catch (error) {
    console.error('Get invoice by share token error:', error);
    res.status(500).json({ error: 'Failed to retrieve invoice' });
  }
});

// Save customization for invoice design settings
router.post('/:id/customize', (req, res) => InvoiceController.saveInvoiceDesign(req, res));

/**
 * 💰 PAYMENT MANAGEMENT
 */
// Record payment against an invoice
router.post('/:id/payments', (req, res) => InvoiceController.recordPayment(req, res));

// Get all payments for an invoice
router.get('/:id/payments', (req, res) => InvoiceController.getInvoicePayments(req, res));

// Get journal entries for an invoice (ALE accounting)
router.get('/:id/journal-entries', (req, res) => InvoiceController.getInvoiceJournalData(req, res));

// Process payment for an invoice
router.post('/:id/pay', (req, res) => InvoiceController.processPayment(req, res));

// Change invoice status from DRAFT to SENT (creates journal entries)
router.post('/:id/send', (req, res) => InvoiceController.sendInvoice(req, res));

// Send invoice via email
router.post('/:id/send-email', (req, res) => InvoiceController.sendInvoiceEmail(req, res));

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

// Get specific invoice by ID (this should be last to avoid conflicts)
router.get('/:id', (req, res) => InvoiceController.getInvoiceById(req, res));

export default router; 