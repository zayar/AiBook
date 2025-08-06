import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../accounting/AccountingService';

const prisma = new PrismaClient();

// Validation schemas
const inventoryReturnSchema = z.object({
  originalInvoiceItemId: z.string().min(1, 'Original invoice item ID is required'),
  returnQuantity: z.number().positive('Return quantity must be positive'),
  returnDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

const costLayerQuerySchema = z.object({
  inventoryItemId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  isFullyConsumed: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
});

const cogsReportSchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  inventoryItemId: z.string().optional(),
  groupBy: z.enum(['item', 'category', 'month', 'day']).optional(),
  includeDetails: z.boolean().default(false)
});

/**
 * 🏭 COST OF GOODS SOLD (COGS) CONTROLLER
 * 
 * Provides API endpoints for COGS operations, reporting, and cost layer management.
 * Integrates with the ALE accounting framework for proper financial reporting.
 */
export class COGSController {

  /**
   * 📊 GET INVENTORY COST SUMMARY
   * Returns cost layer summary for an inventory item
   */
  static async getInventoryCostSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { inventoryItemId } = req.params;
      
      if (!inventoryItemId) {
        res.status(400).json({ error: 'Inventory Item ID is required' });
        return;
      }

      // Verify inventory item exists and belongs to tenant
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { 
          id: inventoryItemId, 
          tenantId 
        },
        include: {
          assetAccount: true,
          cogsAccount: true
        }
      });

      if (!inventoryItem) {
        res.status(404).json({ error: 'Inventory item not found' });
        return;
      }

      const accountingService = new AccountingService({ tenantId });
      const costSummary = await accountingService.getInventoryCostSummary(inventoryItemId);

      res.json({
        inventoryItem: {
          id: inventoryItem.id,
          sku: inventoryItem.sku,
          name: inventoryItem.name,
          description: inventoryItem.description,
          category: inventoryItem.category,
          unitOfMeasure: inventoryItem.unitOfMeasure,
          currentUnitCost: parseFloat(inventoryItem.unitCost.toString()),
          currentUnitPrice: parseFloat(inventoryItem.unitPrice.toString()),
          quantityOnHand: parseFloat(inventoryItem.quantityOnHand.toString()),
          assetAccount: inventoryItem.assetAccount,
          cogsAccount: inventoryItem.cogsAccount
        },
        costSummary: {
          ...costSummary,
          costLayers: costSummary.costLayers.map(layer => ({
            ...layer,
            unitCost: parseFloat(layer.unitCost.toString()),
            originalQuantity: parseFloat(layer.originalQuantity.toString()),
            remainingQuantity: parseFloat(layer.remainingQuantity.toString())
          }))
        }
      });

    } catch (error) {
      console.error('Error getting inventory cost summary:', error);
      res.status(500).json({ error: 'Failed to get inventory cost summary' });
    }
  }

  /**
   * 📋 GET COGS CALCULATIONS
   * Returns COGS calculations with optional filtering
   */
  static async getCOGSCalculations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { 
        inventoryItemId, 
        fromDate, 
        toDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = { tenantId };
      
      if (inventoryItemId) {
        where.inventoryItemId = inventoryItemId as string;
      }
      
      if (fromDate || toDate) {
        where.calculationDate = {};
        if (fromDate) where.calculationDate.gte = new Date(fromDate as string);
        if (toDate) where.calculationDate.lte = new Date(toDate as string);
      }

      // Get COGS calculations with relations
      const [calculations, total] = await Promise.all([
        prisma.cOGSCalculation.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { calculationDate: 'desc' },
          include: {
            invoiceItem: {
              include: {
                invoice: {
                  select: {
                    invoiceNumber: true,
                    issueDate: true,
                    customerId: true
                  }
                }
              }
            },
            inventoryItem: {
              select: {
                sku: true,
                name: true,
                category: true
              }
            },
            layerConsumptions: {
              include: {
                costLayer: {
                  select: {
                    purchaseDate: true,
                    unitCost: true,
                    originalQuantity: true
                  }
                }
              }
            }
          }
        }),
        prisma.cOGSCalculation.count({ where })
      ]);

      // Calculate summary statistics
      const summary = await prisma.cOGSCalculation.aggregate({
        where,
        _sum: {
          totalCOGS: true,
          quantitySold: true
        },
        _avg: {
          averageCostPerUnit: true
        },
        _count: {
          id: true
        }
      });

      res.json({
        calculations: calculations.map(calc => ({
          id: calc.id,
          invoiceItemId: calc.invoiceItemId,
          inventoryItemId: calc.inventoryItemId,
          quantitySold: parseFloat(calc.quantitySold.toString()),
          totalCOGS: parseFloat(calc.totalCOGS.toString()),
          averageCostPerUnit: parseFloat(calc.averageCostPerUnit.toString()),
          calculationDate: calc.calculationDate,
          journalEntryId: calc.journalEntryId,
          invoiceItem: calc.invoiceItem,
          inventoryItem: calc.inventoryItem,
          layerConsumptions: calc.layerConsumptions.map(consumption => ({
            id: consumption.id,
            costLayerId: consumption.costLayerId,
            quantityConsumed: parseFloat(consumption.quantityConsumed.toString()),
            unitCost: parseFloat(consumption.unitCost.toString()),
            totalCost: parseFloat(consumption.totalCost.toString()),
            costLayer: consumption.costLayer
          }))
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        summary: {
          totalCalculations: summary._count.id || 0,
          totalCOGS: parseFloat(summary._sum.totalCOGS?.toString() || '0'),
          totalQuantitySold: parseFloat(summary._sum.quantitySold?.toString() || '0'),
          averageCostPerUnit: parseFloat(summary._avg.averageCostPerUnit?.toString() || '0')
        }
      });

    } catch (error) {
      console.error('Error getting COGS calculations:', error);
      res.status(500).json({ error: 'Failed to get COGS calculations' });
    }
  }

  /**
   * 📦 GET COST LAYERS
   * Returns inventory cost layers with filtering
   */
  static async getCostLayers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validation = costLayerQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: validation.error.issues 
        });
        return;
      }

      const { 
        inventoryItemId, 
        fromDate, 
        toDate, 
        isFullyConsumed,
        page = 1, 
        limit = 20 
      } = validation.data;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { tenantId };
      
      if (inventoryItemId) {
        where.inventoryItemId = inventoryItemId;
      }
      
      if (fromDate || toDate) {
        where.purchaseDate = {};
        if (fromDate) where.purchaseDate.gte = new Date(fromDate);
        if (toDate) where.purchaseDate.lte = new Date(toDate);
      }

      if (isFullyConsumed !== undefined) {
        where.isFullyConsumed = isFullyConsumed;
      }

      // Get cost layers with relations
      const [costLayers, total] = await Promise.all([
        prisma.inventoryCostLayer.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { purchaseDate: 'asc' },
            { createdAt: 'asc' }
          ],
          include: {
            inventoryItem: {
              select: {
                sku: true,
                name: true,
                category: true
              }
            },
            billItem: {
              include: {
                bill: {
                  select: {
                    billNumber: true,
                    billDate: true,
                    vendorId: true
                  }
                }
              }
            },
            consumptions: {
              include: {
                cogsCalculation: {
                  include: {
                    invoiceItem: {
                      include: {
                        invoice: {
                          select: {
                            invoiceNumber: true,
                            issueDate: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }),
        prisma.inventoryCostLayer.count({ where })
      ]);

      // Calculate summary statistics
      const summary = await prisma.inventoryCostLayer.aggregate({
        where,
        _sum: {
          originalQuantity: true,
          remainingQuantity: true
        },
        _count: {
          id: true
        }
      });

      res.json({
        costLayers: costLayers.map(layer => ({
          id: layer.id,
          inventoryItemId: layer.inventoryItemId,
          purchaseDate: layer.purchaseDate,
          unitCost: parseFloat(layer.unitCost.toString()),
          originalQuantity: parseFloat(layer.originalQuantity.toString()),
          remainingQuantity: parseFloat(layer.remainingQuantity.toString()),
          isFullyConsumed: layer.isFullyConsumed,
          reference: layer.reference,
          billItemId: layer.billItemId,
          inventoryItem: layer.inventoryItem,
          billItem: layer.billItem,
          consumptions: layer.consumptions.map(consumption => ({
            id: consumption.id,
            quantityConsumed: parseFloat(consumption.quantityConsumed.toString()),
            unitCost: parseFloat(consumption.unitCost.toString()),
            totalCost: parseFloat(consumption.totalCost.toString()),
            cogsCalculation: consumption.cogsCalculation
          })),
          totalValue: parseFloat(layer.remainingQuantity.toString()) * parseFloat(layer.unitCost.toString())
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalLayers: summary._count.id || 0,
          totalOriginalQuantity: parseFloat(summary._sum.originalQuantity?.toString() || '0'),
          totalRemainingQuantity: parseFloat(summary._sum.remainingQuantity?.toString() || '0'),
          utilizationRate: summary._sum.originalQuantity 
            ? ((parseFloat(summary._sum.originalQuantity.toString()) - parseFloat(summary._sum.remainingQuantity?.toString() || '0')) / parseFloat(summary._sum.originalQuantity.toString())) * 100
            : 0
        }
      });

    } catch (error) {
      console.error('Error getting cost layers:', error);
      res.status(500).json({ error: 'Failed to get cost layers' });
    }
  }

  /**
   * 🔄 PROCESS INVENTORY RETURN
   * Handles inventory returns and reverses COGS calculations
   */
  static async processInventoryReturn(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validation = inventoryReturnSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: validation.error.issues 
        });
        return;
      }

      const { 
        originalInvoiceItemId, 
        returnQuantity, 
        returnDate, 
        reference,
        notes 
      } = validation.data;

      // Verify the original invoice item exists and has COGS calculation
      const originalInvoiceItem = await prisma.invoiceItem.findFirst({
        where: { 
          id: originalInvoiceItemId,
          tenantId 
        },
        include: {
          invoice: true,
          inventoryItem: true,
          cogsCalculation: true
        }
      });

      if (!originalInvoiceItem) {
        res.status(404).json({ error: 'Original invoice item not found' });
        return;
      }

      if (!originalInvoiceItem.inventoryItemId) {
        res.status(400).json({ error: 'Invoice item is not linked to inventory' });
        return;
      }

      if (!originalInvoiceItem.cogsCalculation) {
        res.status(400).json({ error: 'No COGS calculation found for this invoice item' });
        return;
      }

      // Validate return quantity
      const originalQuantity = parseFloat(originalInvoiceItem.quantity.toString());
      if (returnQuantity > originalQuantity) {
        res.status(400).json({ 
          error: 'Return quantity cannot exceed original quantity',
          originalQuantity,
          returnQuantity 
        });
        return;
      }

      const accountingService = new AccountingService({ tenantId });
      
      await accountingService.handleInventoryReturn({
        originalInvoiceItemId,
        returnQuantity,
        returnDate: returnDate ? new Date(returnDate) : new Date(),
        reference: reference || `RETURN-${originalInvoiceItem.invoice.invoiceNumber}-${Date.now()}`
      });

      // Get updated inventory item information
      const updatedInventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: originalInvoiceItem.inventoryItemId },
        include: {
          costLayers: {
            where: { isFullyConsumed: false },
            orderBy: { purchaseDate: 'asc' }
          }
        }
      });

      console.log(`✅ Inventory return processed: ${returnQuantity} units returned for invoice ${originalInvoiceItem.invoice.invoiceNumber}`);

      res.json({
        message: 'Inventory return processed successfully',
        return: {
          originalInvoiceItemId,
          originalInvoiceNumber: originalInvoiceItem.invoice.invoiceNumber,
          inventoryItemId: originalInvoiceItem.inventoryItemId,
          inventoryItemName: originalInvoiceItem.inventoryItem?.name,
          returnQuantity,
          returnDate: returnDate || new Date().toISOString(),
          reference,
          notes
        },
        updatedInventory: {
          id: updatedInventoryItem?.id,
          sku: updatedInventoryItem?.sku,
          name: updatedInventoryItem?.name,
          quantityOnHand: parseFloat(updatedInventoryItem?.quantityOnHand.toString() || '0'),
          availableCostLayers: updatedInventoryItem?.costLayers.length || 0
        }
      });

    } catch (error) {
      console.error('Error processing inventory return:', error);
      res.status(500).json({ 
        error: 'Failed to process inventory return',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 GENERATE COGS REPORT
   * Generates comprehensive COGS reports with various grouping options
   */
  static async generateCOGSReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validation = cogsReportSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: validation.error.issues 
        });
        return;
      }

      const { 
        fromDate, 
        toDate, 
        inventoryItemId, 
        groupBy = 'item',
        includeDetails = false 
      } = validation.data;

      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      // Build where clause
      const where: any = {
        tenantId,
        calculationDate: {
          gte: startDate,
          lte: endDate
        }
      };

      if (inventoryItemId) {
        where.inventoryItemId = inventoryItemId;
      }

      // Get COGS calculations for the period
      const calculations = await prisma.cOGSCalculation.findMany({
        where,
        include: {
          inventoryItem: {
            select: {
              sku: true,
              name: true,
              category: true
            }
          },
          invoiceItem: {
            include: {
              invoice: {
                select: {
                  invoiceNumber: true,
                  issueDate: true,
                  customerId: true
                }
              }
            }
          },
          layerConsumptions: {
            include: {
              costLayer: {
                select: {
                  purchaseDate: true,
                  unitCost: true
                }
              }
            }
          }
        },
        orderBy: { calculationDate: 'asc' }
      });

      // Group data based on groupBy parameter
      const groupedData = new Map();

      for (const calc of calculations) {
        let groupKey: string;
        
        switch (groupBy) {
          case 'category':
            groupKey = calc.inventoryItem.category || 'Uncategorized';
            break;
          case 'month':
            groupKey = calc.calculationDate.toISOString().substring(0, 7); // YYYY-MM
            break;
          case 'day':
            groupKey = calc.calculationDate.toISOString().substring(0, 10); // YYYY-MM-DD
            break;
          default: // 'item'
            groupKey = `${calc.inventoryItem.sku} - ${calc.inventoryItem.name}`;
        }

        if (!groupedData.has(groupKey)) {
          groupedData.set(groupKey, {
            groupKey,
            totalCOGS: 0,
            totalQuantitySold: 0,
            averageCostPerUnit: 0,
            calculationCount: 0,
            calculations: includeDetails ? [] : undefined
          });
        }

        const group = groupedData.get(groupKey);
        group.totalCOGS += parseFloat(calc.totalCOGS.toString());
        group.totalQuantitySold += parseFloat(calc.quantitySold.toString());
        group.calculationCount += 1;

        if (includeDetails) {
          group.calculations.push({
            id: calc.id,
            calculationDate: calc.calculationDate,
            quantitySold: parseFloat(calc.quantitySold.toString()),
            totalCOGS: parseFloat(calc.totalCOGS.toString()),
            averageCostPerUnit: parseFloat(calc.averageCostPerUnit.toString()),
            invoiceNumber: calc.invoiceItem.invoice.invoiceNumber,
            layerConsumptions: calc.layerConsumptions?.map(consumption => ({
              quantityConsumed: parseFloat(consumption.quantityConsumed.toString()),
              unitCost: parseFloat(consumption.unitCost.toString()),
              totalCost: parseFloat(consumption.totalCost.toString()),
              purchaseDate: consumption.costLayer.purchaseDate
            }))
          });
        }
      }

      // Calculate averages and convert to array
      const reportData = Array.from(groupedData.values()).map(group => ({
        ...group,
        averageCostPerUnit: group.totalQuantitySold > 0 
          ? group.totalCOGS / group.totalQuantitySold 
          : 0
      }));

      // Sort by total COGS descending
      reportData.sort((a, b) => b.totalCOGS - a.totalCOGS);

      // Calculate overall totals
      const overallTotals = {
        totalCOGS: reportData.reduce((sum, group) => sum + group.totalCOGS, 0),
        totalQuantitySold: reportData.reduce((sum, group) => sum + group.totalQuantitySold, 0),
        totalCalculations: reportData.reduce((sum, group) => sum + group.calculationCount, 0),
        averageCostPerUnit: 0
      };

      overallTotals.averageCostPerUnit = overallTotals.totalQuantitySold > 0 
        ? overallTotals.totalCOGS / overallTotals.totalQuantitySold 
        : 0;

      res.json({
        reportMetadata: {
          fromDate: startDate.toISOString(),
          toDate: endDate.toISOString(),
          inventoryItemId,
          groupBy,
          includeDetails,
          generatedAt: new Date().toISOString()
        },
        overallTotals,
        groupedData: reportData
      });

    } catch (error) {
      console.error('Error generating COGS report:', error);
      res.status(500).json({ error: 'Failed to generate COGS report' });
    }
  }

  /**
   * 🔍 GET COGS CALCULATION DETAILS
   * Returns detailed information about a specific COGS calculation
   */
  static async getCOGSCalculationDetails(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;

      const calculation = await prisma.cOGSCalculation.findFirst({
        where: { 
          id, 
          tenantId 
        },
        include: {
          invoiceItem: {
            include: {
              invoice: {
                include: {
                  customer: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          inventoryItem: {
            include: {
              assetAccount: true,
              cogsAccount: true
            }
          },
          layerConsumptions: {
            include: {
              costLayer: {
                include: {
                  billItem: {
                    include: {
                      bill: {
                        include: {
                          vendor: {
                            select: {
                              id: true,
                              name: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: {
              costLayer: {
                purchaseDate: 'asc'
              }
            }
          }
        }
      });

      if (!calculation) {
        res.status(404).json({ error: 'COGS calculation not found' });
        return;
      }

      res.json({
        calculation: {
          id: calculation.id,
          invoiceItemId: calculation.invoiceItemId,
          inventoryItemId: calculation.inventoryItemId,
          quantitySold: parseFloat(calculation.quantitySold.toString()),
          totalCOGS: parseFloat(calculation.totalCOGS.toString()),
          averageCostPerUnit: parseFloat(calculation.averageCostPerUnit.toString()),
          calculationDate: calculation.calculationDate,
          journalEntryId: calculation.journalEntryId
        },
        invoiceItem: {
          id: calculation.invoiceItem.id,
          description: calculation.invoiceItem.description,
          quantity: parseFloat(calculation.invoiceItem.quantity.toString()),
          unitPrice: parseFloat(calculation.invoiceItem.unitPrice.toString()),
          totalPrice: parseFloat(calculation.invoiceItem.totalPrice.toString()),
          invoice: {
            invoiceNumber: calculation.invoiceItem.invoice.invoiceNumber,
            issueDate: calculation.invoiceItem.invoice.issueDate,
            totalAmount: parseFloat(calculation.invoiceItem.invoice.totalAmount.toString()),
            customer: calculation.invoiceItem.invoice.customer
          }
        },
        inventoryItem: {
          id: calculation.inventoryItem.id,
          sku: calculation.inventoryItem.sku,
          name: calculation.inventoryItem.name,
          description: calculation.inventoryItem.description,
          category: calculation.inventoryItem.category,
          assetAccount: calculation.inventoryItem.assetAccount,
          cogsAccount: calculation.inventoryItem.cogsAccount
        },
        layerConsumptions: calculation.layerConsumptions.map(consumption => ({
          id: consumption.id,
          quantityConsumed: parseFloat(consumption.quantityConsumed.toString()),
          unitCost: parseFloat(consumption.unitCost.toString()),
          totalCost: parseFloat(consumption.totalCost.toString()),
          costLayer: {
            id: consumption.costLayer?.id,
            purchaseDate: consumption.costLayer?.purchaseDate,
            unitCost: parseFloat(consumption.costLayer?.unitCost?.toString() || '0'),
            originalQuantity: parseFloat(consumption.costLayer?.originalQuantity?.toString() || '0'),
            remainingQuantity: parseFloat(consumption.costLayer?.remainingQuantity?.toString() || '0'),
            reference: consumption.costLayer?.reference,
            billItem: consumption.costLayer?.billItem ? {
              id: consumption.costLayer.billItem.id,
              description: consumption.costLayer.billItem.description,
              bill: {
                billNumber: consumption.costLayer.billItem.bill.billNumber,
                billDate: consumption.costLayer.billItem.bill.billDate,
                vendor: consumption.costLayer.billItem.bill.vendor
              }
            } : null
          }
        }))
      });

    } catch (error) {
      console.error('Error getting COGS calculation details:', error);
      res.status(500).json({ error: 'Failed to get COGS calculation details' });
    }
  }
}