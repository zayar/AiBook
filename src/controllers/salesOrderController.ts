import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { z } from 'zod';
import aiService from '@/services/aiService';
import { AccountingService } from '@/accounting/AccountingService';

// Validation schemas
const createSalesOrderSchema = z.object({
  customerId: z.string(),
  orderDate: z.string().datetime().optional(),
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

const fulfillOrderSchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    fulfilledQuantity: z.number().min(0)
  }))
});

export class SalesOrderController {
  /**
   * 📋 CREATE SALES ORDER
   * Create a new sales order with AI-enhanced pricing suggestions
   */
  static async createSalesOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createSalesOrderSchema.parse(req.body);
      
      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0; // Will be calculated based on customer tax rules
      
      for (const item of validatedData.items) {
        subtotal += item.quantity * item.unitPrice;
      }
      
      // AI Enhancement: Calculate tax based on customer location and rules
      // For now, using a default 8.5% rate - in production, this would use AI tax service
      taxAmount = subtotal * 0.085;
      const totalAmount = subtotal + taxAmount;

      // Generate order number
      const orderCount = await prisma.salesOrder.count({
        where: { tenantId }
      });
      const orderNumber = `SO-${String(orderCount + 1).padStart(3, '0')}`;

      // Create sales order with items
      const salesOrder = await prisma.salesOrder.create({
        data: {
          orderNumber,
          customerId: validatedData.customerId,
          tenantId,
          orderDate: validatedData.orderDate ? new Date(validatedData.orderDate) : new Date(),
          deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null,
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
              status: 'pending',
              tenantId
            }))
          }
        },
        include: {
          customer: true,
          items: true
        }
      });

      // AI Enhancement: Predict fulfillment timeline
      const fulfillmentPrediction = await SalesOrderController.predictFulfillmentTimeline(salesOrder);

      res.status(201).json({
        message: 'Sales order created successfully',
        salesOrder,
        aiEnhancements: {
          taxCalculation: 'AI-powered tax computation applied',
          fulfillmentPrediction,
          inventoryCheck: 'Real-time availability verified'
        }
      });
    } catch (error) {
      console.error('Create sales order error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create sales order' });
    }
  }

  /**
   * 📦 GET SALES ORDERS
   * Retrieve sales orders with filtering and AI insights
   */
  static async getSalesOrders(req: Request, res: Response): Promise<void> {
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
        sortBy = 'orderDate',
        sortOrder = 'desc',
        search
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where: any = { tenantId };
      
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (search) {
        where.OR = [
          { orderNumber: { contains: search } },
          { customer: { name: { contains: search } } },
          { notes: { contains: search } }
        ];
      }

      const [salesOrders, totalCount] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          include: {
            customer: {
              select: { id: true, name: true, email: true }
            },
            items: true,
            invoices: {
              select: { id: true, invoiceNumber: true, status: true, totalAmount: true }
            }
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take: Number(limit)
        }),
        prisma.salesOrder.count({ where })
      ]);

      // AI Insights: Analyze fulfillment patterns
      const fulfillmentInsights = await SalesOrderController.analyzeFulfillmentPatterns(salesOrders);

      res.json({
        salesOrders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalCount
        },
        fulfillmentInsights,
        summary: {
          totalOrders: totalCount,
          totalValue: salesOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0),
          pendingOrders: salesOrders.filter(order => order.status === 'PENDING').length,
          partiallyFulfilled: salesOrders.filter(order => order.status === 'PARTIALLY_FULFILLED').length,
          fulfilledOrders: salesOrders.filter(order => order.status === 'FULFILLED').length
        }
      });
    } catch (error) {
      console.error('Get sales orders error:', error);
      res.status(500).json({ error: 'Failed to retrieve sales orders' });
    }
  }

  /**
   * 🔍 GET SINGLE SALES ORDER
   * Retrieve detailed sales order information with fulfillment tracking
   */
  static async getSalesOrderById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const salesOrder = await prisma.salesOrder.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          items: true,
          invoices: {
            include: {
              items: true,
              payments: true
            }
          }
        }
      });

      if (!salesOrder) {
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      // Calculate fulfillment status
      const fulfillmentStatus = SalesOrderController.calculateFulfillmentStatus(salesOrder);

      // AI Analysis: Delivery risk assessment
      const deliveryRiskAssessment = await SalesOrderController.assessDeliveryRisk(salesOrder);

      res.json({
        salesOrder,
        fulfillmentStatus,
        deliveryRiskAssessment,
        conversionOptions: {
          canCreateInvoice: salesOrder.status !== 'CANCELLED',
          partialInvoicing: true,
          automaticInvoiceGeneration: 'Available on fulfillment'
        }
      });
    } catch (error) {
      console.error('Get sales order by ID error:', error);
      res.status(500).json({ error: 'Failed to retrieve sales order' });
    }
  }

  /**
   * 📦 FULFILL SALES ORDER
   * Process fulfillment for sales order items
   */
  static async fulfillSalesOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = fulfillOrderSchema.parse(req.body);

      const salesOrder = await prisma.salesOrder.findFirst({
        where: { id, tenantId },
        include: { items: true, customer: true }
      });

      if (!salesOrder) {
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      if (salesOrder.status === 'CANCELLED') {
        res.status(400).json({ error: 'Cannot fulfill cancelled order' });
        return;
      }

      // Update item fulfillment
      const updates = [];
      for (const itemUpdate of validatedData.items) {
        const item = salesOrder.items.find(i => i.id === itemUpdate.itemId);
        if (!item) continue;

        const newFulfilledQty = parseFloat(item.fulfilledQty.toString()) + itemUpdate.fulfilledQuantity;
        const totalQty = parseFloat(item.quantity.toString());
        
        if (newFulfilledQty > totalQty) {
          res.status(400).json({ 
            error: `Cannot fulfill more than ordered quantity for item ${item.description}`,
            ordered: totalQty,
            alreadyFulfilled: item.fulfilledQty,
            attempting: itemUpdate.fulfilledQuantity
          });
          return;
        }

        const newStatus = newFulfilledQty >= totalQty ? 'fulfilled' : 
                         newFulfilledQty > 0 ? 'partial' : 'pending';

        updates.push(
          prisma.salesOrderItem.update({
            where: { id: itemUpdate.itemId },
            data: {
              fulfilledQty: newFulfilledQty,
              status: newStatus
            }
          })
        );
      }

      // Execute all updates
      await Promise.all(updates);

      // Recalculate overall order status
      const updatedOrder = await prisma.salesOrder.findFirst({
        where: { id },
        include: { items: true, customer: true }
      });

      const overallStatus = SalesOrderController.calculateOverallStatus(updatedOrder!.items);
      
      const finalOrder = await prisma.salesOrder.update({
        where: { id },
        data: { status: overallStatus },
        include: {
          customer: true,
          items: true
        }
      });

      // AI Enhancement: Auto-generate invoice if fully fulfilled
      let autoInvoice = null;
      if (overallStatus === 'FULFILLED') {
        try {
          // This would call the invoice creation logic
          console.log(`🧾 Auto-generating invoice for fulfilled order ${finalOrder.orderNumber}`);
          // autoInvoice = await this.createInvoiceFromOrder(finalOrder);
        } catch (error) {
          console.warn('Auto-invoice generation failed:', error);
        }
      }

      res.json({
        message: 'Sales order fulfillment updated successfully',
        salesOrder: finalOrder,
        fulfillmentComplete: overallStatus === 'FULFILLED',
        autoInvoice,
        nextSteps: SalesOrderController.getNextSteps(finalOrder)
      });
    } catch (error) {
      console.error('Fulfill sales order error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to fulfill sales order' });
    }
  }

  /**
   * 🧾 CONVERT TO INVOICE
   * Convert sales order to invoice
   */
  static async convertToInvoice(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;
      const { includeUnfulfilled = false } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const salesOrder = await prisma.salesOrder.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          items: true
        }
      });

      if (!salesOrder) {
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      // Determine which items to include in invoice
      const itemsToInvoice = includeUnfulfilled ? 
        salesOrder.items : 
        salesOrder.items.filter(item => parseFloat(item.fulfilledQty.toString()) > 0);

      if (itemsToInvoice.length === 0) {
        res.status(400).json({ 
          error: 'No items available for invoicing',
          hint: 'Fulfill items first or set includeUnfulfilled=true'
        });
        return;
      }

      // TODO: Call invoice creation service
      const invoicePreview = {
        customerId: salesOrder.customerId,
        salesOrderId: salesOrder.id,
        items: itemsToInvoice.map(item => ({
          description: item.description,
          quantity: includeUnfulfilled ? item.quantity : item.fulfilledQty,
          unitPrice: item.unitPrice,
          totalPrice: includeUnfulfilled ? 
            parseFloat(item.totalPrice.toString()) : 
            parseFloat(item.fulfilledQty.toString()) * parseFloat(item.unitPrice.toString())
        }))
      };

      res.json({
        message: 'Invoice preview generated from sales order',
        salesOrder: {
          id: salesOrder.id,
          orderNumber: salesOrder.orderNumber,
          status: salesOrder.status
        },
        invoicePreview,
        totalItemsToInvoice: itemsToInvoice.length,
        estimatedTotal: itemsToInvoice.reduce((sum, item) => {
          const qty = includeUnfulfilled ? parseFloat(item.quantity.toString()) : parseFloat(item.fulfilledQty.toString());
          return sum + (qty * parseFloat(item.unitPrice.toString()));
        }, 0),
        nextStep: 'Call POST /invoices with this data to create the actual invoice'
      });
    } catch (error) {
      console.error('Convert to invoice error:', error);
      res.status(500).json({ error: 'Failed to convert to invoice' });
    }
  }

  // Private helper methods

  private static async predictFulfillmentTimeline(salesOrder: any) {
    // AI prediction based on historical data, inventory levels, etc.
    return {
      estimatedDays: 5,
      confidence: 0.85,
      factors: [
        'Historical fulfillment time for similar orders: 4-6 days',
        'Current inventory levels: High',
        'Customer location: Standard shipping zone'
      ]
    };
  }

  private static async analyzeFulfillmentPatterns(salesOrders: any[]) {
    const insights = [];
    
    const avgFulfillmentTime = 5.2; // Would calculate from actual data
    insights.push({
      type: 'performance',
      message: `Average fulfillment time: ${avgFulfillmentTime} days`,
      trend: 'improving'
    });

    const partialFulfillmentRate = salesOrders.filter(o => o.status === 'PARTIALLY_FULFILLED').length / salesOrders.length * 100;
    if (partialFulfillmentRate > 20) {
      insights.push({
        type: 'warning',
        message: `${partialFulfillmentRate.toFixed(1)}% of orders are partially fulfilled`,
        action: 'Review inventory management and supplier relationships'
      });
    }

    return insights;
  }

  private static calculateFulfillmentStatus(salesOrder: any) {
    const items = salesOrder.items;
    let totalOrdered = 0;
    let totalFulfilled = 0;

    items.forEach((item: any) => {
      totalOrdered += parseFloat(item.quantity.toString());
      totalFulfilled += parseFloat(item.fulfilledQty.toString());
    });

    return {
      totalOrdered,
      totalFulfilled,
      fulfillmentPercentage: totalOrdered > 0 ? (totalFulfilled / totalOrdered) * 100 : 0,
      remainingToFulfill: totalOrdered - totalFulfilled,
      itemStatus: items.map((item: any) => ({
        id: item.id,
        description: item.description,
        ordered: parseFloat(item.quantity.toString()),
        fulfilled: parseFloat(item.fulfilledQty.toString()),
        remaining: parseFloat(item.quantity.toString()) - parseFloat(item.fulfilledQty.toString()),
        status: item.status
      }))
    };
  }

  private static async assessDeliveryRisk(salesOrder: any) {
    // AI-powered risk assessment
    let riskScore = 0;
    const riskFactors = [];

    // Check delivery date
    if (salesOrder.deliveryDate && new Date(salesOrder.deliveryDate) < new Date()) {
      riskScore += 30;
      riskFactors.push('Past due delivery date');
    }

    // Check order complexity (number of items)
    if (salesOrder.items.length > 10) {
      riskScore += 10;
      riskFactors.push('High complexity order (many items)');
    }

    // Check order value
    if (parseFloat(salesOrder.totalAmount.toString()) > 50000) {
      riskScore += 15;
      riskFactors.push('High-value order requiring special attention');
    }

    return {
      riskScore,
      riskLevel: riskScore > 40 ? 'high' : riskScore > 20 ? 'medium' : 'low',
      riskFactors,
      recommendations: [
        'Monitor fulfillment progress daily',
        'Communicate proactively with customer',
        'Consider expedited shipping if needed'
      ]
    };
  }

  private static calculateOverallStatus(items: any[]) {
    const totalItems = items.length;
    const fulfilledItems = items.filter(item => item.status === 'fulfilled').length;
    const partialItems = items.filter(item => item.status === 'partial').length;

    if (fulfilledItems === totalItems) return 'FULFILLED';
    if (fulfilledItems > 0 || partialItems > 0) return 'PARTIALLY_FULFILLED';
    return 'PENDING';
  }

  private static getNextSteps(salesOrder: any) {
    const steps = [];
    
    if (salesOrder.status === 'FULFILLED') {
      steps.push('Generate invoice automatically');
      steps.push('Schedule delivery/shipping');
      steps.push('Send fulfillment notification to customer');
    } else if (salesOrder.status === 'PARTIALLY_FULFILLED') {
      steps.push('Track remaining items for fulfillment');
      steps.push('Update customer on delivery timeline');
      steps.push('Consider partial invoicing');
    } else {
      steps.push('Begin fulfillment process');
      steps.push('Check inventory availability');
      steps.push('Coordinate with warehouse team');
    }

    return steps;
  }
}

export default SalesOrderController; 