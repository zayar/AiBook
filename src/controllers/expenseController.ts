import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types are already defined in enhancedTenantMiddleware

// Validation schemas
const CreateExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  taxAmount: z.number().default(0),
  expenseDate: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().transform(val => val === '' ? undefined : val),
  vendorId: z.string().optional().transform(val => val === '' ? undefined : val),
  customerId: z.string().optional().transform(val => val === '' ? undefined : val), 
  taxRateId: z.string().optional().transform(val => val === '' ? undefined : val),
  expenseAccountId: z.string().min(1, 'Expense account is required'),
  paidThroughId: z.string().min(1, 'Payment account is required'),
  currency: z.string().default('MMK'),
  exchangeRate: z.number().default(1),
  billable: z.boolean().default(false),
  branch: z.string().optional().transform(val => val === '' ? undefined : val),
  reference: z.string().optional().transform(val => val === '' ? undefined : val),
  notes: z.string().optional().transform(val => val === '' ? undefined : val),
  receiptFiles: z.array(z.string()).optional(),
});

const UpdateExpenseSchema = CreateExpenseSchema.partial();

const ExpenseListSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
  category: z.string().optional(),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  billable: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  sortBy: z.enum(['expenseDate', 'amount', 'description', 'status', 'createdAt']).optional().default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 💰 LIST ALL EXPENSES WITH ADVANCED FILTERING
 * GET /api/v1/expenses
 * Returns expenses with pagination, search, and filtering
 */
export const listExpenses = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    
    const query = ExpenseListSchema.parse(req.query);
    const { page, limit, search, status, category, vendorId, customerId, startDate, endDate, billable, sortBy, sortOrder } = query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      ...(status && { status }),
      ...(category && { category: { contains: category, mode: 'insensitive' } }),
      ...(vendorId && { vendorId }),
      ...(customerId && { customerId }),
      ...(billable !== undefined && { billable }),
      ...(startDate && endDate && {
        expenseDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { expenseNumber: { contains: search, mode: 'insensitive' } },
        ]
      })
    };

    // Get expenses with relations
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: {
          ...where,
          tenantId
        },
        include: {
          vendor: {
            select: { id: true, name: true, displayName: true }
          },
          customer: {
            select: { id: true, name: true }
          },
          taxRate: {
            select: { id: true, name: true, rate: true, jurisdiction: true }
          },
          expenseAccount: {
            select: { id: true, code: true, name: true, type: true }
          },
          paidThrough: {
            select: { id: true, accountNumber: true, name: true, type: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where: { ...where, tenantId } }),
    ]);

    // Calculate summary statistics
    const stats = await prisma.expense.aggregate({
      where: { tenantId },
      _sum: {
        amount: true,
        taxAmount: true,
        totalAmount: true,
      },
      _count: {
        _all: true,
      },
    });

    // Status breakdown
    const statusBreakdown = await prisma.expense.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    res.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalExpenses: stats._count._all,
        totalAmount: stats._sum.totalAmount || 0,
        totalTax: stats._sum.taxAmount || 0,
        statusBreakdown: statusBreakdown.map(item => ({
          status: item.status,
          count: item._count._all,
          totalAmount: item._sum.totalAmount || 0
        }))
      }
    });
  } catch (error) {
    console.error('Error listing expenses:', error);
    res.status(500).json({ error: 'Failed to list expenses' });
  }
};

/**
 * 📄 GET EXPENSE BY ID WITH FULL DETAILS
 * GET /api/v1/expenses/:id
 * Returns expense with journal entries and full details
 */
export const getExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        vendor: {
          select: { id: true, name: true, displayName: true, email: true, phone: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        },
        taxRate: {
          select: { id: true, name: true, rate: true, jurisdiction: true, taxType: true }
        },
        expenseAccount: {
          select: { id: true, code: true, name: true, type: true, balance: true }
        },
        paidThrough: {
          select: { id: true, accountNumber: true, name: true, type: true }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Get journal entries if expense is approved/paid
    let journalEntries = null;
    if (expense.journalId) {
      journalEntries = await prisma.entry.findMany({
        where: {
          journalId: expense.journalId,
          tenantId
        },
        include: {
          account: {
            select: { id: true, code: true, name: true, type: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
    }

    res.json({
      expense,
      journalEntries,
      doubleEntry: journalEntries ? {
        debits: journalEntries.filter(entry => entry.type === 'DEBIT'),
        credits: journalEntries.filter(entry => entry.type === 'CREDIT'),
        totalDebits: journalEntries
          .filter(entry => entry.type === 'DEBIT')
          .reduce((sum, entry) => sum + Number(entry.amount), 0),
        totalCredits: journalEntries
          .filter(entry => entry.type === 'CREDIT')
          .reduce((sum, entry) => sum + Number(entry.amount), 0)
      } : null
    });
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({ error: 'Failed to get expense' });
  }
};

/**
 * ➕ CREATE NEW EXPENSE WITH DOUBLE ENTRY
 * POST /api/v1/expenses
 * Creates expense with proper journal entries
 */
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    
    const validatedData = CreateExpenseSchema.parse(req.body);

    // Calculate total amount
    const totalAmount = validatedData.amount + validatedData.taxAmount;

    // Generate expense number
    const latestExpense = await prisma.expense.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { expenseNumber: true }
    });

    const expenseNumber = generateExpenseNumber(latestExpense?.expenseNumber);

    // Get default book
    const book = await prisma.book.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    if (!book) {
      return res.status(400).json({ error: 'No accounting book found' });
    }

    // Start transaction for double-entry bookkeeping
    const result = await prisma.$transaction(async (tx) => {
      // Create expense record
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          description: validatedData.description,
          amount: validatedData.amount,
          taxAmount: validatedData.taxAmount,
          totalAmount,
          expenseDate: validatedData.expenseDate ? new Date(validatedData.expenseDate) : new Date(),
          category: validatedData.category,
          subcategory: validatedData.subcategory || null,
          vendorId: validatedData.vendorId || null,
          customerId: validatedData.customerId || null,
          taxRateId: validatedData.taxRateId || null,
          expenseAccountId: validatedData.expenseAccountId,
          paidThroughId: validatedData.paidThroughId,
          currency: validatedData.currency,
          exchangeRate: validatedData.exchangeRate,
          billable: validatedData.billable,
          branch: validatedData.branch || null,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
          receiptFiles: validatedData.receiptFiles,
          status: 'PENDING',
          tenantId,
          userId: req.user?.uid || 'system',
        },
        include: {
          vendor: { select: { id: true, name: true, displayName: true } },
          customer: { select: { id: true, name: true } },
          taxRate: { select: { id: true, name: true, rate: true } },
          expenseAccount: { select: { id: true, code: true, name: true, type: true } },
          paidThrough: { select: { id: true, accountNumber: true, name: true, type: true } }
        }
      });

      return expense;
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense: result
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

/**
 * ✏️ UPDATE EXPENSE
 * PUT /api/v1/expenses/:id
 * Updates expense with validation
 */
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;
    
    const validatedData = UpdateExpenseSchema.parse(req.body);

    // Check if expense exists and is editable
    const existingExpense = await prisma.expense.findFirst({
      where: { id, tenantId }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (existingExpense.status === 'APPROVED' || existingExpense.status === 'REIMBURSED') {
      return res.status(400).json({ error: 'Cannot edit approved or reimbursed expenses' });
    }

    // Calculate new total if amount or tax changed
    const updateData: any = { ...validatedData };
    if (validatedData.amount !== undefined || validatedData.taxAmount !== undefined) {
      const amount = validatedData.amount ?? Number(existingExpense.amount);
      const taxAmount = validatedData.taxAmount ?? Number(existingExpense.taxAmount);
      updateData.totalAmount = amount + taxAmount;
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        vendor: { select: { id: true, name: true, displayName: true } },
        customer: { select: { id: true, name: true } },
        taxRate: { select: { id: true, name: true, rate: true } },
        expenseAccount: { select: { id: true, code: true, name: true, type: true } },
        paidThrough: { select: { id: true, accountNumber: true, name: true, type: true } }
      }
    });

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

/**
 * ✅ APPROVE EXPENSE AND CREATE JOURNAL ENTRIES
 * POST /api/v1/expenses/:id/approve
 * Approves expense and creates double-entry journal entries
 */
export const approveExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        expenseAccount: true,
        paidThrough: true,
        taxRate: true
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending expenses can be approved' });
    }

    // Get default book
    const book = await prisma.book.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    if (!book) {
      return res.status(400).json({ error: 'No accounting book found' });
    }

    // Create journal entries for double-entry bookkeeping
    const journalId = `EXP-${expense.expenseNumber}-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Debit: Expense Account (increases expense)
      await tx.entry.create({
        data: {
          accountId: expense.expenseAccountId,
          bookId: book.id,
          tenantId,
          amount: expense.amount,
          currency: expense.currency,
          exchangeRate: expense.exchangeRate,
          type: 'DEBIT',
          memo: expense.description,
          reference: expense.reference || expense.expenseNumber,
          journalId,
          postedAt: new Date()
        }
      });

      // 2. If there's tax, debit tax account
      if (Number(expense.taxAmount) > 0 && expense.taxRate?.accountId) {
        await tx.entry.create({
          data: {
            accountId: expense.taxRate.accountId,
            bookId: book.id,
            tenantId,
            amount: expense.taxAmount,
            currency: expense.currency,
            exchangeRate: expense.exchangeRate,
            type: 'DEBIT',
            memo: `Tax for ${expense.description}`,
            reference: expense.reference || expense.expenseNumber,
            journalId,
            postedAt: new Date()
          }
        });
      }

      // 3. Credit: Paid Through Account (decreases cash/bank/credit card)
      // Handle both legacy paidThroughId and new paidThroughAccountId
      const paidThroughAccountId = expense.paidThroughAccountId || expense.paidThroughId;
      if (!paidThroughAccountId) {
        throw new Error('Either paidThroughId or paidThroughAccountId must be provided');
      }

      await tx.entry.create({
        data: {
          accountId: paidThroughAccountId,
          bookId: book.id,
          tenantId,
          amount: expense.totalAmount,
          currency: expense.currency,
          exchangeRate: expense.exchangeRate,
          type: 'CREDIT',
          memo: `Payment for ${expense.description}`,
          reference: expense.reference || expense.expenseNumber,
          journalId,
          postedAt: new Date()
        }
      });

      // Update expense status and journal reference
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user?.uid || 'system',
          approvedAt: new Date(),
          paidAt: new Date(),
          journalId
        }
      });

      return updatedExpense;
    }, {
      timeout: 15000, // 15 seconds timeout instead of default 5 seconds
    });

    // Fetch the updated expense with full details
    const expenseWithDetails = await prisma.expense.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, displayName: true } },
        customer: { select: { id: true, name: true } },
        taxRate: { select: { id: true, name: true, rate: true } },
        expenseAccount: { select: { id: true, code: true, name: true, type: true } },
        paidThrough: { select: { id: true, accountNumber: true, name: true, type: true } }
      }
    });

    res.json({
      message: 'Expense approved and journal entries created',
      expense: expenseWithDetails
    });

  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
};

/**
 * 🗑️ DELETE EXPENSE (SOFT DELETE)
 * DELETE /api/v1/expenses/:id
 * Soft deletes expense with validation
 */
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id, tenantId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.status === 'APPROVED' || expense.status === 'REIMBURSED') {
      return res.status(400).json({ 
        error: 'Cannot delete approved or reimbursed expenses. Please reject instead.' 
      });
    }

    await prisma.expense.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        approvedBy: req.user?.uid || 'system',
        approvedAt: new Date()
      }
    });

    res.json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

/**
 * 📊 GET EXPENSE STATISTICS
 * GET /api/v1/expenses/stats
 * Returns comprehensive expense statistics
 */
export const getExpenseStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;

    const [
      totalStats,
      statusStats,
      categoryStats,
      monthlyStats
    ] = await Promise.all([
      // Total statistics
      prisma.expense.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true, amount: true, taxAmount: true },
        _count: { _all: true },
        _avg: { amount: true }
      }),

      // Status breakdown
      prisma.expense.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
        _sum: { totalAmount: true }
      }),

      // Category breakdown
      prisma.expense.groupBy({
        by: ['category'],
        where: { tenantId },
        _count: { _all: true },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10
      }),

      // Monthly trends (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(expenseDate, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(totalAmount) as total
        FROM expenses 
        WHERE tenantId = ${tenantId} 
          AND expenseDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(expenseDate, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `
    ]);

    res.json({
      totalStats: {
        totalExpenses: totalStats._count._all,
        totalAmount: totalStats._sum.totalAmount || 0,
        totalBaseAmount: totalStats._sum.amount || 0,
        totalTaxAmount: totalStats._sum.taxAmount || 0,
        averageAmount: totalStats._avg.amount || 0
      },
      statusBreakdown: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count._all,
        totalAmount: stat._sum.totalAmount || 0
      })),
      topCategories: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count._all,
        totalAmount: stat._sum.totalAmount || 0
      })),
      monthlyTrends: monthlyStats
    });

  } catch (error) {
    console.error('Error getting expense stats:', error);
    res.status(500).json({ error: 'Failed to get expense statistics' });
  }
};

/**
 * 🆔 GET NEXT EXPENSE NUMBER
 * GET /api/v1/expenses/next-number
 * Returns the next expense number
 */
export const getNextExpenseNumber = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;

    const latestExpense = await prisma.expense.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { expenseNumber: true }
    });

    const nextNumber = generateExpenseNumber(latestExpense?.expenseNumber);

    res.json({ expenseNumber: nextNumber });

  } catch (error) {
    console.error('Error getting next expense number:', error);
    res.status(500).json({ error: 'Failed to get next expense number' });
  }
};

// Helper function to generate expense numbers
function generateExpenseNumber(lastNumber?: string): string {
  if (!lastNumber) {
    return 'EXP-000001';
  }
  
  const match = lastNumber.match(/EXP-(\d+)/);
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `EXP-${num.toString().padStart(6, '0')}`;
  }
  
  return 'EXP-000001';
}