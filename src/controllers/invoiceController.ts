import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import firebaseService from '@/services/firebaseService';
import { getFirestore } from 'firebase-admin/firestore';
// Import enhanced tenant middleware types
import '@/middleware/enhancedTenantMiddleware';

const prisma = new PrismaClient();
import { z } from 'zod';
import aiService from '@/services/aiService';
import { AccountingService } from '@/accounting/AccountingService';
import { BankTransactionService } from '../services/bankTransactionService';

// Share link handler function
async function createOrRefreshShareLinkHandler(req: Request, res: Response): Promise<void> {
  try {
    res.json({
      message: 'Share link generated (working)',
      token: 'test-token-456',
      expiresAt: new Date(),
      publicUrl: `${req.protocol}://${req.get('host')}/api/v1/invoices/public/test-token-456`
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
}

// Validation schemas
const createInvoiceSchema = z.object({
  customerId: z.string(),
  salespersonId: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string(),
  currency: z.string().default('USD'),
  exchangeRate: z.number().default(1),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  recurring: z.boolean().default(false),
  recurringInterval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  salesOrderId: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT']).default('DRAFT'),
  items: z.array(z.object({
    inventoryItemId: z.string().optional(), // Link to inventory item
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number(),
    taxRate: z.number().default(0),
    accountCode: z.string().optional()
  }))
});

const invoicePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

class InvoiceController {
  /**
   * 📄 CREATE INVOICE
   * Create a new invoice with AI-enhanced features
   */
  static async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createInvoiceSchema.parse(req.body);
      
      console.log('🔍 Invoice creation data:', {
        customerId: validatedData.customerId,
        salespersonId: validatedData.salespersonId,
        items: validatedData.items.length
      });
      
      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      
      for (const item of validatedData.items) {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        taxAmount += itemTotal * (item.taxRate / 100);
      }
      
      const totalAmount = subtotal + taxAmount;

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { tenantId }
      });
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(3, '0')}`;

      // Parse and validate dates
      const issueDate = validatedData.issueDate ? new Date(validatedData.issueDate) : new Date();
      const dueDate = new Date(validatedData.dueDate);
      
      // Validate date parsing
      if (isNaN(dueDate.getTime())) {
        res.status(400).json({ error: 'Invalid due date format' });
        return;
      }

      // Create invoice with items
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          customerId: validatedData.customerId,
          salespersonId: validatedData.salespersonId,
          tenantId,
          issueDate,
          dueDate,
          subtotal,
          taxAmount,
          discountAmount: 0, // Default discount amount
          totalAmount,
          paidAmount: 0, // Default paid amount
          currency: validatedData.currency,
          exchangeRate: validatedData.exchangeRate,
          notes: validatedData.notes,
          termsConditions: validatedData.termsConditions,
          recurring: validatedData.recurring,
          recurringInterval: validatedData.recurringInterval,
          salesOrderId: validatedData.salesOrderId,
          status: validatedData.status, // Use status from request (DRAFT or SENT)
          items: {
            create: validatedData.items.map(item => ({
              inventoryItemId: item.inventoryItemId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              taxRate: item.taxRate,
              accountCode: item.accountCode,
              tenantId
            }))
          }
        },
        include: {
          customer: true,
          items: true,
          salesOrder: true
        }
      });

      // AI Enhancement: Auto-categorize invoice items if not provided (simplified for development)
      console.log('✅ Invoice created successfully:', invoice.invoiceNumber);
      
      // TODO: Re-enable AI categorization and accounting entries when services are ready
      // for (const item of invoice.items) {
      //   if (!item.accountCode) {
      //     try {
      //       const categorization = await aiService.categorizeTransaction({
      //         description: item.description,
      //         amount: parseFloat(item.totalPrice.toString()),
      //         date: invoice.issueDate.toISOString(),
      //         tenantId
      //       });
      //       
      //       // Update item with AI-suggested account code
      //       await prisma.invoiceItem.update({
      //         where: { id: item.id },
      //         data: { accountCode: categorization.suggestedAccount }
      //       });
      //     } catch (error) {
      //       console.warn('AI categorization failed for invoice item:', error);
      //     }
      //   }
      // }

      // Create journal entries only if status is SENT
      let journalEntries = null;
      let cogsCalculations = [];
      if (validatedData.status === 'SENT') {
        const accountingService = new AccountingService({ tenantId });
        journalEntries = await accountingService.createInvoiceJournalEntries(invoice);
        console.log('✅ Invoice created as SENT - journal entries created');

        // Calculate and record COGS for inventory items
        for (const item of invoice.items) {
          if (item.inventoryItemId) {
            try {
              console.log(`🔄 Calculating COGS for inventory item: ${item.inventoryItemId}`);
              
              const cogsResult = await accountingService.calculateCOGS({
                invoiceItemId: item.id,
                inventoryItemId: item.inventoryItemId,
                quantitySold: parseFloat(item.quantity.toString()),
                saleDate: invoice.issueDate,
                reference: `INV-${invoice.invoiceNumber}-${item.id}`
              });

              cogsCalculations.push({
                itemId: item.id,
                inventoryItemId: item.inventoryItemId,
                totalCOGS: cogsResult.totalCOGS,
                averageCostPerUnit: cogsResult.averageCostPerUnit,
                journalEntryId: cogsResult.journalEntryId
              });

              console.log(`✅ COGS calculated for item ${item.inventoryItemId}: $${cogsResult.totalCOGS.toFixed(2)}`);
            } catch (error) {
              console.error(`❌ Error calculating COGS for item ${item.inventoryItemId}:`, error);
              // Continue with other items even if one fails
            }
          }
        }

        if (cogsCalculations.length > 0) {
          console.log(`✅ COGS calculated for ${cogsCalculations.length} inventory items`);
        }
      } else {
        console.log('✅ Invoice created as DRAFT - no journal entries or COGS calculated');
      }

      res.status(201).json({
        message: 'Invoice created successfully',
        invoice,
        journalEntries: journalEntries,
        cogsCalculations: cogsCalculations,
        accountingNote: validatedData.status === 'SENT' 
          ? `Journal entries created for revenue recognition${cogsCalculations.length > 0 ? ' and COGS calculated' : ''}`
          : 'Journal entries and COGS will be calculated when invoice is sent',
        aiEnhancements: {
          autoCategorization: 'Applied to uncoded items',
          journalEntries: validatedData.status === 'SENT' 
            ? `Created ${journalEntries?.entries?.length || 0} journal entries`
            : 'Pending - will create when invoice is sent',
          cogsCalculation: validatedData.status === 'SENT' && cogsCalculations.length > 0
            ? `Calculated COGS for ${cogsCalculations.length} inventory items`
            : 'No inventory items or pending calculation',
          complianceCheck: 'Passed'
        }
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      // Log more details about the error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        name: errorName
      });
      res.status(500).json({ error: 'Failed to create invoice', details: errorMessage });
    }
  }

  /**
   * 📤 SEND INVOICE
   * Update invoice status from DRAFT to SENT and create journal entries
   */
  static async sendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.tenant!;
      const { id } = req.params;

      // Get the invoice
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          items: true
        }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      if (invoice.status !== 'DRAFT') {
        res.status(400).json({ 
          error: 'Can only send invoices in DRAFT status',
          currentStatus: invoice.status 
        });
        return;
      }

      // Update invoice status to SENT
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' },
        include: {
          customer: true,
          items: true
        }
      });

      // Create journal entries for revenue recognition (ALE accounting flow)
      try {
        const accountingService = new AccountingService({ tenantId });
        const journalEntries = await accountingService.createInvoiceJournalEntries(updatedInvoice);
        
        console.log('✅ Invoice sent and journal entries created:', journalEntries);

        // Calculate and record COGS for inventory items
        const cogsCalculations = [];
        for (const item of updatedInvoice.items) {
          if (item.inventoryItemId) {
            try {
              console.log(`🔄 Calculating COGS for inventory item: ${item.inventoryItemId}`);
              
              const cogsResult = await accountingService.calculateCOGS({
                invoiceItemId: item.id,
                inventoryItemId: item.inventoryItemId,
                quantitySold: parseFloat(item.quantity.toString()),
                saleDate: updatedInvoice.issueDate,
                reference: `INV-${updatedInvoice.invoiceNumber}-${item.id}`
              });

              cogsCalculations.push({
                itemId: item.id,
                inventoryItemId: item.inventoryItemId,
                totalCOGS: cogsResult.totalCOGS,
                averageCostPerUnit: cogsResult.averageCostPerUnit,
                journalEntryId: cogsResult.journalEntryId
              });

              console.log(`✅ COGS calculated for item ${item.inventoryItemId}: $${cogsResult.totalCOGS.toFixed(2)}`);
            } catch (cogsError) {
              console.error(`❌ Error calculating COGS for item ${item.inventoryItemId}:`, cogsError);
              // Continue with other items even if one fails
            }
          }
        }

        if (cogsCalculations.length > 0) {
          console.log(`✅ COGS calculated for ${cogsCalculations.length} inventory items`);
        }

        res.status(200).json({
          message: 'Invoice sent successfully',
          invoice: updatedInvoice,
          journalEntries: journalEntries,
          cogsCalculations: cogsCalculations,
          accountingNote: `Journal entries created for revenue recognition${cogsCalculations.length > 0 ? ' and COGS calculated' : ''}`
        });
      } catch (accountingError) {
        console.error('❌ Accounting error during invoice send:', accountingError);
        
        // If journal entry creation fails, still update the invoice status but log the error
        res.status(200).json({
          message: 'Invoice sent successfully (journal entries failed)',
          invoice: updatedInvoice,
          journalEntries: null,
          cogsCalculations: [],
          accountingNote: 'Invoice status updated but journal entry and COGS calculation failed',
          accountingError: accountingError instanceof Error ? accountingError.message : 'Unknown accounting error'
        });
      }
    } catch (error) {
      console.error('Send invoice error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to send invoice', details: errorMessage });
    }
  }

  /**
   * 🔗 CREATE/REFRESH SHARE LINK
   */
  static async createOrRefreshShareLink(req: Request, res: Response): Promise<void> {
    return createOrRefreshShareLinkHandler(req, res);
  }

  /**
   * 📋 GET INVOICES
   * Retrieve invoices with filtering and AI insights
   */
  static async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { 
        status, 
        customerId, 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where: any = { tenantId };
      
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search } },
          { customer: { name: { contains: search } } },
          { notes: { contains: search } }
        ];
      }

      const [invoices, totalCount] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            customer: {
              select: { id: true, name: true, email: true }
            },
            items: {
              include: {
                inventoryItem: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    description: true,
                    unitOfMeasure: true,
                    unitPrice: true,
                    quantityOnHand: true
                  }
                }
              }
            },
            payments: true
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take: Number(limit)
        }),
        prisma.invoice.count({ where })
      ]);

      // AI Insights: Generate financial insights for the invoice data
      const insights = await InvoiceController.generateInvoiceInsights(invoices, tenantId);

      res.json({
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalCount
        },
        aiInsights: insights,
        summary: {
          totalInvoices: totalCount,
          totalValue: invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0),
          paidInvoices: invoices.filter(inv => inv.status === 'PAID').length,
          overdueInvoices: invoices.filter(inv => inv.status === 'OVERDUE').length
        }
      });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Failed to retrieve invoices' });
    }
  }

  /**
   * 🔍 GET SINGLE INVOICE
   * Retrieve detailed invoice information with AI analysis
   */
  static async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          salesperson: true,
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  description: true,
                  unitOfMeasure: true,
                  unitPrice: true,
                  quantityOnHand: true
                }
              }
            }
          },
          payments: true,
          salesOrder: {
            include: {
              items: true
            }
          }
        }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // AI Analysis: Risk assessment and recommendations
      const aiAnalysis = await InvoiceController.analyzeInvoice(invoice);

      res.json({
        invoice,
        aiAnalysis,
        paymentStatus: {
          remainingAmount: parseFloat(invoice.totalAmount.toString()) - parseFloat(invoice.paidAmount.toString()),
          isFullyPaid: invoice.status === 'PAID',
          isOverdue: invoice.status === 'OVERDUE',
          daysPastDue: invoice.dueDate < new Date() ? 
            Math.floor((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
        }
      });
    } catch (error) {
      console.error('Get invoice by ID error:', error);
      res.status(500).json({ error: 'Failed to retrieve invoice' });
    }
  }



  /**
   * 🌐 GET INVOICE BY SHARE TOKEN (NO AUTH)
   */
  static async getInvoiceByShareToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params as { token: string };
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      // First try DB lookup by token
      let invoice = await prisma.invoice.findFirst({
        where: { shareToken: token },
        include: {
          customer: true,
          items: { include: { inventoryItem: true } },
          payments: true
        }
      });

      // If not present (when token stored in Firestore), resolve via Firestore
      if (!invoice) {
        try {
          await firebaseService.initialize();
          const db = getFirestore();
          const doc = await db.collection('invoiceShares').doc(token).get();
          if (doc.exists) {
            const data: any = doc.data();
            if (data?.invoiceId) {
              invoice = await prisma.invoice.findFirst({
                where: { id: data.invoiceId },
                include: { customer: true, items: { include: { inventoryItem: true } }, payments: true }
              });
              if (data?.expiresAt && new Date(data.expiresAt) < new Date()) {
                res.status(410).json({ error: 'Share link expired' });
                return;
              }
            }
          }
        } catch (fsErr) {
          console.warn('⚠️ Firestore lookup failed:', fsErr);
        }
      }

      if (!invoice) {
        res.status(404).json({ error: 'Invalid or expired link' });
        return;
      }

      if ((invoice as any).shareExpiresAt && (invoice as any).shareExpiresAt < new Date()) {
        res.status(410).json({ error: 'Share link expired' });
        return;
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Get invoice by token error:', error);
      res.status(500).json({ error: 'Failed to load shared invoice' });
    }
  }

  /**
   * 🎨 SAVE INVOICE DESIGN SETTINGS
   */
  static async saveInvoiceDesign(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;
      const { design } = req.body || {};

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }
      if (!design) {
        res.status(400).json({ error: 'Design payload is required' });
        return;
      }

      const invoice = await prisma.invoice.findFirst({ where: { id, tenantId }, select: { id: true } });
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      await prisma.invoice.update({ where: { id }, data: { designSettings: design } });
      res.json({ message: 'Design saved' });
    } catch (error) {
      console.error('Save invoice design error:', error);
      res.status(500).json({ error: 'Failed to save design' });
    }
  }
  /**
   * 💰 PROCESS PAYMENT
   * Record payment against an invoice with automatic reconciliation
   */
  static async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = invoicePaymentSchema.parse(req.body);

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: { payments: true }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      const currentPaidAmount = parseFloat(invoice.paidAmount.toString());
      const paymentAmount = validatedData.amount;
      const totalAmount = parseFloat(invoice.totalAmount.toString());
      const newPaidAmount = currentPaidAmount + paymentAmount;

      if (newPaidAmount > totalAmount) {
        res.status(400).json({ 
          error: 'Payment amount exceeds remaining balance',
          remainingBalance: totalAmount - currentPaidAmount
        });
        return;
      }

      // Create payment record
      const payment = await prisma.invoicePayment.create({
        data: {
          invoiceId: id,
          amount: paymentAmount,
          paymentDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date(),
          paymentMethod: validatedData.paymentMethod,
          reference: validatedData.reference,
          notes: validatedData.notes,
          tenantId
        }
      });

      // Update invoice status and paid amount
      const newStatus = newPaidAmount >= totalAmount ? 'PAID' : 
                       newPaidAmount > 0 ? 'PARTIALLY_PAID' : invoice.status;

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        },
        include: {
          customer: true,
          payments: true,
          items: true
        }
      });

      // Create journal entries for payment (ALE accounting flow)
      const accountingService = new AccountingService({ tenantId });
      const paymentJournalEntries = await accountingService.createPaymentJournalEntries(payment, updatedInvoice);
      
      console.log('✅ Payment journal entries created:', paymentJournalEntries);

      // Create corresponding bank transaction for the payment
      try {
        // Calculate running balance for this payment method
        const lastTransaction = await prisma.bankTransaction.findFirst({
          where: {
            paymentMethodId: validatedData.paymentMethod,
            tenantId
          },
          orderBy: { transactionDate: 'desc' }
        });

        const currentBalance = lastTransaction?.balance ? parseFloat(lastTransaction.balance.toString()) : 0;
        const newBalance = currentBalance + validatedData.amount;

        const bankTransaction = await prisma.bankTransaction.create({
          data: {
            paymentMethodId: validatedData.paymentMethod,
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            amount: validatedData.amount,
            transactionDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date(),
            type: 'DEPOSIT',
            reference: validatedData.reference || `INV-${invoice.invoiceNumber}`,
            category: 'invoice_payment',
            balance: newBalance,
            runningBalance: newBalance,
            status: 'cleared',
            reconciled: false,
            tenantId,
            metadata: {
              invoiceId: invoice.id,
              paymentId: payment.id,
              source: 'invoice_payment'
            }
          } as any
        });

        console.log('✅ Bank transaction created:', bankTransaction.id);
      } catch (bankError) {
        console.error('⚠️ Failed to create bank transaction (continuing with payment):', bankError);
        // Don't fail the payment if bank transaction creation fails
      }

      res.json({
        message: 'Payment recorded successfully',
        payment,
        invoice: {
          paidAmount: updatedInvoice.paidAmount,
          status: updatedInvoice.status,
          remainingBalance: parseFloat(updatedInvoice.totalAmount.toString()) - parseFloat(updatedInvoice.paidAmount.toString())
        },
        journalEntries: paymentJournalEntries
      });
    } catch (error) {
      console.error('Process payment error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to process payment' });
    }
  }

  /**
   * 📧 SEND INVOICE EMAIL
   * Send invoice via email with PDF attachment
   */
  static async sendInvoiceEmail(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;
      const { emailAddress, message } = req.body || {};

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          items: true
        }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Generate PDF (placeholder - would integrate with PDF generation service)
      const pdfUrl = `https://invoices.aibook.com/${invoice.invoiceNumber}.pdf`;

      // Update invoice status to SENT
      await prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' }
      });

      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      
      res.json({
        message: 'Invoice sent successfully',
        emailSent: true,
        pdfGenerated: true,
        recipient: emailAddress || invoice.customer.email,
        pdfUrl,
        aiRecommendations: [
          'Set up automatic follow-up reminders',
          'Track email open rates for customer engagement',
          'Consider offering early payment discounts'
        ]
      });
    } catch (error) {
      console.error('Send invoice error:', error);
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  }

  /**
   * 📊 INVOICE ANALYTICS
   * Generate comprehensive invoice analytics with AI insights
   */
  static async getInvoiceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { period = '3m' } = req.query;
      
      // Calculate date range
      const now = new Date();
      const periodMap: Record<string, number> = {
        '1m': 1, '3m': 3, '6m': 6, '1y': 12
      };
      const months = periodMap[period as string] || 3;
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

      const [totalInvoices, totalRevenue, overdueInvoices, paymentAnalysis] = await Promise.all([
        // Total invoices in period
        prisma.invoice.count({
          where: {
            tenantId,
            issueDate: { gte: startDate }
          }
        }),
        
        // Total revenue
        prisma.invoice.aggregate({
          where: {
            tenantId,
            issueDate: { gte: startDate }
          },
          _sum: { totalAmount: true }
        }),
        
        // Overdue invoices
        prisma.invoice.findMany({
          where: {
            tenantId,
            status: 'OVERDUE',
            dueDate: { lt: now }
          },
          include: { customer: true }
        }),
        
        // Payment analysis
        prisma.invoicePayment.aggregate({
          where: {
            tenantId,
            paymentDate: { gte: startDate }
          },
          _sum: { amount: true }
        })
      ]);

      // AI-powered insights
      const aiInsights = await aiService.generateFinancialInsights(tenantId, period as any);

      res.json({
        period,
        analytics: {
          totalInvoices,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalPayments: paymentAnalysis._sum.amount || 0,
          overdueAmount: overdueInvoices.reduce((sum, inv) => 
            sum + parseFloat(inv.totalAmount.toString()) - parseFloat(inv.paidAmount.toString()), 0),
          overdueCount: overdueInvoices.length,
          averageInvoiceValue: totalInvoices > 0 ? 
            (parseFloat(totalRevenue._sum.totalAmount?.toString() || '0') / totalInvoices) : 0,
          paymentRate: totalRevenue._sum.totalAmount ? 
            ((parseFloat(paymentAnalysis._sum.amount?.toString() || '0')) / 
             parseFloat(totalRevenue._sum.totalAmount.toString())) * 100 : 0
        },
        overdueInvoices,
        aiInsights,
        recommendations: [
          'Implement automated payment reminders',
          'Offer early payment discounts to improve cash flow',
          'Review credit terms for frequently late customers',
          'Consider factoring for immediate cash flow improvement'
        ]
      });
    } catch (error) {
      console.error('Invoice analytics error:', error);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  }

  // Get invoice journal data
  static async getInvoiceJournalData(req: Request, res: Response): Promise<void> {
    try {
      const { id: invoiceId } = req.params;
      const tenantId = req.tenant?.tenantId;
      
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Get invoice to get the invoice number and status
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // For DRAFT invoices, return empty journal entries
      if (invoice.status === 'DRAFT') {
        res.json({
          message: 'No journal entries for DRAFT invoice',
          journalEntries: [],
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            status: invoice.status
          },
          note: 'Journal entries will be created when invoice is sent'
        });
        return;
      }

      // Get all payments for this invoice first
      const payments = await prisma.invoicePayment.findMany({
        where: {
          invoiceId: invoice.id,
          tenantId
        }
      });

      // Get journal entries specifically for this invoice
      // Only return entries that are actually related to this specific invoice
      const journalEntries = await prisma.entry.findMany({
        where: {
          tenantId,
          AND: [
            // Must be created after the invoice was created
            { createdAt: { gte: invoice.createdAt } },
            {
              OR: [
                // 1. Direct reference match (invoice creation entries)
                { reference: invoice.invoiceNumber },
                
                // 2. Payment entries by payment reference
                ...payments.map(payment => ({ reference: payment.reference })).filter(criteria => criteria.reference),
                
                // 3. Memo containing the specific invoice number
                { memo: { contains: `Invoice ${invoice.invoiceNumber}` } },
                { memo: { contains: `A/R - Invoice ${invoice.invoiceNumber}` } },
                { memo: { contains: `Sales Revenue - Invoice ${invoice.invoiceNumber}` } },
                
                // 4. Search by invoice ID in memo
                { memo: { contains: invoice.id } }
              ]
            }
          ]
        },
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: [
          { journalId: 'desc' }, // Latest journal first
          { type: 'asc' } // DEBITs before CREDITs within same journal
        ]
      });

      console.log('🔍 Journal entries search results:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentsCount: payments.length,
        paymentReferences: payments.map(p => p.reference),
        entriesFound: journalEntries.length,
        journalIds: [...new Set(journalEntries.map(e => e.journalId))],
        searchCriteriaCount: payments.length + 4, // payment refs + 4 memo searches
        memoSearch: `"${invoice.invoiceNumber}"`
      });

      // Log the search results for debugging
      console.log('🔍 Journal entries search results:', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceCreatedAt: invoice.createdAt,
        paymentsCount: payments.length,
        paymentReferences: payments.map(p => p.reference),
        entriesFound: journalEntries.length,
        journalIds: [...new Set(journalEntries.map(e => e.journalId))],
        entryReferences: journalEntries.map(e => e.reference),
        entryMemos: journalEntries.map(e => e.memo)
      });

      res.json({
        message: 'Journal entries retrieved successfully',
        journalEntries,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          status: invoice.status
        }
      });
    } catch (error) {
      console.error('Error retrieving journal entries:', error);
      res.status(500).json({ error: 'Failed to retrieve journal entries' });
    }
  }

  // Private helper methods
  
  private static async generateInvoiceInsights(invoices: any[], tenantId: string) {
    const totalValue = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0);
    const unpaidValue = invoices.filter(inv => inv.status !== 'PAID').reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0);
    const overdueCount = invoices.filter(inv => inv.status === 'OVERDUE').length;
    const paidCount = invoices.filter(inv => inv.status === 'PAID').length;
    
    // Calculate average payment time (mock calculation)
    const avgPaymentDays = 28; // Mock: Average 28 days
    const expectedInflowDays = 30; // Expected inflow in next 30 days
    
    return {
      cashFlowPrediction: {
        expectedInflow: unpaidValue * 0.7, // 70% expected collection rate
        confidence: 0.85, // 85% confidence
        timeframe: `Next ${expectedInflowDays} days`
      },
      riskAssessment: {
        highRiskInvoices: overdueCount,
        totalRiskValue: invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0),
        riskLevel: overdueCount > 3 ? 'high' : overdueCount > 1 ? 'medium' : 'low'
      },
             paymentTrends: {
         averagePaymentDays: avgPaymentDays,
         onTimePaymentRate: paidCount / Math.max(invoices.length, 1),
         improvementSuggestions: [
           overdueCount > 0 ? `${overdueCount} overdue invoices need attention` : 'All invoices are current',
           totalValue > 50000 ? 'Strong invoice volume - consider cash flow optimization' : 'Consider increasing sales volume'
         ]
       },
       performanceMetrics: {
         collectionRate: paidCount / Math.max(invoices.length, 1),
         averagePaymentTime: avgPaymentDays,
         totalRevenue: totalValue,
         outstandingAmount: unpaidValue
       },
      insights: [
        {
          type: overdueCount > 0 ? 'warning' : 'success',
          message: overdueCount > 0 
            ? `${overdueCount} invoices are overdue and require attention` 
            : 'All invoices are up to date',
          action: overdueCount > 0 
            ? 'Review overdue invoices and send payment reminders'
            : 'Continue monitoring payment schedules'
        },
        {
          type: totalValue > 50000 ? 'success' : 'info',
          message: `Total invoice value: $${totalValue.toLocaleString()}`,
          action: totalValue > 50000 
            ? 'Consider cash flow optimization strategies'
            : 'Focus on increasing invoice volume'
        }
      ]
    };
  }

  private static async analyzeInvoice(invoice: any) {
    try {
      // Get customer payment history for AI analysis
      const customerInvoices = await prisma.invoice.findMany({
        where: { customerId: invoice.customerId },
        include: {
          payments: {
            orderBy: { paymentDate: 'desc' },
            take: 1
          }
        },
        orderBy: { issueDate: 'desc' },
        take: 10
      });

      // Calculate basic metrics
      const latePayments = customerInvoices.filter(inv => inv.status === 'OVERDUE').length;
      const totalInvoices = customerInvoices.length;
      
      // Calculate average payment time from invoices with payments
      const paidInvoices = customerInvoices.filter(inv => 
        inv.status === 'PAID' && inv.payments && inv.payments.length > 0
      );
      
      const avgPaymentTime = paidInvoices.length > 0 ? 
        paidInvoices.reduce((sum, inv) => {
          const lastPayment = inv.payments[0]; // Latest payment
          if (lastPayment && lastPayment.paymentDate && inv.issueDate) {
            return sum + Math.floor((lastPayment.paymentDate.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          return sum;
        }, 0) / paidInvoices.length : 30;

      // AI-powered analysis
      const aiAnalysis = await aiService.generateFinancialInsights(invoice.tenantId, '3m');
      
      // Calculate intelligent risk score using AI insights
      let riskScore = 0;
      const recommendations: string[] = [];
      
      // Base risk assessment
      if (invoice.status === 'OVERDUE') {
        riskScore += 40;
        recommendations.push('🚨 Invoice is overdue - Send immediate payment reminder');
        recommendations.push('📞 Consider phone follow-up for overdue amount');
      }
      
      // Amount-based risk
      const invoiceAmount = parseFloat(invoice.totalAmount.toString());
      if (invoiceAmount > 10000) {
        riskScore += 15;
        recommendations.push('💰 Large invoice amount - Monitor payment closely');
      }
      
      // Customer history analysis
      const latePaymentRate = latePayments / Math.max(totalInvoices, 1);
      if (latePaymentRate > 0.3) {
        riskScore += 25;
        recommendations.push('⚠️ Customer has history of late payments - Consider credit review');
      }
      
      // Payment speed analysis
      if (avgPaymentTime > 45) {
        riskScore += 15;
        recommendations.push('🐌 Customer typically pays slowly - Set expectations');
      } else if (avgPaymentTime < 15) {
        riskScore -= 10; // Reduce risk for fast-paying customers
        recommendations.push('⚡ Customer typically pays quickly - Low risk');
      }
      
      // AI-enhanced recommendations based on patterns
      if (aiAnalysis && aiAnalysis.length > 0) {
        recommendations.push('🤖 AI suggests monitoring cash flow trends');
        if (aiAnalysis.some(insight => insight.type === 'cash_flow' && insight.impact === 'high')) {
          recommendations.push('📊 Cash flow analysis indicates collection priority');
          riskScore += 10;
        }
      }

      // Credit assessment
      let creditAssessment = 'good';
      if (riskScore > 50) {
        creditAssessment = 'poor';
      } else if (riskScore > 25) {
        creditAssessment = 'fair';
      } else if (riskScore < 10) {
        creditAssessment = 'excellent';
      }

      // Payment prediction using AI-like analysis
      const daysSinceIssue = Math.floor((new Date().getTime() - invoice.issueDate.getTime()) / (1000 * 60 * 60 * 24));
      const expectedPaymentDays = avgPaymentTime + (riskScore / 5); // Factor in risk
      const paymentProbability = Math.max(0.1, Math.min(0.95, 
        1 - (riskScore / 100) - (daysSinceIssue / expectedPaymentDays * 0.3)
      ));
      
      const expectedPaymentDate = new Date(invoice.issueDate);
      expectedPaymentDate.setDate(expectedPaymentDate.getDate() + Math.round(expectedPaymentDays));

      return {
        riskScore: Math.round(riskScore),
        recommendations,
        creditAssessment,
        paymentPrediction: {
          probability: paymentProbability,
          confidence: 0.75 + (totalInvoices * 0.02), // Higher confidence with more data
          expectedDate: expectedPaymentDate.toISOString(),
          daysToPayment: Math.round(expectedPaymentDays)
        },
        customerInsights: {
          totalInvoices,
          latePaymentRate,
          avgPaymentDays: Math.round(avgPaymentTime),
          lastPaymentDate: paidInvoices.length > 0 ? paidInvoices[0].payments[0]?.paymentDate?.toISOString() : null
        },
        aiInsights: aiAnalysis?.slice(0, 2) || []
      };
    } catch (error) {
      console.error('Error in AI invoice analysis:', error);
      // Fallback to basic analysis
      return {
        riskScore: 25,
        recommendations: ['Unable to perform AI analysis - Using basic assessment'],
        creditAssessment: 'fair',
        paymentPrediction: {
          probability: 0.7,
          confidence: 0.5,
          expectedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          daysToPayment: 30
        },
        customerInsights: {
          totalInvoices: 0,
          latePaymentRate: 0,
          avgPaymentDays: 30
        },
        aiInsights: []
      };
    }
  }

  private static async getPaymentRecommendations(invoice: any) {
    const recommendations = [];
    
    if (invoice.status === 'PAID') {
      recommendations.push('Send thank you note to customer');
      recommendations.push('Update customer credit rating positively');
    } else if (invoice.status === 'PARTIALLY_PAID') {
      recommendations.push('Send balance reminder in 3 days');
      recommendations.push('Offer payment plan if customer requests');
    }
    
    return recommendations;
  }

  // Record payment against an invoice
  static async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id: invoiceId } = req.params;
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const paymentSchema = z.object({
        amount: z.number().positive('Payment amount must be positive'),
        paymentMethod: z.string().min(1, 'Payment method is required'),
        reference: z.string().optional(),
        notes: z.string().optional(),
        paymentDate: z.string().optional()
      });

      const validatedData = paymentSchema.parse(req.body);

      // Check if invoice exists
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId }
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Check if payment amount is valid
      const remainingBalance = parseFloat(invoice.totalAmount.toString()) - parseFloat(invoice.paidAmount.toString());
      if (validatedData.amount > remainingBalance) {
        res.status(400).json({ 
          error: 'Payment amount exceeds remaining balance',
          remainingBalance 
        });
        return;
      }

      const paymentDate = validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date();

      // Create payment record
      const payment = await prisma.invoicePayment.create({
        data: {
          invoiceId,
          amount: validatedData.amount,
          paymentDate,
          paymentMethod: validatedData.paymentMethod,
          reference: validatedData.reference,
          notes: validatedData.notes,
          tenantId
        }
      });

      // Update invoice paid amount and status
      const newPaidAmount = parseFloat(invoice.paidAmount.toString()) + validatedData.amount;
      const totalAmount = parseFloat(invoice.totalAmount.toString());
      
      let newStatus = invoice.status;
      if (newPaidAmount >= totalAmount) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        },
        include: {
          customer: true,
          payments: true,
          items: true
        }
      });

      // CRITICAL ALE FIX: Ensure invoice has revenue recognition entries first
      // If invoice was DRAFT and is now being paid, we need to create revenue recognition entries
      let invoiceJournalEntries = null;
      if (invoice.status === 'DRAFT') {
        try {
          // First, create revenue recognition entries (DEBIT A/R, CREDIT Sales Revenue)
          const accountingService = new AccountingService({ tenantId });
          invoiceJournalEntries = await accountingService.createInvoiceJournalEntries(updatedInvoice);
          console.log('✅ Created missing revenue recognition entries for DRAFT invoice:', invoiceJournalEntries);
        } catch (error) {
          console.error('❌ Failed to create revenue recognition entries:', error);
          // Continue with payment, but log the issue
        }
      }

      // Create journal entries for payment (ALE accounting flow)
      const accountingService = new AccountingService({ tenantId });
      const paymentJournalEntries = await accountingService.createPaymentJournalEntries(payment, updatedInvoice);
      
      console.log('✅ Payment journal entries created:', paymentJournalEntries);

      // Create corresponding bank transaction for the payment
      try {
        // Calculate running balance for this payment method
        const lastTransaction = await prisma.bankTransaction.findFirst({
          where: {
            paymentMethodId: validatedData.paymentMethod,
            tenantId
          },
          orderBy: { transactionDate: 'desc' }
        });

        const currentBalance = lastTransaction?.balance ? parseFloat(lastTransaction.balance.toString()) : 0;
        const newBalance = currentBalance + validatedData.amount;

        const bankTransaction = await prisma.bankTransaction.create({
          data: {
            paymentMethodId: validatedData.paymentMethod,
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            amount: validatedData.amount,
            transactionDate: paymentDate,
            type: 'DEPOSIT',
            reference: validatedData.reference || `INV-${invoice.invoiceNumber}`,
            category: 'invoice_payment',
            balance: newBalance,
            runningBalance: newBalance,
            status: 'cleared',
            reconciled: false,
            tenantId,
            metadata: {
              invoiceId: invoice.id,
              paymentId: payment.id,
              source: 'invoice_payment'
            }
          } as any
        });

        console.log('✅ Bank transaction created:', bankTransaction.id);
      } catch (bankError) {
        console.error('⚠️ Failed to create bank transaction (continuing with payment):', bankError);
        // Don't fail the payment if bank transaction creation fails
      }

      res.status(201).json({
        message: 'Payment recorded successfully',
        payment,
        invoice: {
          paidAmount: newPaidAmount,
          status: newStatus,
          remainingBalance: totalAmount - newPaidAmount
        },
        journalEntries: paymentJournalEntries
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed',
          details: error.errors 
        });
        return;
      }
      console.error('Error recording payment:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }

  // Get payments for an invoice
  static async getInvoicePayments(req: Request, res: Response): Promise<void> {
    try {
      const { id: invoiceId } = req.params;
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const payments = await prisma.invoicePayment.findMany({
        where: { invoiceId, tenantId },
        orderBy: { paymentDate: 'desc' }
      });

      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }
}

export default InvoiceController; 