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
  // Simple test method for payment method creation
  static async createPaymentMethodSimple(req: Request, res: Response) {
    console.log('🔥 SIMPLE CREATE PAYMENT METHOD TEST');
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { name, type } = req.body;
      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          name: name,
          type: type,
          tenantId: tenantId,
          currency: 'MMK',
          isActive: true,
          isDefault: false
        }
      });

      console.log('✅ Simple payment method created:', paymentMethod);
      return res.status(201).json({
        message: 'Simple payment method created successfully',
        paymentMethod: paymentMethod
      });
    } catch (error) {
      console.error('❌ Simple create error:', error);
      return res.status(500).json({ 
        error: 'Simple create failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

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

      // Use safer approach to avoid Prisma engine panic
      const paymentMethods = await prisma.paymentMethod.findMany({
        where,
        include: {
          chartAccount: true // Include the linked chart account
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take: Number(limit)
      });
      
      const totalCount = paymentMethods.length;

      // Compute balances from bank transactions to ensure UI reflects actual activity
      const paymentMethodIds = paymentMethods.map(m => m.id);
      const allTx = await prisma.bankTransaction.findMany({
        where: { tenantId, paymentMethodId: { in: paymentMethodIds } },
        select: { paymentMethodId: true, amount: true, type: true }
      });

      const pmIdToComputedBalance: Record<string, number> = {};
      for (const tx of allTx) {
        if (tx.paymentMethodId) { // Add null check
          const sign = tx.type === 'DEPOSIT' ? 1 : -1;
          pmIdToComputedBalance[tx.paymentMethodId] = (pmIdToComputedBalance[tx.paymentMethodId] || 0) + Number(tx.amount) * sign;
        }
      }

      // Merge computed balances with chart account metadata
      const methodsWithBalances = paymentMethods.map(method => {
        const computed = pmIdToComputedBalance[method.id] ?? 0;
        return {
          ...method,
          balance: computed,
          reconciledBalance: computed, // simple assumption for now
          unreconciledTransactions: 0,
          lastReconciled: null,
          transactionCount: 0,
          paymentCount: 0,
          chartAccountCode: method.chartAccount?.code || null,
          chartAccountName: method.chartAccount?.name || null
        };
      });

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
    console.log('🏦 CREATING BANK ACCOUNT WITH CHART OF ACCOUNTS INTEGRATION');
    console.log('📋 Request body:', req.body);

    let createdChartAccountId: string | null = null;

    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        console.log('❌ No tenant ID found');
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const { name, type, accountNumber, bankName, description } = req.body;
      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      console.log('✅ Starting bank account creation with chart of accounts integration...');

      // Step 1: Find or create the default book for this tenant
      let defaultBook = await prisma.book.findFirst({ where: { tenantId, name: 'General Ledger' } });
      if (!defaultBook) {
        defaultBook = await prisma.book.create({
          data: { name: 'General Ledger', tenantId, currency: 'MMK' }
        });
        console.log('🆕 Created General Ledger book');
      }

      // Step 2: Find the parent Bank Accounts account (1111). If missing, create it under 1110 if present
      let parentBankAccount = await prisma.account.findFirst({
        where: { tenantId, code: '1111', type: 'BANK' }
      });
      if (!parentBankAccount) {
        const cashAndEquivalents = await prisma.account.findFirst({
          where: { tenantId, code: '1110' }
        });
        parentBankAccount = await prisma.account.create({
          data: {
            code: '1111',
            name: 'Bank Accounts',
            type: 'BANK',
            tenantId,
            bookId: defaultBook.id,
            parentId: cashAndEquivalents?.id ?? null,
            currency: 'MMK',
            isActive: true,
            description: 'All bank account balances'
          }
        });
        console.log('🆕 Created parent Bank Accounts (1111)');
      }

      // Step 3: Generate a collision-proof next code in the 111x range
      const existingCodes = await prisma.account.findMany({
        where: { tenantId, code: { startsWith: '111' } },
        select: { code: true }
      });
      const used = new Set(existingCodes.map(c => c.code));
      let nextNumeric = 1112; // 1111 is parent
      while (used.has(String(nextNumeric))) {
        nextNumeric += 1;
      }
      const nextCode = String(nextNumeric);
      console.log('🔢 Generated account code:', nextCode);

      // Step 4: Create the chart of accounts entry (outside of transaction to avoid timeouts)
      const chartAccount = await prisma.account.create({
        data: {
          code: nextCode,
          name,
          type: 'BANK',
          parentId: parentBankAccount.id,
          description: description || `${type === 'credit_card' ? 'Credit Card' : 'Bank Account'}: ${name}`,
          currency: 'MMK',
          isActive: true,
          tenantId,
          bookId: defaultBook.id
        }
      });
      createdChartAccountId = chartAccount.id;
      console.log('✅ Chart of accounts entry created:', chartAccount.id);

      // Step 5: Create the payment method linked to chart account
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          name,
          type,
          tenantId,
          currency: 'MMK',
          isActive: true,
          isDefault: false,
          accountNumber: accountNumber || null,
          bankName: bankName || null,
          description: description || null,
          chartAccountId: chartAccount.id
        }
      });

      console.log('🎉 Bank account creation completed successfully!');
      return res.status(201).json({
        message: 'Bank account created successfully with chart of accounts integration',
        paymentMethod,
        chartAccount
      });
    } catch (error) {
      console.error('❌ CREATE ERROR:', error);
      // Cleanup orphan chart account if payment method failed after account creation
      if (createdChartAccountId) {
        try {
          await prisma.account.delete({ where: { id: createdChartAccountId } });
          console.log('🧹 Cleaned up orphan chart account:', createdChartAccountId);
        } catch (cleanupErr) {
          console.error('⚠️ Failed to cleanup orphan chart account:', cleanupErr);
        }
      }
      return res.status(500).json({
        error: 'Failed to create bank account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Recalculate all account balances based on journal entries
  static async recalculateAccountBalances(req: Request, res: Response) {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      console.log('🔄 Recalculating account balances for tenant:', tenantId);

      // Get all accounts for the tenant
      const accounts = await prisma.account.findMany({
        where: { tenantId },
        select: { id: true, code: true, name: true, type: true }
      });

      let updatedCount = 0;

      for (const account of accounts) {
        // Calculate balance from journal entries
        const entries = await prisma.entry.findMany({
          where: { accountId: account.id },
          select: { type: true, amount: true }
        });

        let balance = 0;
        for (const entry of entries) {
          if (entry.type === 'DEBIT') {
            balance += Number(entry.amount);
          } else if (entry.type === 'CREDIT') {
            balance -= Number(entry.amount);
          }
        }

        // Update account balance
        await prisma.account.update({
          where: { id: account.id },
          data: { balance }
        });

        updatedCount++;
        console.log(`✅ Updated ${account.code} (${account.name}): ${balance}`);
      }

      console.log(`🎉 Recalculated balances for ${updatedCount} accounts`);
      res.json({
        message: `Successfully recalculated balances for ${updatedCount} accounts`,
        updatedCount
      });
    } catch (error) {
      console.error('Recalculate account balances error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default BankingController; 