import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class InventoryController {
  /**
   * 📦 CREATE INVENTORY ITEM
   * Create a new inventory item
   */
  static async createItem(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const {
        sku,
        name,
        description,
        category,
        unit,
        costPrice,
        sellingPrice,
        initialStock,
        reorderPoint,
        supplierId,
        barcode,
        dimensions,
        weight
      } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate required fields
      if (!sku || !name || !costPrice || !sellingPrice) {
        res.status(400).json({ 
          error: 'SKU, name, cost price, and selling price are required' 
        });
        return;
      }

      // Check if SKU already exists
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { sku, tenantId }
      });

      if (existingItem) {
        res.status(409).json({ error: 'SKU already exists' });
        return;
      }

      // Get default asset and COGS accounts for this tenant
      const [assetAccount, cogsAccount] = await Promise.all([
        prisma.account.findFirst({
          where: { tenantId, type: 'ASSET', name: { contains: 'Inventory' } }
        }),
        prisma.account.findFirst({
          where: { tenantId, type: 'EXPENSE', name: { contains: 'Cost of Goods Sold' } }
        })
      ]);

      if (!assetAccount || !cogsAccount) {
        res.status(400).json({ 
          error: 'Default inventory accounts not found. Please set up Chart of Accounts first.' 
        });
        return;
      }

      // Create inventory item
      const item = await prisma.inventoryItem.create({
        data: {
          tenantId,
          sku,
          name,
          description,
          category,
          unitOfMeasure: unit || 'each',
          unitCost: parseFloat(costPrice),
          unitPrice: parseFloat(sellingPrice),
          quantityOnHand: initialStock || 0,
          reorderLevel: reorderPoint || 0,
          assetAccountId: assetAccount.id,
          cogsAccountId: cogsAccount.id,
          isActive: true
        }
      });

      // Create initial stock adjustment if initial stock provided
      if (initialStock && initialStock > 0) {
        await prisma.inventoryAdjustment.create({
          data: {
            tenantId,
            itemId: item.id,
            adjustmentType: 'INCREASE',
            quantity: initialStock,
            unitCost: parseFloat(costPrice),
            totalValue: initialStock * parseFloat(costPrice),
            reason: 'Initial Stock',
            reference: 'Initial inventory setup',
            adjustedBy: req.user?.uid || 'system'
          }
        });
      }

      res.status(201).json({
        message: 'Inventory item created successfully',
        item,
        aiRecommendations: [
          'Set up automated reorder notifications',
          'Track stock movement patterns',
          'Monitor profit margins by item'
        ]
      });
    } catch (error) {
      console.error('Create inventory item error:', error);
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  }

  /**
   * 📋 GET INVENTORY ITEMS
   * Get paginated list of inventory items
   */
  static async getItems(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        category, 
        status,
        lowStock 
      } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Build where clause
      const where: any = { tenantId };
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }
      
      if (category) {
        where.category = category;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (lowStock === 'true') {
        where.quantityOnHand = { lte: where.reorderLevel || 0 };
      }

      // Get items with pagination
      const [items, total] = await Promise.all([
        prisma.inventoryItem.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { createdAt: 'desc' },
          include: {
            assetAccount: true,
            cogsAccount: true,
            _count: {
              select: { adjustments: true }
            }
          }
        }),
        prisma.inventoryItem.count({ where })
      ]);

      // Calculate additional metrics
      const itemsWithMetrics = await Promise.all(
        items.map(async (item: any) => {
          const recentAdjustments = await prisma.inventoryAdjustment.findMany({
            where: { itemId: item.id },
            orderBy: { createdAt: 'desc' },
            take: 5
          });

          const totalValue = item.quantityOnHand * item.unitCost;
          const isLowStock = item.quantityOnHand <= (item.reorderLevel || 0);

          return {
            ...item,
            totalValue,
            isLowStock,
            recentActivity: recentAdjustments.length
          };
        })
      );

      res.json({
        items: itemsWithMetrics,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        },
        summary: {
          totalItems: total,
          lowStockItems: itemsWithMetrics.filter(item => item.isLowStock).length,
          totalValue: itemsWithMetrics.reduce((sum, item) => sum + item.totalValue, 0)
        }
      });
    } catch (error) {
      console.error('Get inventory items error:', error);
      res.status(500).json({ error: 'Failed to get inventory items' });
    }
  }

  /**
   * 📦 GET INVENTORY ITEM
   * Get a specific inventory item with details
   */
  static async getItem(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const item = await prisma.inventoryItem.findFirst({
        where: { id, tenantId },
        include: {
          assetAccount: true,
          cogsAccount: true,
          adjustments: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });

      if (!item) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
      }

      // Calculate additional metrics
      const totalValue = parseFloat(item.quantityOnHand.toString()) * parseFloat(item.unitCost.toString());
      const isLowStock = parseFloat(item.quantityOnHand.toString()) <= parseFloat((item.reorderLevel || 0).toString());

      // Get stock movement analysis
      const stockAnalysis = await this.getStockAnalysis(item.id);

      res.json({
        item: {
          ...item,
          totalValue,
          isLowStock
        },
        stockAnalysis
      });
    } catch (error) {
      console.error('Get inventory item error:', error);
      res.status(500).json({ error: 'Failed to get inventory item' });
    }
  }

  /**
   * 🔄 ADJUST INVENTORY STOCK
   * Adjust stock levels for an inventory item
   */
  static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;
      const {
        type,
        quantity,
        unitCost,
        reference,
        notes,
        reason
      } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate required fields
      if (!type || !quantity || quantity === 0) {
        res.status(400).json({ 
          error: 'Type and quantity are required, quantity cannot be zero' 
        });
        return;
      }

      // Get current item
      const item = await prisma.inventoryItem.findFirst({
        where: { id, tenantId }
      });

      if (!item) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
      }

      // Calculate new stock level
      let newStock = parseFloat(item.quantityOnHand.toString());
      let adjustmentType: 'INCREASE' | 'DECREASE' | 'RECOUNT';
      
      if (type === 'PURCHASE' || type === 'RETURN') {
        newStock += quantity;
        adjustmentType = 'INCREASE';
      } else if (type === 'SALE' || type === 'ADJUSTMENT') {
        newStock -= quantity;
        adjustmentType = 'DECREASE';
      } else {
        adjustmentType = 'RECOUNT';
      }

      // Check for negative stock (unless it's an adjustment)
      if (newStock < 0 && type !== 'ADJUSTMENT') {
        res.status(400).json({ 
          error: 'Insufficient stock for this operation' 
        });
        return;
      }

      // Create adjustment and update stock in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create inventory adjustment
        const adjustment = await tx.inventoryAdjustment.create({
          data: {
            tenantId,
            itemId: id,
            adjustmentType,
            quantity,
            unitCost: unitCost ? parseFloat(unitCost) : parseFloat(item.unitCost.toString()),
            totalValue: quantity * (unitCost ? parseFloat(unitCost) : parseFloat(item.unitCost.toString())),
            reason: reason || `${type} Adjustment`,
            reference: reference || `${type} Adjustment`,
            adjustedBy: req.user?.uid || 'system',
            notes
          }
        });

        // Update item stock
        const updatedItem = await tx.inventoryItem.update({
          where: { id },
          data: { quantityOnHand: newStock }
        });

        return { adjustment, updatedItem };
      });

      res.json({
        message: 'Stock adjusted successfully',
        adjustment: result.adjustment,
        item: result.updatedItem,
        stockChange: {
          previous: item.quantityOnHand,
          new: newStock,
          change: quantity
        }
      });
    } catch (error) {
      console.error('Adjust stock error:', error);
      res.status(500).json({ error: 'Failed to adjust stock' });
    }
  }

  /**
   * 📊 GET STOCK ANALYSIS
   * Get detailed stock movement analysis for an item
   */
  private static async getStockAnalysis(itemId: string) {
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const analysis = {
      totalPurchases: 0,
      totalSales: 0,
      totalReturns: 0,
      totalAdjustments: 0,
      averagePurchasePrice: 0,
      averageSalePrice: 0,
      turnoverRate: 0,
      lastActivity: null as any
    };

    if (adjustments.length > 0) {
      const purchases = adjustments.filter(t => t.reason?.includes('PURCHASE'));
      const sales = adjustments.filter(t => t.reason?.includes('SALE'));
      const returns = adjustments.filter(t => t.reason?.includes('RETURN'));
      const otherAdjustments = adjustments.filter(t => !t.reason?.includes('PURCHASE') && !t.reason?.includes('SALE') && !t.reason?.includes('RETURN'));

      analysis.totalPurchases = purchases.reduce((sum: number, t: any) => sum + Number(t.quantity), 0);
      analysis.totalSales = sales.reduce((sum: number, t: any) => sum + Number(t.quantity), 0);
      analysis.totalReturns = returns.reduce((sum: number, t: any) => sum + Number(t.quantity), 0);
      analysis.totalAdjustments = otherAdjustments.reduce((sum: number, t: any) => sum + Number(t.quantity), 0);

      if (purchases.length > 0) {
        analysis.averagePurchasePrice = purchases.reduce((sum: number, t: any) => sum + Number(t.unitCost), 0) / purchases.length;
      }

      if (sales.length > 0) {
        analysis.averageSalePrice = sales.reduce((sum: number, t: any) => sum + Number(t.unitCost), 0) / sales.length;
      }

      analysis.lastActivity = adjustments[0];
      analysis.turnoverRate = analysis.totalSales / (analysis.totalPurchases + analysis.totalReturns);
    }

    return analysis;
  }

  /**
   * 📈 GET INVENTORY REPORTS
   * Get various inventory reports
   */
  static async getReports(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { type = 'summary', period = '30d' } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      let report: any = {};

      switch (type) {
        case 'summary':
          report = await this.getSummaryReport(tenantId);
          break;
        case 'low-stock':
          report = await this.getLowStockReport(tenantId);
          break;
        case 'movement':
          report = await this.getMovementReport(tenantId, period as string);
          break;
        case 'value':
          report = await this.getValueReport(tenantId);
          break;
        default:
          res.status(400).json({ error: 'Invalid report type' });
          return;
      }

      res.json({ report });
    } catch (error) {
      console.error('Get inventory reports error:', error);
      res.status(500).json({ error: 'Failed to get inventory reports' });
    }
  }

  private static async getSummaryReport(tenantId: string) {
    const [totalItems, lowStockItems, totalValue, recentAdjustments] = await Promise.all([
      prisma.inventoryItem.count({ where: { tenantId } }),
      prisma.inventoryItem.count({ 
        where: { 
          tenantId,
          quantityOnHand: { lte: prisma.inventoryItem.fields.reorderLevel }
        }
      }),
      prisma.inventoryItem.aggregate({
        where: { tenantId },
        _sum: { quantityOnHand: true }
      }),
      prisma.inventoryAdjustment.count({
        where: { 
          tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    return {
      totalItems,
      lowStockItems,
      totalValue: totalValue._sum.quantityOnHand || 0,
      recentActivity: recentAdjustments
    };
  }

  private static async getLowStockReport(tenantId: string) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        quantityOnHand: { lte: prisma.inventoryItem.fields.reorderLevel }
      },
      orderBy: { quantityOnHand: 'asc' }
    });

    return items.map((item: any) => ({
      ...item,
      stockNeeded: (item.reorderLevel || 0) - item.quantityOnHand,
      daysUntilStockout: this.calculateDaysUntilStockout(item)
    }));
  }

  private static async getMovementReport(tenantId: string, period: string) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const adjustments = await prisma.inventoryAdjustment.groupBy({
      by: ['adjustmentType', 'createdAt'],
      where: {
        tenantId,
        createdAt: { gte: startDate }
      },
      _sum: { quantity: true }
    });

    return adjustments;
  }

  private static async getValueReport(tenantId: string) {
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        quantityOnHand: true,
        unitCost: true,
        unitPrice: true
      }
    });

    return items.map((item: any) => ({
      ...item,
      totalCost: item.quantityOnHand * item.unitCost,
      totalValue: item.quantityOnHand * item.unitPrice,
      profitMargin: ((item.unitPrice - item.unitCost) / item.unitPrice) * 100
    }));
  }

  private static calculateDaysUntilStockout(item: any): number {
    // This would need historical data to calculate accurately
    // For now, return a placeholder
    return item.currentStock > 0 ? Math.ceil(item.currentStock / 2) : 0;
  }
} 