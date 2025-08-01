import { PrismaClient, TransactionType, AccountType } from '@prisma/client';
import aiService from './aiService';
import { ACCOUNT_CATEGORIES } from '../accounting/models/Account';

const prisma = new PrismaClient();

export interface CreateBankTransactionData {
  paymentMethodId: string;
  description: string;
  amount: number;
  transactionDate: Date;
  type: TransactionType;
  reference?: string;
  category?: string;
  contraAccountId?: string; // The other account in double-entry
  bankFee?: number;
  exchangeRate?: number;
  statementDate?: Date;
  metadata?: any;
}

export interface BankTransactionWithBalance {
  id: string;
  description: string;
  amount: number;
  transactionDate: Date;
  type: TransactionType;
  reference?: string;
  category?: string;
  runningBalance: number;
  status: string;
  reconciled: boolean;
  reconciledAt?: Date;
  paymentMethod?: {
    id: string;
    name: string;
    accountNumber?: string;
    type: string;
  };
  journalEntries?: Array<{
    id: string;
    account: {
      id: string;
      name: string;
      code: string;
      type: AccountType;
    };
    debitAmount: number;
    creditAmount: number;
    description: string;
  }>;
}

export interface TransactionInsights {
  insights: string[];
  patterns: Array<{
    type: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  recommendations: string[];
  accountingImpact: {
    affectedAccounts: Array<{
      accountName: string;
      accountType: AccountType;
      impact: string;
      amount: number;
    }>;
    balanceSheetEffect: string;
    incomeStatementEffect?: string;
  };
}

/**
 * 🏦 BANK TRANSACTION SERVICE
 * Handles bank transactions with proper ALE double-entry accounting
 */
export class BankTransactionService {
  
  /**
   * ✅ CREATE BANK TRANSACTION WITH PROPER ALE ACCOUNTING
   * Creates a bank transaction following strict double-entry rules
   */
  static async createTransaction(
    data: CreateBankTransactionData,
    tenantId: string
  ): Promise<BankTransactionWithBalance> {
    return await prisma.$transaction(async (tx) => {
      // Get payment method details
      const paymentMethod = await tx.paymentMethod.findUnique({
        where: { id: data.paymentMethodId }
      });

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // For bank transactions, we need to find or create a corresponding cash/bank account
      const cashAccount = await this.findOrCreateCashAccount(tx, paymentMethod, tenantId);
      
      // Calculate running balance for the payment method
      const lastTransaction = await tx.bankTransaction.findFirst({
        where: {
          paymentMethodId: data.paymentMethodId,
          tenantId
        },
        orderBy: { transactionDate: 'desc' }
      });

      // Apply ALE rules for cash/bank account (ASSET)
      // DEPOSITS: Increase Asset (Debit Bank Account) 
      // WITHDRAWALS: Decrease Asset (Credit Bank Account)
      const isDeposit = data.type === 'DEPOSIT';
      const newBalance = (lastTransaction?.balance ? parseFloat(lastTransaction.balance.toString()) : 0) +
                        (isDeposit ? data.amount : -data.amount);

      // Create the bank transaction record
      const bankTransaction = await tx.bankTransaction.create({
        data: {
          paymentMethodId: data.paymentMethodId,
          description: data.description,
          amount: data.amount,
          transactionDate: data.transactionDate,
          type: data.type,
          reference: data.reference,
          category: data.category,
          balance: newBalance,
          runningBalance: newBalance,
          status: 'pending',
          reconciled: false,
          tenantId,
          metadata: data.metadata
        } as any // Temporarily bypass Prisma types until client is properly regenerated
      });

      // Create journal entries following ALE rules
      const journalEntries = await this.createJournalEntries(
        tx,
        bankTransaction,
        cashAccount,
        data,
        tenantId
      );

      return {
        id: bankTransaction.id,
        description: bankTransaction.description,
        amount: parseFloat(bankTransaction.amount.toString()),
        transactionDate: bankTransaction.transactionDate,
        type: bankTransaction.type,
        reference: bankTransaction.reference || undefined,
        category: bankTransaction.category || undefined,
        runningBalance: parseFloat(bankTransaction.balance?.toString() || '0'),
        status: bankTransaction.status,
        reconciled: bankTransaction.reconciled,
        reconciledAt: bankTransaction.reconciledAt || undefined,
        paymentMethod: {
          id: paymentMethod.id,
          name: paymentMethod.name,
          accountNumber: paymentMethod.accountNumber || undefined,
          type: paymentMethod.type
        },
        journalEntries
      };
    });
  }

  /**
   * 📊 CREATE JOURNAL ENTRIES WITH ALE RULES
   * Creates proper double-entry journal entries following ALE accounting principles
   */
  private static async createJournalEntries(
    tx: any,
    bankTransaction: any,
    cashAccount: any,
    data: CreateBankTransactionData,
    tenantId: string
  ) {
    const journalEntries = [];
    const isDeposit = data.type === 'DEPOSIT';
    const amount = data.amount;

    // Get default book
    const book = await tx.book.findFirst({
      where: { tenantId, isDefault: true }
    });

    if (!book) {
      throw new Error('No default book found for tenant');
    }

    // Entry 1: Cash/Bank Account (ASSET)
    // DEPOSITS: Debit Cash/Bank Account (increase asset)
    // WITHDRAWALS: Credit Cash/Bank Account (decrease asset)
    const cashEntry = await tx.entry.create({
      data: {
        accountId: cashAccount.id,
        bookId: book.id,
        amount: amount,
        type: isDeposit ? 'DEBIT' : 'CREDIT',
        description: `${data.type}: ${data.description}`,
        reference: data.reference || `BT-${bankTransaction.id}`,
        entryDate: data.transactionDate,
        tenantId
      }
    });

    journalEntries.push({
      id: cashEntry.id,
      account: {
        id: cashAccount.id,
        name: cashAccount.name,
        code: cashAccount.code,
        type: cashAccount.type
      },
      debitAmount: isDeposit ? amount : 0,
      creditAmount: isDeposit ? 0 : amount,
      description: cashEntry.description
    });

    // Entry 2: Contra Account
    let contraAccount;
    
    if (data.contraAccountId) {
      // Use specified contra account
      contraAccount = await tx.account.findUnique({
        where: { id: data.contraAccountId }
      });
    } else {
      // Find or create appropriate contra account based on transaction type
      contraAccount = await this.getDefaultContraAccount(tx, data, tenantId, book.id);
    }

    if (contraAccount) {
      // Apply ALE rules for contra account
      const contraAccountRules = ACCOUNT_CATEGORIES[contraAccount.type as AccountType];
      
      // For deposits: If contra is Revenue (credit normal), credit it (increase)
      // For withdrawals: If contra is Expense (debit normal), debit it (increase)
      let contraEntryType: 'DEBIT' | 'CREDIT';
      
      if (isDeposit) {
        // Deposit: Credit the source (Revenue/Liability/Equity increases with credit)
        contraEntryType = ['LIABILITY', 'EQUITY', 'REVENUE'].includes(contraAccount.type) ? 'CREDIT' : 'DEBIT';
      } else {
        // Withdrawal: Debit the destination (Asset/Expense increases with debit)
        contraEntryType = ['ASSET', 'EXPENSE'].includes(contraAccount.type) ? 'DEBIT' : 'CREDIT';
      }

      const contraEntry = await tx.entry.create({
        data: {
          accountId: contraAccount.id,
          bookId: book.id,
          amount: amount,
          type: contraEntryType,
          description: `${data.type}: ${data.description}`,
          reference: data.reference || `BT-${bankTransaction.id}`,
          entryDate: data.transactionDate,
          tenantId
        }
      });

      journalEntries.push({
        id: contraEntry.id,
        account: {
          id: contraAccount.id,
          name: contraAccount.name,
          code: contraAccount.code,
          type: contraAccount.type
        },
        debitAmount: contraEntryType === 'DEBIT' ? amount : 0,
        creditAmount: contraEntryType === 'CREDIT' ? amount : 0,
        description: contraEntry.description
      });
    }

    // Handle bank fees if present
    if (data.bankFee && data.bankFee > 0) {
      const feeExpenseAccount = await this.getBankFeeExpenseAccount(tx, tenantId, book.id);
      
      // Bank fees are always expenses (DEBIT to increase)
      const feeEntry = await tx.entry.create({
        data: {
          accountId: feeExpenseAccount.id,
          bookId: book.id,
          amount: data.bankFee,
          type: 'DEBIT',
          description: `Bank fee for ${data.description}`,
          reference: data.reference || `BT-${bankTransaction.id}-FEE`,
          entryDate: data.transactionDate,
          tenantId
        }
      });

      // Additional credit to cash/bank account for the fee
      const feeCashEntry = await tx.entry.create({
        data: {
          accountId: cashAccount.id,
          bookId: book.id,
          amount: data.bankFee,
          type: 'CREDIT',
          description: `Bank fee for ${data.description}`,
          reference: data.reference || `BT-${bankTransaction.id}-FEE`,
          entryDate: data.transactionDate,
          tenantId
        }
      });

      journalEntries.push(
        {
          id: feeEntry.id,
          account: {
            id: feeExpenseAccount.id,
            name: feeExpenseAccount.name,
            code: feeExpenseAccount.code,
            type: feeExpenseAccount.type
          },
          debitAmount: data.bankFee,
          creditAmount: 0,
          description: feeEntry.description
        },
        {
          id: feeCashEntry.id,
          account: {
            id: cashAccount.id,
            name: cashAccount.name,
            code: cashAccount.code,
            type: cashAccount.type
          },
          debitAmount: 0,
          creditAmount: data.bankFee,
          description: feeCashEntry.description
        }
      );
    }

    return journalEntries;
  }

  /**
   * 🎯 GET DEFAULT CONTRA ACCOUNT
   * Determines appropriate contra account based on transaction type and ALE rules
   */
  private static async getDefaultContraAccount(tx: any, data: CreateBankTransactionData, tenantId: string, bookId: string) {
    const category = data.category?.toLowerCase() || '';
    const description = data.description.toLowerCase();
    
    // Smart categorization based on common patterns
    if (data.type === 'DEPOSIT') {
      // Deposits typically come from Revenue accounts (CREDIT normal balance)
      if (category.includes('sales') || description.includes('payment') || description.includes('invoice')) {
        return await this.findOrCreateAccount(tx, '4110', 'Product Sales', 'REVENUE', tenantId, bookId);
      } else if (category.includes('service') || description.includes('service')) {
        return await this.findOrCreateAccount(tx, '4120', 'Service Revenue', 'REVENUE', tenantId, bookId);
      } else if (description.includes('interest')) {
        return await this.findOrCreateAccount(tx, '4210', 'Interest Income', 'REVENUE', tenantId, bookId);
      } else {
        return await this.findOrCreateAccount(tx, '4200', 'Other Revenue', 'REVENUE', tenantId, bookId);
      }
    } else {
      // Withdrawals typically go to Expense accounts (DEBIT normal balance)
      if (category.includes('office') || description.includes('office')) {
        return await this.findOrCreateAccount(tx, '5120', 'Office Expenses', 'EXPENSE', tenantId, bookId);
      } else if (category.includes('travel') || description.includes('travel')) {
        return await this.findOrCreateAccount(tx, '5140', 'Travel Expenses', 'EXPENSE', tenantId, bookId);
      } else if (category.includes('utilities') || description.includes('utilities')) {
        return await this.findOrCreateAccount(tx, '5160', 'Utilities Expenses', 'EXPENSE', tenantId, bookId);
      } else if (description.includes('salary') || description.includes('wage')) {
        return await this.findOrCreateAccount(tx, '5200', 'Salaries and Wages', 'EXPENSE', tenantId, bookId);
      } else {
        return await this.findOrCreateAccount(tx, '5900', 'Other Expenses', 'EXPENSE', tenantId, bookId);
      }
    }
  }

  /**
   * 🏦 GET BANK FEE EXPENSE ACCOUNT
   */
  private static async getBankFeeExpenseAccount(tx: any, tenantId: string, bookId: string) {
    return await this.findOrCreateAccount(tx, '5180', 'Bank Fees', 'EXPENSE', tenantId, bookId);
  }

  /**
   * 🏦 FIND OR CREATE CASH ACCOUNT FOR PAYMENT METHOD
   */
  private static async findOrCreateCashAccount(tx: any, paymentMethod: any, tenantId: string) {
    // Get default book
    const book = await tx.book.findFirst({
      where: { tenantId, isDefault: true }
    });

    if (!book) {
      throw new Error('No default book found for tenant');
    }

    // Generate account code based on payment method type
    let accountCode: string;
    let accountName: string;
    
    switch (paymentMethod.type.toLowerCase()) {
      case 'cash':
        accountCode = '1111';
        accountName = 'Cash';
        break;
      case 'bank_transfer':
      case 'bank':
        accountCode = '1112';
        accountName = `Bank - ${paymentMethod.name}`;
        break;
      case 'credit_card':
        accountCode = '1113';
        accountName = `Credit Card - ${paymentMethod.name}`;
        break;
      case 'debit_card':
        accountCode = '1114';
        accountName = `Debit Card - ${paymentMethod.name}`;
        break;
      default:
        accountCode = '1115';
        accountName = `Other Payment - ${paymentMethod.name}`;
    }

    return await this.findOrCreateAccount(tx, accountCode, accountName, 'ASSET', tenantId, book.id);
  }

  /**
   * 🔍 FIND OR CREATE ACCOUNT
   */
  private static async findOrCreateAccount(tx: any, code: string, name: string, type: AccountType, tenantId: string, bookId: string) {
    let account = await tx.account.findFirst({
      where: { code, tenantId }
    });

    if (!account) {
      account = await tx.account.create({
        data: {
          code,
          name,
          type,
          bookId,
          tenantId,
          balance: 0
        }
      });
    }

    return account;
  }

  /**
   * 📊 GET BANK TRANSACTIONS WITH RUNNING BALANCE
   * Retrieves bank transactions for a payment method with their running balance
   */
  static async getTransactionsWithBalance(
    paymentMethodId: string,
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      reconciled?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    } = {}
  ): Promise<{
    transactions: BankTransactionWithBalance[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    balanceSummary: {
      openingBalance: number;
      totalDeposits: number;
      totalWithdrawals: number;
      closingBalance: number;
      unreconciledAmount: number;
    };
  }> {
    
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
      paymentMethodId
    };

    if (options.status && options.status !== 'all') {
      where.status = options.status;
    }

    if (options.reconciled !== undefined) {
      where.reconciled = options.reconciled;
    }

    if (options.dateFrom || options.dateTo) {
      where.transactionDate = {};
      if (options.dateFrom) where.transactionDate.gte = options.dateFrom;
      if (options.dateTo) where.transactionDate.lte = options.dateTo;
    }

    if (options.search) {
      where.OR = [
        { description: { contains: options.search } },
        { reference: { contains: options.search } },
        { category: { contains: options.search } }
      ];
    }

    // Get transactions and total count
    const [transactions, totalCount] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
        include: {
          paymentMethod: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              type: true
            }
          }
        }
      }),
      prisma.bankTransaction.count({ where })
    ]);

    // Calculate balance summary
    const allTransactions = await prisma.bankTransaction.findMany({
      where: { tenantId, paymentMethodId },
      orderBy: { transactionDate: 'asc' }
    });

    const balanceSummary = {
      openingBalance: 0,
      totalDeposits: allTransactions
        .filter(t => t.amount.toNumber() > 0)
        .reduce((sum, t) => sum + t.amount.toNumber(), 0),
      totalWithdrawals: Math.abs(allTransactions
        .filter(t => t.amount.toNumber() < 0)
        .reduce((sum, t) => sum + t.amount.toNumber(), 0)),
      closingBalance: allTransactions.length > 0 ? 
        allTransactions[allTransactions.length - 1].balance?.toNumber() || 0 : 0,
      unreconciledAmount: allTransactions
        .filter(t => !t.reconciled)
        .reduce((sum, t) => sum + t.amount.toNumber(), 0)
    };

    const transformedTransactions: BankTransactionWithBalance[] = transactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount.toNumber(),
      transactionDate: t.transactionDate,
      type: t.type,
      reference: t.reference || undefined,
      category: t.category || undefined,
      runningBalance: t.balance?.toNumber() || 0,
      status: t.status,
      reconciled: t.reconciled,
      reconciledAt: t.reconciledAt || undefined,
      paymentMethod: t.paymentMethod ? {
        id: t.paymentMethod.id,
        name: t.paymentMethod.name,
        accountNumber: t.paymentMethod.accountNumber || undefined,
        type: t.paymentMethod.type
      } : undefined
    }));

    return {
      transactions: transformedTransactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      balanceSummary
    };
  }

  /**
   * 🔄 RECONCILE BANK TRANSACTIONS
   * Updates transactions as reconciled and creates a reconciliation record
   */
  static async reconcileTransactions(
    paymentMethodId: string,
    tenantId: string,
    data: {
      transactionIds: string[];
      statementBalance: number;
      reconciliationDate: Date;
      notes?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Update transactions as reconciled
      await tx.bankTransaction.updateMany({
        where: {
          id: { in: data.transactionIds },
          tenantId,
          paymentMethodId
        },
        data: {
          reconciled: true,
          reconciledAt: data.reconciliationDate,
          status: 'cleared'
        }
      });

      // Calculate book balance
      const reconciledTransactions = await tx.bankTransaction.findMany({
        where: {
          tenantId,
          paymentMethodId,
          reconciled: true
        }
      });

      const bookBalance = reconciledTransactions.reduce(
        (sum, t) => sum + t.amount.toNumber(), 
        0
      );

      // Create reconciliation record
      const reconciliation = await tx.bankReconciliation.create({
        data: {
          tenantId,
          paymentMethodId,
          reconciliationDate: data.reconciliationDate,
          statementBalance: data.statementBalance,
          bookBalance,
          difference: data.statementBalance - bookBalance,
          reconciledTransactions: data.transactionIds.length,
          status: Math.abs(data.statementBalance - bookBalance) < 0.01 ? 'COMPLETED' : 'DISCREPANCY',
          notes: data.notes
        }
      });

      return reconciliation;
    });
  }

  /**
   * 🧠 GET AI-POWERED TRANSACTION INSIGHTS
   * Generates insights and recommendations based on transaction patterns
   */
  static async getTransactionInsights(
    paymentMethodId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const transactions = await prisma.bankTransaction.findMany({
        where: { tenantId, paymentMethodId },
        orderBy: { transactionDate: 'desc' },
        take: 50,
        include: {
          paymentMethod: { select: { name: true, currency: true } }
        }
      });

      if (transactions.length === 0) {
        return {
          insights: ['No transactions found for analysis'],
          trends: {},
          recommendations: []
        };
      }

      const analysisData = {
        totalTransactions: transactions.length,
        totalDeposits: transactions.filter(t => t.amount.toNumber() > 0).length,
        totalWithdrawals: transactions.filter(t => t.amount.toNumber() < 0).length,
        averageDeposit: transactions
          .filter(t => t.amount.toNumber() > 0)
          .reduce((sum, t) => sum + t.amount.toNumber(), 0) / 
          transactions.filter(t => t.amount.toNumber() > 0).length || 0,
        averageWithdrawal: Math.abs(transactions
          .filter(t => t.amount.toNumber() < 0)
          .reduce((sum, t) => sum + t.amount.toNumber(), 0) / 
          transactions.filter(t => t.amount.toNumber() < 0).length || 0),
        reconciledPercentage: (transactions.filter(t => t.reconciled).length / transactions.length) * 100,
        categories: [...new Set(transactions.map(t => t.category).filter(Boolean))]
      };

      const prompt = `Analyze these bank transaction patterns and provide insights:
      
      Account: ${transactions[0]?.paymentMethod?.name}
      Currency: ${transactions[0]?.paymentMethod?.currency}
      
      Transaction Summary:
      - Total Transactions: ${analysisData.totalTransactions}
      - Deposits: ${analysisData.totalDeposits} (avg: ${analysisData.averageDeposit.toFixed(2)})
      - Withdrawals: ${analysisData.totalWithdrawals} (avg: ${analysisData.averageWithdrawal.toFixed(2)})
      - Reconciled: ${analysisData.reconciledPercentage.toFixed(1)}%
      - Categories: ${analysisData.categories.join(', ')}
      
      Provide 3-5 actionable insights about cash flow patterns, reconciliation health, and financial recommendations.`;

      const analysis = await aiService.processNaturalLanguageQuery(prompt, tenantId);

      return {
        insights: analysis.answer?.split('\n').filter((line: string) => line.trim()) || [],
        trends: analysisData,
        recommendations: [
          `Maintain ${analysisData.reconciledPercentage > 90 ? 'excellent' : 'good'} reconciliation practices`,
          'Consider automating recurring transactions',
          'Review transaction categorization for better reporting'
        ]
      };
    } catch (error) {
      console.error('Error generating transaction insights:', error);
      return {
        insights: ['Analysis temporarily unavailable'],
        trends: {},
        recommendations: []
      };
    }
  }
}

export default BankTransactionService; 