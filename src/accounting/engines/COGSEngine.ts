import { PrismaClient } from '@prisma/client';
import { JournalEntryEngine } from './JournalEntryEngine';

const prisma = new PrismaClient();

/**
 * 🏭 COST OF GOODS SOLD (COGS) ENGINE
 * 
 * Implements FIFO (First In, First Out) cost methodology for accurate COGS calculation.
 * Integrates with the ALE accounting framework for proper double-entry bookkeeping.
 * 
 * Key Features:
 * - FIFO cost layer tracking
 * - Automated COGS journal entry creation
 * - Cost layer consumption management
 * - Integration with inventory management
 * - Proper ALE accounting principles
 */

export interface CostLayer {
  id: string;
  inventoryItemId: string;
  purchaseDate: Date;
  unitCost: number;
  originalQuantity: number;
  remainingQuantity: number;
  isFullyConsumed: boolean;
  reference?: string;
  billItemId?: string;
}

export interface COGSCalculationInput {
  invoiceItemId: string;
  inventoryItemId: string;
  quantitySold: number;
  saleDate: Date;
  reference?: string;
  tenantId: string;
}

export interface COGSCalculationResult {
  id: string;
  totalCOGS: number;
  averageCostPerUnit: number;
  layersConsumed: LayerConsumption[];
  journalEntryId?: string;
}

export interface LayerConsumption {
  costLayerId: string;
  quantityConsumed: number;
  unitCost: number;
  totalCost: number;
  layerDate: Date;
}

export interface InventoryPurchaseInput {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  purchaseDate: Date;
  billItemId?: string;
  reference?: string;
  tenantId: string;
}

export class COGSEngine {
  private tenantId: string;
  private journalEngine: JournalEntryEngine;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.journalEngine = new JournalEntryEngine(tenantId);
  }

  /**
   * 📦 RECORD INVENTORY PURCHASE
   * Creates a cost layer for FIFO tracking when inventory is purchased
   */
  async recordInventoryPurchase(input: InventoryPurchaseInput): Promise<CostLayer> {
    try {
      // Validate inventory item exists
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { 
          id: input.inventoryItemId, 
          tenantId: input.tenantId 
        }
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${input.inventoryItemId} not found`);
      }

      // Create cost layer
      const costLayer = await prisma.inventoryCostLayer.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          purchaseDate: input.purchaseDate,
          unitCost: input.unitCost,
          originalQuantity: input.quantity,
          remainingQuantity: input.quantity,
          reference: input.reference,
          billItemId: input.billItemId,
          tenantId: input.tenantId
        }
      });

      // Update inventory item quantity
      await prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: {
          quantityOnHand: {
            increment: input.quantity
          },
          // Update average cost for reference (though FIFO uses actual layers)
          unitCost: input.unitCost
        }
      });

      console.log(`✅ Cost layer created: ${costLayer.id} for ${input.quantity} units at $${input.unitCost} each`);

      return {
        id: costLayer.id,
        inventoryItemId: costLayer.inventoryItemId,
        purchaseDate: costLayer.purchaseDate,
        unitCost: parseFloat(costLayer.unitCost.toString()),
        originalQuantity: parseFloat(costLayer.originalQuantity.toString()),
        remainingQuantity: parseFloat(costLayer.remainingQuantity.toString()),
        isFullyConsumed: costLayer.isFullyConsumed,
        reference: costLayer.reference || undefined,
        billItemId: costLayer.billItemId || undefined
      };

    } catch (error) {
      console.error('❌ Error recording inventory purchase:', error);
      throw error;
    }
  }

  /**
   * 🧮 CALCULATE COGS WITH FIFO
   * Calculates COGS using FIFO methodology and creates journal entries
   */
  async calculateCOGS(input: COGSCalculationInput): Promise<COGSCalculationResult> {
    try {
      console.log(`🔄 Calculating COGS for ${input.quantitySold} units of item ${input.inventoryItemId}`);

      // Get available cost layers (FIFO order - oldest first)
      const availableLayers = await this.getAvailableCostLayers(input.inventoryItemId);

      if (availableLayers.length === 0) {
        throw new Error(`No cost layers available for inventory item ${input.inventoryItemId}`);
      }

      // Check if we have enough inventory
      const totalAvailable = availableLayers.reduce((sum, layer) => sum + layer.remainingQuantity, 0);
      if (totalAvailable < input.quantitySold) {
        throw new Error(`Insufficient inventory. Available: ${totalAvailable}, Requested: ${input.quantitySold}`);
      }

      // Calculate COGS using FIFO
      const layersConsumed: LayerConsumption[] = [];
      let remainingToSell = input.quantitySold;
      let totalCOGS = 0;

      for (const layer of availableLayers) {
        if (remainingToSell <= 0) break;

        const quantityFromThisLayer = Math.min(remainingToSell, layer.remainingQuantity);
        const costFromThisLayer = quantityFromThisLayer * layer.unitCost;

        layersConsumed.push({
          costLayerId: layer.id,
          quantityConsumed: quantityFromThisLayer,
          unitCost: layer.unitCost,
          totalCost: costFromThisLayer,
          layerDate: layer.purchaseDate
        });

        totalCOGS += costFromThisLayer;
        remainingToSell -= quantityFromThisLayer;
      }

      const averageCostPerUnit = totalCOGS / input.quantitySold;

      // Create COGS calculation record
      const cogsCalculation = await prisma.$transaction(async (tx) => {
        // Create the COGS calculation
        const calculation = await tx.cOGSCalculation.create({
          data: {
            invoiceItemId: input.invoiceItemId,
            inventoryItemId: input.inventoryItemId,
            quantitySold: input.quantitySold,
            totalCOGS: totalCOGS,
            averageCostPerUnit: averageCostPerUnit,
            calculationDate: input.saleDate,
            tenantId: input.tenantId
          }
        });

        // Record layer consumptions and update remaining quantities
        for (const consumption of layersConsumed) {
          await tx.cOGSLayerConsumption.create({
            data: {
              cogsCalculationId: calculation.id,
              costLayerId: consumption.costLayerId,
              quantityConsumed: consumption.quantityConsumed,
              unitCost: consumption.unitCost,
              totalCost: consumption.totalCost,
              tenantId: input.tenantId
            }
          });

          // Update cost layer remaining quantity
          const layer = availableLayers.find(l => l.id === consumption.costLayerId)!;
          const newRemainingQuantity = layer.remainingQuantity - consumption.quantityConsumed;
          
          await tx.inventoryCostLayer.update({
            where: { id: consumption.costLayerId },
            data: {
              remainingQuantity: newRemainingQuantity,
              isFullyConsumed: newRemainingQuantity <= 0
            }
          });
        }

        // Update inventory item quantity
        await tx.inventoryItem.update({
          where: { id: input.inventoryItemId },
          data: {
            quantityOnHand: {
              decrement: input.quantitySold
            }
          }
        });

        return calculation;
      });

      // Create journal entries for COGS
      const journalEntryId = await this.createCOGSJournalEntry({
        inventoryItemId: input.inventoryItemId,
        totalCOGS: totalCOGS,
        saleDate: input.saleDate,
        reference: input.reference || `COGS-${cogsCalculation.id}`
      });

      // Update COGS calculation with journal entry reference
      await prisma.cOGSCalculation.update({
        where: { id: cogsCalculation.id },
        data: { journalEntryId }
      });

      console.log(`✅ COGS calculated: $${totalCOGS.toFixed(2)} for ${input.quantitySold} units (avg: $${averageCostPerUnit.toFixed(2)}/unit)`);

      return {
        id: cogsCalculation.id,
        totalCOGS,
        averageCostPerUnit,
        layersConsumed,
        journalEntryId
      };

    } catch (error) {
      console.error('❌ Error calculating COGS:', error);
      throw error;
    }
  }

  /**
   * 📊 GET AVAILABLE COST LAYERS
   * Retrieves available inventory cost layers in FIFO order (oldest first)
   */
  private async getAvailableCostLayers(inventoryItemId: string): Promise<CostLayer[]> {
    const layers = await prisma.inventoryCostLayer.findMany({
      where: {
        inventoryItemId,
        tenantId: this.tenantId,
        isFullyConsumed: false,
        remainingQuantity: { gt: 0 }
      },
      orderBy: [
        { purchaseDate: 'asc' },  // FIFO: oldest first
        { createdAt: 'asc' }      // Secondary sort by creation time
      ]
    });

    return layers.map(layer => ({
      id: layer.id,
      inventoryItemId: layer.inventoryItemId,
      purchaseDate: layer.purchaseDate,
      unitCost: parseFloat(layer.unitCost.toString()),
      originalQuantity: parseFloat(layer.originalQuantity.toString()),
      remainingQuantity: parseFloat(layer.remainingQuantity.toString()),
      isFullyConsumed: layer.isFullyConsumed,
      reference: layer.reference || undefined,
      billItemId: layer.billItemId || undefined
    }));
  }

  /**
   * 📝 CREATE COGS JOURNAL ENTRY
   * Creates proper double-entry journal entries for COGS following ALE principles
   * 
   * Journal Entry:
   * DR: Cost of Goods Sold (Expense)
   * CR: Inventory Asset (Asset)
   */
  private async createCOGSJournalEntry(input: {
    inventoryItemId: string;
    totalCOGS: number;
    saleDate: Date;
    reference: string;
  }): Promise<string> {
    try {
      // Get inventory item with account information
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { 
          id: input.inventoryItemId,
          tenantId: this.tenantId 
        },
        include: {
          assetAccount: true,
          cogsAccount: true
        }
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${input.inventoryItemId} not found`);
      }

      // Create journal entry using the ALE engine
      const journalEntry = await this.journalEngine.createJournalEntry({
        description: `COGS for ${inventoryItem.name}`,
        reference: input.reference,
        transactionDate: input.saleDate,
        entries: [
          {
            accountCode: inventoryItem.cogsAccount.code,
            type: 'DEBIT',
            amount: input.totalCOGS,
            description: `Cost of goods sold - ${inventoryItem.name}`
          },
          {
            accountCode: inventoryItem.assetAccount.code,
            type: 'CREDIT', 
            amount: input.totalCOGS,
            description: `Inventory reduction - ${inventoryItem.name}`
          }
        ]
      });

      console.log(`✅ COGS journal entry created: ${journalEntry.id}`);
      return journalEntry.id;

    } catch (error) {
      console.error('❌ Error creating COGS journal entry:', error);
      throw error;
    }
  }

  /**
   * 📈 GET INVENTORY COST SUMMARY
   * Provides summary of cost layers for an inventory item
   */
  async getInventoryCostSummary(inventoryItemId: string): Promise<{
    totalQuantityOnHand: number;
    totalValue: number;
    averageCost: number;
    costLayers: CostLayer[];
    oldestLayerDate: Date | null;
    newestLayerDate: Date | null;
  }> {
    try {
      const costLayers = await this.getAvailableCostLayers(inventoryItemId);
      
      if (costLayers.length === 0) {
        return {
          totalQuantityOnHand: 0,
          totalValue: 0,
          averageCost: 0,
          costLayers: [],
          oldestLayerDate: null,
          newestLayerDate: null
        };
      }

      const totalQuantityOnHand = costLayers.reduce((sum, layer) => sum + layer.remainingQuantity, 0);
      const totalValue = costLayers.reduce((sum, layer) => sum + (layer.remainingQuantity * layer.unitCost), 0);
      const averageCost = totalQuantityOnHand > 0 ? totalValue / totalQuantityOnHand : 0;

      const dates = costLayers.map(layer => layer.purchaseDate);
      const oldestLayerDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const newestLayerDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      return {
        totalQuantityOnHand,
        totalValue,
        averageCost,
        costLayers,
        oldestLayerDate,
        newestLayerDate
      };

    } catch (error) {
      console.error('❌ Error getting inventory cost summary:', error);
      throw error;
    }
  }

  /**
   * 🔄 HANDLE INVENTORY RETURNS
   * Processes inventory returns and adjusts cost layers accordingly
   */
  async handleInventoryReturn(input: {
    originalInvoiceItemId: string;
    returnQuantity: number;
    returnDate: Date;
    reference?: string;
  }): Promise<void> {
    try {
      console.log(`🔄 Processing inventory return for ${input.returnQuantity} units`);

      // Get the original COGS calculation
      const originalCOGS = await prisma.cOGSCalculation.findUnique({
        where: { invoiceItemId: input.originalInvoiceItemId },
        include: {
          layerConsumptions: {
            include: { costLayer: true }
          }
        }
      });

      if (!originalCOGS) {
        throw new Error(`Original COGS calculation not found for invoice item ${input.originalInvoiceItemId}`);
      }

      // Calculate proportional return of each cost layer
      const returnRatio = input.returnQuantity / parseFloat(originalCOGS.quantitySold.toString());
      
      await prisma.$transaction(async (tx) => {
        for (const consumption of originalCOGS.layerConsumptions) {
          const returnQuantityFromLayer = parseFloat(consumption.quantityConsumed.toString()) * returnRatio;
          
          // Restore quantity to the cost layer
          await tx.inventoryCostLayer.update({
            where: { id: consumption.costLayerId },
            data: {
              remainingQuantity: {
                increment: returnQuantityFromLayer
              },
              isFullyConsumed: false
            }
          });
        }

        // Update inventory item quantity
        await tx.inventoryItem.update({
          where: { id: originalCOGS.inventoryItemId },
          data: {
            quantityOnHand: {
              increment: input.returnQuantity
            }
          }
        });
      });

      // Create reversal journal entry
      const returnCOGSAmount = parseFloat(originalCOGS.totalCOGS.toString()) * returnRatio;
      await this.createCOGSReversalJournalEntry({
        inventoryItemId: originalCOGS.inventoryItemId,
        totalCOGS: returnCOGSAmount,
        returnDate: input.returnDate,
        reference: input.reference || `RETURN-${originalCOGS.id}`
      });

      console.log(`✅ Inventory return processed: ${input.returnQuantity} units returned`);

    } catch (error) {
      console.error('❌ Error handling inventory return:', error);
      throw error;
    }
  }

  /**
   * 📝 CREATE COGS REVERSAL JOURNAL ENTRY
   * Creates journal entries to reverse COGS for returned inventory
   */
  private async createCOGSReversalJournalEntry(input: {
    inventoryItemId: string;
    totalCOGS: number;
    returnDate: Date;
    reference: string;
  }): Promise<string> {
    try {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { 
          id: input.inventoryItemId,
          tenantId: this.tenantId 
        },
        include: {
          assetAccount: true,
          cogsAccount: true
        }
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${input.inventoryItemId} not found`);
      }

      // Create reversal journal entry (opposite of COGS entry)
      const journalEntry = await this.journalEngine.createJournalEntry({
        description: `COGS reversal for returned ${inventoryItem.name}`,
        reference: input.reference,
        transactionDate: input.returnDate,
        entries: [
          {
            accountCode: inventoryItem.assetAccount.code,
            type: 'DEBIT',
            amount: input.totalCOGS,
            description: `Inventory restoration - ${inventoryItem.name} return`
          },
          {
            accountCode: inventoryItem.cogsAccount.code,
            type: 'CREDIT',
            amount: input.totalCOGS,
            description: `COGS reversal - ${inventoryItem.name} return`
          }
        ]
      });

      console.log(`✅ COGS reversal journal entry created: ${journalEntry.id}`);
      return journalEntry.id;

    } catch (error) {
      console.error('❌ Error creating COGS reversal journal entry:', error);
      throw error;
    }
  }
}