import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, BillStatus, EntryType } from '@prisma/client';
import prismaWithTenant from '../utils/prismaWithTenant';
import { AccountingService } from '../accounting/AccountingService';

// Helper function to handle null, empty strings, and undefined for optional string fields
const optionalString = () => z.union([
  z.string().min(1),
  z.literal(''),
  z.null(),
  z.undefined()
]).transform(val => val === '' || val === null ? undefined : val).optional();

// Helper function for required decimal fields
const requiredDecimal = () => z.union([
  z.number(),
  z.string().transform(val => parseFloat(val))
]).refine(val => !isNaN(val) && val >= 0, { message: 'Must be a valid positive number' });

// Validation schemas
const billItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: requiredDecimal(),
  unitPrice: requiredDecimal(),
  taxRate: z.number().default(0),
  accountCode: optionalString(),
  inventoryItemId: optionalString(), // For inventory items that need COGS tracking
});

const billSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  billDate: z.string().transform(val => new Date(val)),
  dueDate: z.string().transform(val => new Date(val)),
  billNumber: optionalString(),
  currency: z.string().default('MMK'),
  exchangeRate: z.number().default(1),
  notes: optionalString(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
});

export class BillController {
  /**
   * 📋 GET ALL BILLS
   */
  static async getAllBills(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const prisma = prismaWithTenant;
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const vendorId = req.query.vendorId as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        tenantId,
      };

      if (search) {
        where.OR = [
          { billNumber: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (status && Object.values(BillStatus).includes(status as BillStatus)) {
        where.status = status;
      }

      if (vendorId) {
        where.vendorId = vendorId;
      }

      // Get bills with related data
      const [bills, total] = await Promise.all([
        prisma.bill.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                displayName: true,
                email: true,
                phone: true,
              }
            },
            items: true,
            payments: true,
            _count: {
              select: {
                items: true,
                payments: true,
              }
            }
          }
        }),
        prisma.bill.count({ where })
      ]);

      // Calculate derived fields
      const billsWithDetails = bills.map(bill => ({
        ...bill,
        remainingAmount: Number(bill.totalAmount) - Number(bill.paidAmount),
        isOverdue: bill.status !== 'PAID' && new Date() > bill.dueDate,
        daysOverdue: bill.status !== 'PAID' && new Date() > bill.dueDate 
          ? Math.floor((new Date().getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      }));

      res.json({
        bills: billsWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      });
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  }

  /**
   * 🔍 GET SINGLE BILL
   */
  static async getBillById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const prisma = prismaWithTenant;

      const bill = await prisma.bill.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              displayName: true,
              email: true,
              phone: true,
              paymentTerms: true,
              currency: true,
            }
          },
          items: {
            orderBy: { createdAt: 'asc' }
          },
          payments: {
            orderBy: { paymentDate: 'desc' }
          },
        }
      });

      if (!bill) {
        res.status(404).json({ error: 'Bill not found' });
        return;
      }

      // Calculate derived fields
      const billWithDetails = {
        ...bill,
        remainingAmount: Number(bill.totalAmount) - Number(bill.paidAmount),
        isOverdue: bill.status !== 'PAID' && new Date() > bill.dueDate,
        daysOverdue: bill.status !== 'PAID' && new Date() > bill.dueDate 
          ? Math.floor((new Date().getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      };

      res.json({ bill: billWithDetails });
    } catch (error) {
      console.error('Error fetching bill:', error);
      res.status(500).json({ error: 'Failed to fetch bill' });
    }
  }

  /**
   * 📝 CREATE NEW BILL
   * Implements proper ALE double-entry accounting
   */
  static async createBill(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Validate input
      const validationResult = billSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.issues
        });
        return;
      }

      const data = validationResult.data;
      const prisma = prismaWithTenant;

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Generate bill number if not provided
        let billNumber = data.billNumber;
        if (!billNumber) {
          const count = await tx.bill.count({
            where: { tenantId }
          });
          billNumber = `BILL-${String(count + 1).padStart(4, '0')}`;
        }

        // Check if bill number already exists
        const existingBill = await tx.bill.findFirst({
          where: {
            billNumber,
            tenantId
          }
        });

        if (existingBill) {
          throw new Error('Bill number already exists');
        }

        // Calculate totals
        let subtotal = 0;
        let taxAmount = 0;

        const calculatedItems = data.items.map(item => {
          const totalPrice = item.quantity * item.unitPrice;
          const itemTax = totalPrice * (item.taxRate / 100);
          
          subtotal += totalPrice;
          taxAmount += itemTax;

          return {
            ...item,
            totalPrice,
            tenantId
          };
        });

        const totalAmount = subtotal + taxAmount;

        // Create the bill
        const bill = await tx.bill.create({
          data: {
            billNumber,
            vendorId: data.vendorId,
            billDate: data.billDate,
            dueDate: data.dueDate,
            subtotal,
            taxAmount,
            totalAmount,
            currency: data.currency,
            exchangeRate: data.exchangeRate,
            notes: data.notes,
            tenantId,
            status: 'PENDING'
          }
        });

        // Create bill items individually to handle inventory items and COGS tracking
        const billItems = [];
        const accountingService = new AccountingService({ tenantId });

        for (const item of calculatedItems) {
          // Auto-link inventory item if not provided but description matches
          let inventoryItemId = item.inventoryItemId;
          if (!inventoryItemId && item.description) {
            const matchingInventoryItem = await tx.inventoryItem.findFirst({
              where: {
                tenantId,
                OR: [
                  { name: { equals: item.description } },
                  { name: { contains: item.description } },
                  { sku: { equals: item.description } },
                  { sku: { contains: item.description } }
                ]
              }
            });
            
            if (matchingInventoryItem) {
              inventoryItemId = matchingInventoryItem.id;
              console.log(`🔗 Auto-linked bill item "${item.description}" to inventory item: ${matchingInventoryItem.name} (${matchingInventoryItem.sku})`);
            }
          }

          // Create bill item
          const billItem = await tx.billItem.create({
            data: {
              billId: bill.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              taxRate: item.taxRate,
              accountCode: item.accountCode || '6000', // Default to Office Expenses
              inventoryItemId: inventoryItemId,
              tenantId
            }
          });

          billItems.push(billItem);

          // If this is an inventory item, create cost layer for FIFO tracking
          if (inventoryItemId) {
            try {
              console.log(`🔄 Creating cost layer for inventory item: ${inventoryItemId}`);
              
              await accountingService.recordInventoryPurchase({
                inventoryItemId: inventoryItemId,
                quantity: item.quantity,
                unitCost: item.unitPrice,
                purchaseDate: bill.billDate,
                billItemId: billItem.id,
                reference: `BILL-${bill.billNumber}-${billItem.id}`
              });

              console.log(`✅ Cost layer created for ${item.quantity} units at $${item.unitPrice} each`);
            } catch (error) {
              console.error(`❌ Error creating cost layer for item ${inventoryItemId}:`, error);
              // Don't fail the entire transaction, but log the error
              // In production, you might want to handle this differently
            }
          }
        }

        // Create journal entries for double-entry accounting
        await BillController.createJournalEntries(tx, bill, billItems, tenantId);

        // Fetch the complete bill with relations
        const completeBill = await tx.bill.findUnique({
          where: { id: bill.id },
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                displayName: true,
                email: true,
                phone: true,
              }
            },
            items: true,
          }
        });

        return completeBill;
      }, {
        timeout: 15000, // 15 seconds timeout instead of 5 seconds
      });

      res.status(201).json({
        bill: result,
        message: 'Bill created successfully'
      });
    } catch (error) {
      console.error('Error creating bill:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create bill'
      });
    }
  }

  /**
   * 🔢 CREATE JOURNAL ENTRIES FOR BILL
   * Implements proper ALE double-entry accounting
   * 
   * For Bills (Accounts Payable):
   * Dr. Expense/Asset Account(s) [from line items]
   * Cr. Accounts Payable [total amount]
   */
  private static async createJournalEntries(
    tx: any,
    bill: any,
    billItems: any[],
    tenantId: string
  ): Promise<void> {
    try {
      // Get required accounts in a single batch query
      const requiredAccountCodes = ['2000', '1103', '6000', ...billItems.map(item => item.accountCode).filter(Boolean)];
      const uniqueAccountCodes = [...new Set(requiredAccountCodes)]; // Remove duplicates
      
      const [book, accounts] = await Promise.all([
        tx.book.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' }
        }),
        tx.account.findMany({
          where: { 
            tenantId,
            code: { in: uniqueAccountCodes }
          }
        })
      ]);

      if (!book) {
        throw new Error('No accounting book found for tenant');
      }

      // Create account lookup map
      const accountMap = new Map(accounts.map((acc: any) => [acc.code, acc]));
      
      const accountsPayableAccount = accountMap.get('2000') as any;
      if (!accountsPayableAccount) {
        throw new Error('Accounts Payable account (2000) not found');
      }

      const journalId = `BILL-${bill.billNumber}`;
      const entries = [];

      // Create entries for each bill item
      for (const item of billItems) {
        let expenseAccount = accountMap.get(item.accountCode) || accountMap.get('6000') as any;
        
        if (!expenseAccount) {
          throw new Error(`Expense account (${item.accountCode}) not found for item: ${item.description}`);
        }

        // Debit: Expense/Asset Account (increase expense/asset)
        entries.push({
          accountId: expenseAccount.id,
          bookId: book.id,
          amount: Number(item.totalPrice),
          type: 'DEBIT',
          memo: `Bill ${bill.billNumber}: ${item.description}`,
          reference: bill.billNumber,
          journalId: journalId,
          postedAt: new Date(bill.billDate),
          tenantId
        });
      }

      // Handle tax amount if present
      if (bill.taxAmount > 0) {
        const taxAccount = accountMap.get('1103') as any;
        if (taxAccount) {
          // Debit: Tax Receivable (increase asset - input tax)
          entries.push({
            accountId: taxAccount.id,
            bookId: book.id,
            amount: Number(bill.taxAmount),
            type: 'DEBIT',
            memo: `Bill ${bill.billNumber}: Input Tax`,
            reference: bill.billNumber,
            journalId: journalId,
            postedAt: new Date(bill.billDate),
            tenantId
          });
        }
      }

      // Credit: Accounts Payable (increase liability)
      entries.push({
        accountId: accountsPayableAccount.id,
        bookId: book.id,
        amount: Number(bill.totalAmount),
        type: 'CREDIT',
        memo: `Bill ${bill.billNumber}: Amount due to vendor`,
        reference: bill.billNumber,
        journalId: journalId,
        postedAt: new Date(bill.billDate),
        tenantId
      });

      // Create all entries in batch
      await tx.entry.createMany({
        data: entries
      });

      console.log(`✅ Journal entries created for Bill ${bill.billNumber}`);
    } catch (error) {
      console.error('Error creating journal entries for bill:', error);
      throw error;
    }
  }

  /**
   * ✏️ UPDATE BILL
   */
  static async updateBill(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Check if bill exists and is editable
      const existingBill = await prismaWithTenant.bill.findFirst({
        where: { id, tenantId },
        include: { payments: true }
      });

      if (!existingBill) {
        res.status(404).json({ error: 'Bill not found' });
        return;
      }

      if (existingBill.status === 'PAID') {
        res.status(400).json({ error: 'Cannot update a paid bill' });
        return;
      }

      if (existingBill.payments.length > 0) {
        res.status(400).json({ error: 'Cannot update a bill that has payments' });
        return;
      }

      // Validate input
      const validationResult = billSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.issues
        });
        return;
      }

      const data = validationResult.data;
      const prisma = prismaWithTenant;

      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        // Calculate new totals
        let subtotal = 0;
        let taxAmount = 0;

        const calculatedItems = data.items.map(item => {
          const totalPrice = item.quantity * item.unitPrice;
          const itemTax = totalPrice * (item.taxRate / 100);
          
          subtotal += totalPrice;
          taxAmount += itemTax;

          return {
            ...item,
            totalPrice,
            tenantId
          };
        });

        const totalAmount = subtotal + taxAmount;

        // Update the bill
        const updatedBill = await tx.bill.update({
          where: { id },
          data: {
            billDate: data.billDate,
            dueDate: data.dueDate,
            subtotal,
            taxAmount,
            totalAmount,
            currency: data.currency,
            exchangeRate: data.exchangeRate,
            notes: data.notes,
          }
        });

        // Delete existing items
        await tx.billItem.deleteMany({
          where: { billId: id, tenantId }
        });

        // Create new bill items
        const billItems = await Promise.all(
          calculatedItems.map(item =>
            tx.billItem.create({
              data: {
                billId: id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                taxRate: item.taxRate,
                accountCode: item.accountCode || '6000',
                tenantId
              }
            })
          )
        );

        // Delete old journal entries
        await tx.entry.deleteMany({
          where: {
            reference: existingBill.billNumber,
            tenantId
          }
        });

        // Create new journal entries
        await BillController.createJournalEntries(tx, updatedBill, billItems, tenantId);

        // Fetch the complete updated bill
        const completeBill = await tx.bill.findUnique({
          where: { id },
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                displayName: true,
                email: true,
                phone: true,
              }
            },
            items: true,
          }
        });

        return completeBill;
      });

      res.json({
        bill: result,
        message: 'Bill updated successfully'
      });
    } catch (error) {
      console.error('Error updating bill:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update bill'
      });
    }
  }

  /**
   * 🗑️ DELETE BILL
   */
  static async deleteBill(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Check if bill exists and can be deleted
      const existingBill = await prismaWithTenant.bill.findFirst({
        where: { id, tenantId },
        include: { payments: true }
      });

      if (!existingBill) {
        res.status(404).json({ error: 'Bill not found' });
        return;
      }

      if (existingBill.payments.length > 0) {
        res.status(400).json({ error: 'Cannot delete a bill that has payments' });
        return;
      }

      const prisma = prismaWithTenant;

      // Use transaction for atomic deletion
      await prisma.$transaction(async (tx) => {
        // Delete journal entries
        await tx.entry.deleteMany({
          where: {
            reference: existingBill.billNumber,
            tenantId
          }
        });

        // Delete bill items
        await tx.billItem.deleteMany({
          where: { billId: id, tenantId }
        });

        // Delete the bill
        await tx.bill.delete({
          where: { id }
        });
      });

      res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
      console.error('Error deleting bill:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete bill'
      });
    }
  }

  /**
   * 📊 GET BILLS STATISTICS
   */
  static async getBillsStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const prisma = prismaWithTenant;

      const [
        totalBills,
        pendingBills,
        paidBills,
        overdueBills,
        totalAmountStats,
        recentBills
      ] = await Promise.all([
        prisma.bill.count({ where: { tenantId } }),
        prisma.bill.count({ where: { tenantId, status: 'PENDING' } }),
        prisma.bill.count({ where: { tenantId, status: 'PAID' } }),
        prisma.bill.count({ 
          where: { 
            tenantId, 
            status: { not: 'PAID' },
            dueDate: { lt: new Date() }
          } 
        }),
        prisma.bill.aggregate({
          where: { tenantId },
          _sum: { totalAmount: true, paidAmount: true }
        }),
        prisma.bill.findMany({
          where: { tenantId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: {
              select: { name: true, displayName: true }
            }
          }
        })
      ]);

      const totalOutstanding = Number(totalAmountStats._sum.totalAmount || 0) - Number(totalAmountStats._sum.paidAmount || 0);

      res.json({
        totalBills,
        pendingBills,
        paidBills,
        overdueBills,
        totalAmount: totalAmountStats._sum.totalAmount || 0,
        totalPaid: totalAmountStats._sum.paidAmount || 0,
        totalOutstanding,
        recentBills
      });
    } catch (error) {
      console.error('Error fetching bills statistics:', error);
      res.status(500).json({ error: 'Failed to fetch bills statistics' });
    }
  }

  /**
   * 🔢 GENERATE NEXT BILL NUMBER
   */
  static async getNextBillNumber(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const count = await prismaWithTenant.bill.count({
        where: { tenantId }
      });

      const nextNumber = `BILL-${String(count + 1).padStart(4, '0')}`;
      res.json({ billNumber: nextNumber });
    } catch (error) {
      console.error('Error generating bill number:', error);
      res.status(500).json({ error: 'Failed to generate bill number' });
    }
  }
}