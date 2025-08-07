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

      // Calculate actual balances for each payment method
      const methodsWithBalances = await Promise.all(
        paymentMethods.map(async (method) => {
          // Get all transactions for this payment method
          const transactions = await prisma.bankTransaction.findMany({
            where: {
              paymentMethodId: method.id,
              tenantId
            },
            orderBy: { transactionDate: 'desc' }
          });

          // Calculate balance from transactions
          const balance = transactions.reduce((sum, tx) => {
            const amount = parseFloat(tx.amount.toString());
            return tx.type === 'DEPOSIT' ? sum + amount : sum - amount;
          }, 0);

          // Calculate reconciled balance
          const reconciledTransactions = transactions.filter(tx => tx.reconciled);
          const reconciledBalance = reconciledTransactions.reduce((sum, tx) => {
            const amount = parseFloat(tx.amount.toString());
            return tx.type === 'DEPOSIT' ? sum + amount : sum - amount;
          }, 0);

          // Count unreconciled transactions
          const unreconciledTransactions = transactions.filter(tx => !tx.reconciled).length;

          // Find last reconciled date
          const lastReconciledTx = reconciledTransactions[0];
          const lastReconciled = lastReconciledTx ? lastReconciledTx.transactionDate : null;

          return {
            ...method,
            balance,
            reconciledBalance,
            unreconciledTransactions,
            lastReconciled,
            transactionCount: transactions.length,
            paymentCount: transactions.filter(tx => tx.type === 'DEPOSIT').length
          };
        })
      );

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

      // Use transaction to create both payment method and chart of accounts entry
      const result = await prisma.$transaction(async (tx) => {
        // Create the payment method
        const paymentMethod = await tx.paymentMethod.create({
          data: {
            ...validatedData,
            tenantId
          }
        });

        // Get the default book for this tenant
        const book = await tx.book.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'asc' }
        });

        if (!book) {
          throw new Error('No accounting book found for tenant');
        }

        // Generate a unique account code for the bank account
        // Find the next available code in the 1100-1199 range (Bank accounts)
        const existingBankAccounts = await tx.account.findMany({
          where: {
            tenantId,
            OR: [
              { type: 'BANK' },
              { type: 'CREDIT_CARD' }
            ]
          },
          select: { code: true },
          orderBy: { code: 'asc' }
        });

        // Find the next available code starting from 1100
        let accountCode = '1100';
        const existingCodes = existingBankAccounts.map(acc => acc.code);
        
        for (let i = 1100; i < 1200; i++) {
          const codeStr = i.toString();
          if (!existingCodes.includes(codeStr)) {
            accountCode = codeStr;
            break;
          }
        }

        // Determine account type based on payment method type
        const accountType = validatedData.type === 'credit_card' ? 'CREDIT_CARD' : 'BANK';

        // Create corresponding Chart of Accounts entry
        const chartAccount = await tx.account.create({
          data: {
            code: accountCode,
            name: validatedData.name,
            type: accountType,
            description: `${validatedData.type === 'credit_card' ? 'Credit Card' : 'Bank Account'}: ${validatedData.bankName || validatedData.name}`,
            currency: validatedData.currency || 'MMK',
            bookId: book.id,
            tenantId,
            balance: 0,
            isActive: validatedData.isActive
          }
        });

        return { paymentMethod, chartAccount };
      });

      res.status(201).json({
        message: 'Payment method and chart account created successfully',
        paymentMethod: result.paymentMethod,
        chartAccount: result.chartAccount
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

      // Use transaction to update both payment method and chart of accounts entry
      const result = await prisma.$transaction(async (tx) => {
        const updatedMethod = await tx.paymentMethod.update({
          where: { id },
          data: validatedData
        });

        // Find and update corresponding chart account
        // Look for account that might be linked to this payment method
        const linkedAccount = await tx.account.findFirst({
          where: {
            tenantId,
            OR: [
              { name: existingMethod.name },
              { description: { contains: existingMethod.name } }
            ],
            type: { in: ['BANK', 'CREDIT_CARD'] }
          }
        });

        if (linkedAccount) {
          // Update the chart account to match payment method changes
          const accountType = validatedData.type === 'credit_card' ? 'CREDIT_CARD' : 'BANK';
          
          await tx.account.update({
            where: { id: linkedAccount.id },
            data: {
              name: validatedData.name,
              type: accountType,
              description: `${validatedData.type === 'credit_card' ? 'Credit Card' : 'Bank Account'}: ${validatedData.bankName || validatedData.name}`,
              currency: validatedData.currency || linkedAccount.currency,
              isActive: validatedData.isActive
            }
          });
        }

        return updatedMethod;
      });

      res.json({
        message: 'Payment method updated successfully',
        paymentMethod: result
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

      // Use transaction to soft delete both payment method and chart account
      await prisma.$transaction(async (tx) => {
        // Soft delete payment method
        await tx.paymentMethod.update({
          where: { id },
          data: { isActive: false }
        });

        // Find and soft delete corresponding chart account
        const linkedAccount = await tx.account.findFirst({
          where: {
            tenantId,
            OR: [
              { name: paymentMethod.name },
              { description: { contains: paymentMethod.name } }
            ],
            type: { in: ['BANK', 'CREDIT_CARD'] }
          }
        });

        if (linkedAccount) {
          await tx.account.update({
            where: { id: linkedAccount.id },
            data: { isActive: false }
          });
        }
      });

      res.json({
        message: 'Payment method and related chart account deactivated successfully',
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
            bookBalance: 0, // Will be calculated
            adjustedBookBalance: 0,
            variance: 0,
            isBalanced: transactionIds.length > 0,
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