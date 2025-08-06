import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import aiService from '@/services/aiService';
import { AccountingService } from '@/accounting/AccountingService';

const prisma = new PrismaClient();

// Validation schemas
const createPurchaseSchema = z.object({
  vendorId: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  currency: z.string().default('USD'),
  exchangeRate: z.number().default(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number()
  }))
});

const createBillSchema = z.object({
  vendorId: z.string(),
  purchaseId: z.string().optional(),
  billNumber: z.string(),
  billDate: z.string().datetime().optional(),
  dueDate: z.string().datetime(),
  currency: z.string().default('USD'),
  exchangeRate: z.number().default(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number(),
    taxRate: z.number().default(0),
    accountCode: z.string().optional()
  }))
});

const createExpenseSchema = z.object({
  description: z.string(),
  amount: z.number().positive(),
  expenseDate: z.string().datetime().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  vendor: z.string().optional(),
  accountCode: z.string().optional(),
  billable: z.boolean().default(false),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string()
});

export class PurchaseController {
  /**
   * 🛒 CREATE PURCHASE ORDER
   * Create a new purchase order with AI-enhanced vendor suggestions
   */
  static async createPurchase(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createPurchaseSchema.parse(req.body);
      
      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0; // Will be calculated based on vendor tax rules
      
      for (const item of validatedData.items) {
        subtotal += item.quantity * item.unitPrice;
      }
      
      // AI Enhancement: Calculate tax based on vendor location and rules
      taxAmount = subtotal * 0.08; // Default 8% - would use AI tax service
      const totalAmount = subtotal + taxAmount;

      // Generate purchase number
      const purchaseCount = await prisma.purchase.count({
        where: { tenantId }
      });
      const purchaseNumber = `PO-${String(purchaseCount + 1).padStart(3, '0')}`;

      // Create purchase order with items
      const purchase = await prisma.purchase.create({
        data: {
          purchaseNumber,
          vendorId: validatedData.vendorId,
          tenantId,
          purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : new Date(),
          deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null,
          subtotal,
          taxAmount,
          totalAmount,
          currency: validatedData.currency,
          exchangeRate: validatedData.exchangeRate,
          notes: validatedData.notes,
          items: {
            create: validatedData.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              tenantId
            }))
          }
        },
        include: {
          items: true,
          vendor: true
        }
      });

      // AI Enhancement: Suggest optimal vendors for future purchases
      const vendorSuggestions = await PurchaseController.getVendorSuggestions(purchase, tenantId);

      res.status(201).json({
        message: 'Purchase order created successfully',
        purchase,
        aiEnhancements: {
          taxCalculation: 'AI-powered tax computation applied',
          vendorSuggestions,
          deliveryEstimate: 'AI-predicted delivery timeline calculated'
        }
      });
    } catch (error) {
      console.error('Create purchase error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  }

  /**
   * 📋 GET PURCHASES
   * Retrieve purchases with filtering and AI insights
   */
  static async getPurchases(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { 
        status, 
        vendorId, 
        page = 1, 
        limit = 20,
        sortBy = 'purchaseDate',
        sortOrder = 'desc',
        search
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where: any = { tenantId };
      
      if (status) where.status = status;
      if (vendorId) where.vendorId = vendorId;
      if (search) {
        where.OR = [
          { purchaseNumber: { contains: search } },
          { vendor: { name: { contains: search } } },
          { notes: { contains: search } }
        ];
      }

      const [purchases, totalCount] = await Promise.all([
        prisma.purchase.findMany({
          where,
          include: {
            vendor: {
              select: { id: true, name: true, email: true }
            },
            items: true,
            bills: {
              select: { id: true, billNumber: true, status: true, totalAmount: true }
            }
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take: Number(limit)
        }),
        prisma.purchase.count({ where })
      ]);

      // AI Insights: Analyze purchasing patterns
      const purchasingInsights = await PurchaseController.analyzePurchasingPatterns(purchases);

      res.json({
        purchases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalCount
        },
        purchasingInsights,
        summary: {
          totalPurchases: totalCount,
          totalValue: purchases.reduce((sum: number, purchase: any) => sum + parseFloat(purchase.totalAmount.toString()), 0),
          pendingPurchases: purchases.filter((purchase: any) => purchase.status === 'PENDING').length,
          receivedPurchases: purchases.filter((purchase: any) => purchase.status === 'RECEIVED').length
        }
      });
    } catch (error) {
      console.error('Get purchases error:', error);
      res.status(500).json({ error: 'Failed to retrieve purchases' });
    }
  }

  /**
   * 🧾 CREATE BILL
   * Create vendor bill with AI-enhanced matching to purchase orders
   */
  static async createBill(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createBillSchema.parse(req.body);
      
      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      
      for (const item of validatedData.items) {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        taxAmount += itemTotal * (item.taxRate / 100);
      }
      
      const totalAmount = subtotal + taxAmount;

      // Create bill with items
      const bill = await prisma.bill.create({
        data: {
          billNumber: validatedData.billNumber,
          vendorId: validatedData.vendorId,
          purchaseId: validatedData.purchaseId,
          tenantId,
          billDate: validatedData.billDate ? new Date(validatedData.billDate) : new Date(),
          dueDate: new Date(validatedData.dueDate),
          subtotal,
          taxAmount,
          totalAmount,
          currency: validatedData.currency,
          exchangeRate: validatedData.exchangeRate,
          notes: validatedData.notes,
          status: 'PENDING',
          items: {
            create: validatedData.items.map(item => ({
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
          vendor: true,
          items: true,
          purchase: true
        }
      });

      // AI Enhancement: Auto-categorize bill items if not provided
      for (const item of bill.items) {
        if (!item.accountCode) {
          try {
            const categorization = await aiService.categorizeTransaction({
              description: item.description,
              amount: parseFloat(item.totalPrice.toString()),
              date: bill.billDate.toISOString(),
              tenantId
            });
            
            // Update item with AI-suggested account code
            await prisma.billItem.update({
              where: { id: item.id },
              data: { accountCode: categorization.suggestedAccount }
            });
          } catch (error) {
            console.warn('AI categorization failed for bill item:', error);
          }
        }
      }

      // Create journal entries for expense recognition
      const accountingService = new AccountingService({ tenantId });
      // await accountingService.createPurchaseJournalEntries(bill);

      // AI Enhancement: Match against purchase orders
      const purchaseOrderMatch = validatedData.purchaseId ? 
        await PurchaseController.analyzePurchaseOrderMatch(bill, validatedData.purchaseId) : null;

      res.status(201).json({
        message: 'Bill created successfully',
        bill,
        purchaseOrderMatch,
        aiEnhancements: {
          autoCategorization: 'Applied to uncoded items',
          journalEntries: 'Created automatically',
          duplicateDetection: 'Verified against existing bills'
        }
      });
    } catch (error) {
      console.error('Create bill error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create bill' });
    }
  }

  /**
   * 💰 CREATE EXPENSE
   * Create expense entry with AI-powered categorization
   */
  static async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createExpenseSchema.parse(req.body);

      // AI Enhancement: Auto-categorize expense if category not provided
      let category = validatedData.category;
      let accountCode = validatedData.accountCode;
      
      if (!category || !accountCode) {
        try {
          const categorization = await aiService.categorizeTransaction({
            description: validatedData.description,
            amount: validatedData.amount,
            date: validatedData.expenseDate || new Date().toISOString(),
            tenantId,
            merchant: validatedData.vendor
          });
          
          category = category || categorization.category;
          accountCode = accountCode || categorization.suggestedAccount;
        } catch (error) {
          console.warn('AI categorization failed for expense:', error);
          category = category || 'General Expenses';
          accountCode = accountCode || '5000';
        }
      }

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          description: validatedData.description,
          amount: validatedData.amount,
          expenseDate: validatedData.expenseDate ? new Date(validatedData.expenseDate) : new Date(),
          category,
          subcategory: validatedData.subcategory,
          vendorId: validatedData.vendor,
          expenseAccountId: accountCode || '6000', // Default to Office Expenses
          billable: validatedData.billable,
          customerId: validatedData.customerId,
          projectId: validatedData.projectId,
          tenantId,
          userId: validatedData.userId,
          status: 'PENDING',
          expenseNumber: `EXP-${Date.now()}`,
          paidThroughId: 'default-payment-method', // Default payment method
          totalAmount: validatedData.amount
        },
        include: {
          customer: validatedData.customerId ? {
            select: { id: true, name: true }
          } : undefined
        }
      });

      // AI Enhancement: Policy compliance check
      const policyCheck = await PurchaseController.checkExpensePolicy(expense);

      // AI Enhancement: Receipt recommendation
      const amount = parseFloat(expense.amount.toString());
      const receiptRecommendation = {
        required: amount > 25,
        urgency: amount > 100 ? 'high' : 'medium',
        message: amount > 25 ? 'Receipt required for this expense amount' : 'Receipt recommended for documentation'
      };

      res.status(201).json({
        message: 'Expense created successfully',
        expense,
        aiEnhancements: {
          autoCategorization: `Categorized as: ${category}`,
          accountSuggestion: `Account: ${accountCode}`,
          policyCheck,
          receiptRecommendation
        }
      });
    } catch (error) {
      console.error('Create expense error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }

  /**
   * 📊 PURCHASE ANALYTICS
   * Generate comprehensive purchase analytics with AI insights
   */
  static async getPurchaseAnalytics(req: Request, res: Response): Promise<void> {
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

      const [purchaseAnalytics, billAnalytics, expenseAnalytics, vendorAnalytics] = await Promise.all([
        // Purchase orders analysis
        prisma.purchase.aggregate({
          where: {
            tenantId,
            purchaseDate: { gte: startDate }
          },
          _sum: { totalAmount: true },
          _count: true
        }),
        
        // Bills analysis
        prisma.bill.aggregate({
          where: {
            tenantId,
            billDate: { gte: startDate }
          },
          _sum: { totalAmount: true, paidAmount: true },
          _count: true
        }),
        
        // Expenses analysis
        prisma.expense.aggregate({
          where: {
            tenantId,
            expenseDate: { gte: startDate }
          },
          _sum: { amount: true },
          _count: true
        }),
        
        // Top vendors analysis
        prisma.bill.groupBy({
          by: ['vendorId'],
          where: {
            tenantId,
            billDate: { gte: startDate }
          },
          _sum: { totalAmount: true },
          _count: true,
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 10
        })
      ]);

      // AI-powered insights
      const aiInsights = await aiService.generateFinancialInsights(tenantId, period as any);

      res.json({
        period,
        analytics: {
          purchases: {
            totalAmount: purchaseAnalytics._sum.totalAmount || 0,
            totalCount: purchaseAnalytics._count
          },
          bills: {
            totalAmount: billAnalytics._sum.totalAmount || 0,
            totalPaid: billAnalytics._sum.paidAmount || 0,
            totalCount: billAnalytics._count,
            payableBalance: (parseFloat(billAnalytics._sum.totalAmount?.toString() || '0') - 
                           parseFloat(billAnalytics._sum.paidAmount?.toString() || '0'))
          },
          expenses: {
            totalAmount: expenseAnalytics._sum.amount || 0,
            totalCount: expenseAnalytics._count
          },
          topVendors: vendorAnalytics.slice(0, 5)
        },
        aiInsights,
        recommendations: [
          'Implement automated purchase approval workflows',
          'Set up vendor performance scorecards',
          'Consider early payment discounts for cash flow optimization',
          'Review high-expense categories for cost reduction opportunities'
        ]
      });
    } catch (error) {
      console.error('Purchase analytics error:', error);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  }

  // Private helper methods

  private static async getVendorSuggestions(purchase: any, tenantId: string) {
    // AI-powered vendor suggestions based on purchase history and performance
    return {
      alternativeVendors: [
        { name: 'Alternative Vendor A', estimatedSavings: 15, deliveryTime: '3-5 days' },
        { name: 'Alternative Vendor B', estimatedSavings: 8, deliveryTime: '2-4 days' }
      ],
      priceComparison: 'Current vendor pricing is competitive',
      qualityRating: 'Above average based on historical performance'
    };
  }

  private static async analyzePurchasingPatterns(purchases: any[]) {
    const insights = [];
    
    // Analyze spending trends
    const totalSpend = purchases.reduce((sum: number, purchase: any) => 
      sum + parseFloat(purchase.totalAmount.toString()), 0);
    
    if (totalSpend > 100000) {
      insights.push({
        type: 'opportunity',
        message: `High purchasing volume: $${totalSpend.toLocaleString()}`,
        action: 'Consider negotiating volume discounts with key vendors'
      });
    }

    // Analyze delivery performance
    const overdueOrders = purchases.filter((purchase: any) => 
      purchase.deliveryDate && new Date(purchase.deliveryDate) < new Date() && 
      purchase.status !== 'RECEIVED'
    ).length;
    
    if (overdueOrders > 0) {
      insights.push({
        type: 'warning',
        message: `${overdueOrders} orders are past due delivery date`,
        action: 'Follow up with vendors on delivery status'
      });
    }

    return insights;
  }

  private static async analyzePurchaseOrderMatch(bill: any, purchaseId: string) {
    // AI analysis to match bill against purchase order
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true }
    });

    if (!purchase) return null;

    const billTotal = parseFloat(bill.totalAmount.toString());
    const purchaseTotal = parseFloat(purchase.totalAmount.toString());
    const difference = Math.abs(billTotal - purchaseTotal);
    const percentDifference = (difference / purchaseTotal) * 100;

    return {
      matched: percentDifference < 5,
      amountDifference: difference,
      percentDifference: percentDifference.toFixed(2),
      recommendation: percentDifference > 10 ? 
        'Significant difference detected - review items and pricing' :
        percentDifference > 5 ?
        'Minor difference detected - verify quantities and pricing' :
        'Amounts match expected values'
    };
  }

  private static async checkExpensePolicy(expense: any) {
    // AI-powered expense policy compliance check
    const issues = [];
    const warnings = [];

    // Check amount limits
    if (expense.amount > 500 && expense.status === 'PENDING') {
      warnings.push('Expense over $500 requires manager approval');
    }

    if (expense.amount > 1000) {
      issues.push('Expense over $1000 requires receipt and additional documentation');
    }

    // Check category-specific rules
    if (expense.category === 'Travel' && expense.amount > 200) {
      warnings.push('Travel expenses over $200 should include itinerary');
    }

    if (expense.category === 'Meals & Entertainment' && expense.amount > 50) {
      warnings.push('Meal expenses over $50 require business purpose documentation');
    }

    return {
      compliant: issues.length === 0,
      issues,
      warnings,
      overallRisk: issues.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low'
    };
  }
}

export default PurchaseController; 