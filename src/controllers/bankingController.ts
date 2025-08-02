import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { BankTransactionService } from '../services/bankTransactionService';

const prisma = new PrismaClient();

// Validation schemas
const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.string().min(1, 'Account type is required'), 
  accountNumber: z.string().min(4, 'Account number must be at least 4 characters').optional(),
  routingNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankIdentifierCode: z.string().optional(),
  currency: z.string().min(3, 'Currency is required').default('MMK'),
  branch: z.string().optional(),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export class BankingController {
  // Get all payment methods (bank accounts & credit cards)
  static async getPaymentMethods(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { page = '1', limit = '20', type, isActive = 'true' } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where: any = { tenantId };
      
      if (type && type !== 'all') {
        where.type = type;
      }
      
      if (isActive !== 'all') {
        where.isActive = isActive === 'true';
      }

      const [paymentMethods, totalCount] = await Promise.all([
        prisma.paymentMethod.findMany({
          where,
          orderBy: [
            { isDefault: 'desc' },
            { name: 'asc' }
          ],
          skip,
          take: Number(limit)
        }),
        prisma.paymentMethod.count({ where })
      ]);

      // Add basic balance calculation for each payment method
      const methodsWithBalances = paymentMethods.map(method => ({
        ...method,
        balance: 0, // Will be calculated from transactions later
        reconciledBalance: 0,
        unreconciledTransactions: 0,
        lastReconciled: null,
        transactionCount: 0,
        paymentCount: 0
      }));

      res.json({
        paymentMethods: methodsWithBalances,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  }

  // Create new payment method (bank account or credit card)
  static async createPaymentMethod(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const validatedData = paymentMethodSchema.parse(req.body);

      // If this is set as default, unset other defaults
      if (validatedData.isDefault) {
        await prisma.paymentMethod.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false }
        });
      }

      // Check if account number already exists for this tenant (if provided)
      if (validatedData.accountNumber) {
        const existingMethod = await prisma.paymentMethod.findFirst({
          where: {
            tenantId,
            accountNumber: validatedData.accountNumber
          }
        });

        if (existingMethod) {
          return res.status(400).json({ 
            error: 'Account number already exists',
            field: 'accountNumber'
          });
        }
      }

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          ...validatedData,
          tenantId
        }
      });

      res.status(201).json({
        message: 'Payment method created successfully',
        paymentMethod
      });
    } catch (error) {
      console.error('Create payment method error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors,
          fields: error.errors.reduce((acc, err) => {
            acc[err.path[0]] = err.message;
            return acc;
          }, {} as Record<string, string>)
        });
        return;
      }
      res.status(500).json({ error: 'Failed to create payment method' });
    }
  }

  // Update payment method
  static async updatePaymentMethod(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const validatedData = paymentMethodSchema.parse(req.body);

      // Check if payment method exists
      const existingMethod = await prisma.paymentMethod.findFirst({
        where: { id, tenantId }
      });

      if (!existingMethod) {
        return res.status(404).json({ error: 'Payment method not found' });
      }

      // If this is set as default, unset other defaults
      if (validatedData.isDefault && !existingMethod.isDefault) {
        await prisma.paymentMethod.updateMany({
          where: { tenantId, isDefault: true, id: { not: id } },
          data: { isDefault: false }
        });
      }

      // Check if account number already exists for other methods (if provided)
      if (validatedData.accountNumber && validatedData.accountNumber !== existingMethod.accountNumber) {
        const duplicateMethod = await prisma.paymentMethod.findFirst({
          where: {
            tenantId,
            accountNumber: validatedData.accountNumber,
            id: { not: id }
          }
        });

        if (duplicateMethod) {
          return res.status(400).json({ 
            error: 'Account number already exists',
            field: 'accountNumber'
          });
        }
      }

      const updatedMethod = await prisma.paymentMethod.update({
        where: { id },
        data: validatedData
      });

      res.json({
        message: 'Payment method updated successfully',
        paymentMethod: updatedMethod
      });
    } catch (error) {
      console.error('Update payment method error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors,
          fields: error.errors.reduce((acc, err) => {
            acc[err.path[0]] = err.message;
            return acc;
          }, {} as Record<string, string>)
        });
        return;
      }
      res.status(500).json({ error: 'Failed to update payment method' });
    }
  }

  // Delete payment method
  static async deletePaymentMethod(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // Check if payment method exists
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id, tenantId }
      });

      if (!paymentMethod) {
        return res.status(404).json({ error: 'Payment method not found' });
      }

      // For now, always soft delete to be safe
      await prisma.paymentMethod.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({
        message: 'Payment method deactivated successfully',
        deactivated: true
      });
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  }

  // Get basic banking overview
  static async getBankingOverview(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // Get payment methods
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: { tenantId, isActive: true }
      });

      // Basic overview data
      const overview = {
        totalPaymentMethods: paymentMethods.length,
        bankAccounts: paymentMethods.filter(pm => pm.type === 'bank_transfer').length,
        creditCards: paymentMethods.filter(pm => pm.type === 'credit_card').length,
        totalBalance: 0, // Will be calculated from actual transactions
        summary: {
          message: 'Banking module is ready. Add bank accounts and credit cards to get started.'
        }
      };

      res.json(overview);
    } catch (error) {
      console.error('Get banking overview error:', error);
      res.status(500).json({ error: 'Failed to fetch banking overview' });
    }
  }

  // Get bank transactions for a specific payment method with enhanced features
  static async getBankTransactions(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { paymentMethodId } = req.params;
      const { page = '1', limit = '20', status, reconciled, search, dateFrom, dateTo } = req.query;

      const options = {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        reconciled: reconciled === 'true' ? true : reconciled === 'false' ? false : undefined,
        search: search as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };

      const result = await BankTransactionService.getTransactionsWithBalance(
        paymentMethodId as string,
        tenantId,
        options
      );

      res.json(result);
    } catch (error) {
      console.error('Get bank transactions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reconcile bank transactions
  static async reconcileTransactions(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { paymentMethodId } = req.params;
      const { transactionIds, statementBalance, reconciliationDate } = req.body;

      if (!transactionIds || !Array.isArray(transactionIds)) {
        return res.status(400).json({ error: 'Transaction IDs are required' });
      }

      // Start a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update selected transactions as reconciled
        await tx.bankTransaction.updateMany({
          where: {
            id: { in: transactionIds },
            tenantId,
            paymentMethodId
          },
          data: {
            reconciled: true,
            reconciledAt: new Date(reconciliationDate || new Date()),
            status: 'cleared'
          }
        });

        // Create reconciliation record
        const reconciliation = await tx.bankReconciliation.create({
          data: {
            tenantId,
            paymentMethodId,
            reconciliationDate: new Date(reconciliationDate || new Date()),
            statementBalance: statementBalance || 0,
            reconciledTransactions: transactionIds.length,
            status: 'COMPLETED',
            notes: `Reconciled ${transactionIds.length} transactions`
          }
        });

        return { reconciliation };
      });

      res.json({
        message: 'Transactions reconciled successfully',
        reconciliation: result.reconciliation,
        reconciledCount: transactionIds.length
      });
    } catch (error) {
      console.error('Reconcile transactions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get reconciliation history for a payment method
  static async getReconciliationHistory(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { paymentMethodId } = req.params;
      const { page = '1', limit = '10' } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const [reconciliations, totalCount] = await Promise.all([
        prisma.bankReconciliation.findMany({
          where: { tenantId, paymentMethodId },
          orderBy: { reconciliationDate: 'desc' },
          skip,
          take: Number(limit),
          include: {
            paymentMethod: {
              select: { name: true, accountNumber: true }
            }
          }
        }),
        prisma.bankReconciliation.count({ 
          where: { tenantId, paymentMethodId }
        })
      ]);

      res.json({
        reconciliations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get reconciliation history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create a new bank transaction
  static async createBankTransaction(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { paymentMethodId } = req.params;
      const transactionData = {
        paymentMethodId,
        ...req.body,
        transactionDate: new Date(req.body.transactionDate)
      };

      const transaction = await BankTransactionService.createTransaction(transactionData, tenantId);

      res.json({
        message: 'Bank transaction created successfully',
        transaction
      });
    } catch (error) {
      console.error('Create bank transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get AI-powered transaction insights
  static async getTransactionInsights(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { paymentMethodId } = req.params;

      const insights = await BankTransactionService.getTransactionInsights(paymentMethodId, tenantId);

      res.json(insights);
    } catch (error) {
      console.error('Get transaction insights error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default BankingController; 