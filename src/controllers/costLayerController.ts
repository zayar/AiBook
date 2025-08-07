import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AccountingService } from '../accounting/AccountingService';

const prisma = new PrismaClient();

// Validation schemas
const createCostLayerSchema = z.object({
  inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().positive('Unit cost must be positive'),
  purchaseDate: z.string().datetime().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

/**
 * 📦 COST LAYER CONTROLLER
 * Dedicated API for managing inventory cost layers for COGS calculations
 */
export class CostLayerController {
  
  /**
   * 📦 CREATE COST LAYER
   * POST /api/v1/cost-layers
   */
  static async createCostLayer(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createCostLayerSchema.parse(req.body);
      
      // Initialize accounting service
      const accountingService = new AccountingService({ tenantId });

      // Create cost layer
      const costLayer = await accountingService.recordInventoryPurchase({
        inventoryItemId: validatedData.inventoryItemId,
        quantity: validatedData.quantity,
        unitCost: validatedData.unitCost,
        purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : new Date(),
        reference: validatedData.reference || `MANUAL-LAYER-${Date.now()}`
      });

      res.status(201).json({
        success: true,
        message: 'Cost layer created successfully',
        costLayer,
        notes: validatedData.notes
      });

    } catch (error) {
      console.error('Create cost layer error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false,
          error: 'Validation error', 
          details: error.errors 
        });
        return;
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to create cost layer' 
      });
    }
  }

  /**
   * 📊 GET COST LAYERS
   * GET /api/v1/cost-layers/:inventoryItemId
   */
  static async getCostLayers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { inventoryItemId } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const costLayers = await prisma.inventoryCostLayer.findMany({
        where: {
          tenantId,
          inventoryItemId
        },
        orderBy: [
          { purchaseDate: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          inventoryItem: {
            select: {
              sku: true,
              name: true,
              quantityOnHand: true
            }
          }
        }
      });

      // Calculate summary
      const summary = costLayers.reduce((acc, layer) => {
        acc.totalOriginalQuantity += parseFloat(layer.originalQuantity.toString());
        acc.totalRemainingQuantity += parseFloat(layer.remainingQuantity.toString());
        acc.totalValue += parseFloat(layer.remainingQuantity.toString()) * parseFloat(layer.unitCost.toString());
        acc.layerCount += 1;
        return acc;
      }, {
        totalOriginalQuantity: 0,
        totalRemainingQuantity: 0,
        totalValue: 0,
        layerCount: 0
      });

      res.json({
        success: true,
        inventoryItemId,
        costLayers,
        summary,
        averageCost: summary.totalRemainingQuantity > 0 ? summary.totalValue / summary.totalRemainingQuantity : 0
      });

    } catch (error) {
      console.error('Get cost layers error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve cost layers' 
      });
    }
  }

  /**
   * 🧮 CALCULATE COGS
   * POST /api/v1/cost-layers/calculate-cogs
   */
  static async calculateCOGS(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const {
        inventoryItemId,
        quantitySold,
        saleDate,
        reference
      } = req.body;

      if (!inventoryItemId || !quantitySold) {
        res.status(400).json({ 
          error: 'Inventory item ID and quantity sold are required' 
        });
        return;
      }

      // Initialize accounting service
      const accountingService = new AccountingService({ tenantId });

      // Calculate COGS
      const cogsResult = await accountingService.calculateCOGS({
        invoiceItemId: `temp-${Date.now()}`, // Temporary ID for manual calculation
        inventoryItemId,
        quantitySold: parseFloat(quantitySold),
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        reference: reference || `MANUAL-COGS-${Date.now()}`
      });

      res.json({
        success: true,
        message: 'COGS calculated successfully',
        result: cogsResult
      });

    } catch (error) {
      console.error('Calculate COGS error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to calculate COGS',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔄 BULK CREATE COST LAYERS
   * POST /api/v1/cost-layers/bulk
   */
  static async bulkCreateCostLayers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { costLayers } = req.body;
      
      if (!Array.isArray(costLayers) || costLayers.length === 0) {
        res.status(400).json({ 
          error: 'Cost layers array is required and must not be empty' 
        });
        return;
      }

      const accountingService = new AccountingService({ tenantId });
      const results = [];
      const errors = [];

      for (const layerData of costLayers) {
        try {
          const validatedData = createCostLayerSchema.parse(layerData);
          
          const costLayer = await accountingService.recordInventoryPurchase({
            inventoryItemId: validatedData.inventoryItemId,
            quantity: validatedData.quantity,
            unitCost: validatedData.unitCost,
            purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : new Date(),
            reference: validatedData.reference || `BULK-LAYER-${Date.now()}-${results.length}`
          });

          results.push({
            success: true,
            costLayer,
            originalData: layerData
          });

        } catch (error) {
          errors.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            originalData: layerData
          });
        }
      }

      res.json({
        success: errors.length === 0,
        message: `Processed ${costLayers.length} cost layers`,
        results,
        errors,
        summary: {
          total: costLayers.length,
          successful: results.length,
          failed: errors.length
        }
      });

    } catch (error) {
      console.error('Bulk create cost layers error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to bulk create cost layers' 
      });
    }
  }
}