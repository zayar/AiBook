import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../accounting/AccountingService';
import { JournalEntryEngine } from '../accounting/engines/JournalEntryEngine';

const prisma = new PrismaClient();

interface PaymentReceivedRequest {
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_PAYMENT' | 'ONLINE_TRANSFER' | 'OTHER';
  depositType?: 'CASH_IN_HAND' | 'BANK_DEPOSIT' | 'PETTY_CASH' | 'UNDEPOSITED_FUNDS'; // Keep for backward compatibility
  depositToAccountId?: string; // NEW: Chart of Accounts integration
  bankCharges?: number;
  referenceNumber?: string;
  taxDeducted?: boolean;
  taxAmount?: number;
  notes?: string;
  internalNotes?: string;
  sendThankYouEmail?: boolean;
  invoiceAllocations?: {
    invoiceId: string;
    amountAllocated: number;
  }[];
}

/**
 * 💰 PAYMENT RECEIVED CONTROLLER
 * Handles customer payment receipts with proper double-entry accounting
 */
export class PaymentReceivedController {

  /**
   * 📋 GET ALL PAYMENTS RECEIVED
   */
  static async getPaymentsReceived(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { page = 1, limit = 10, status, paymentMode, startDate, endDate, search } = req.query;

      const where: any = { tenantId };

      if (status) where.status = status;
      if (paymentMode) where.paymentMode = paymentMode;
      if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate) where.paymentDate.gte = new Date(startDate as string);
        if (endDate) where.paymentDate.lte = new Date(endDate as string);
      }
      if (search) {
        where.OR = [
          { paymentNumber: { contains: search as string } },
          { customerName: { contains: search as string } },
          { referenceNumber: { contains: search as string } },
          { customer: { name: { contains: search as string } } }
        ];
      }

      const [payments, total] = await Promise.all([
        prisma.paymentReceived.findMany({
          where,
          include: {
            customer: true,
            depositToAccount: {
              select: { id: true, code: true, name: true, type: true }
            },
            invoicePayments: {
              include: {
                invoice: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit)
        }),
        prisma.paymentReceived.count({ where })
      ]);

      res.json({
        success: true,
        data: payments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching payments received:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payments received',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📄 GET PAYMENT RECEIVED BY ID
   */
  static async getPaymentReceivedById(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const payment = await prisma.paymentReceived.findFirst({
        where: { id, tenantId },
        include: {
          customer: true,
          invoicePayments: {
            include: {
              invoice: true
            }
          },
          journalEntries: {
            include: {
              account: true
            }
          }
        }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Error fetching payment received:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment received',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * ➕ CREATE NEW PAYMENT RECEIVED
   */
  static async createPaymentReceived(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const data: PaymentReceivedRequest = req.body;

      // Generate payment number
      const lastPayment = await prisma.paymentReceived.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: { paymentNumber: true }
      });

      // Extract number from payment number format (e.g., "PAY-2230" -> 2230)
      let nextNumber = 'PAY-2230';
      if (lastPayment?.paymentNumber) {
        const match = lastPayment.paymentNumber.match(/(\d+)$/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          nextNumber = `PAY-${String(lastNumber + 1).padStart(4, '0')}`;
        }
      }

      // OPTIMIZATION: Start transaction with parallel processing
      const payment = await prisma.$transaction(async (tx) => {
        // Create payment received record
        const paymentReceived = await tx.paymentReceived.create({
          data: {
            paymentNumber: nextNumber,
            tenantId,
            customerId: data.customerId,
            customerName: data.customerName || (data.customerId ? undefined : 'Walk-in Customer'),
            amount: data.amount,
            paymentDate: new Date(data.paymentDate),
            paymentMode: data.paymentMode,
            depositType: data.depositType || 'CASH_IN_HAND', // Fallback for backward compatibility
            depositToAccountId: data.depositToAccountId, // NEW: Chart of Accounts integration
            bankCharges: data.bankCharges || null,
            referenceNumber: data.referenceNumber,
            taxDeducted: data.taxDeducted || false,
            taxAmount: data.taxAmount || null,
            notes: data.notes,
            internalNotes: data.internalNotes,
            sendThankYouEmail: data.sendThankYouEmail || false,
            status: 'COMPLETED'
          }
        });

        // Create invoice allocations if provided
        if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
          await Promise.all(
            data.invoiceAllocations.map(allocation =>
              tx.invoicePayment.create({
                data: {
                  tenantId,
                  invoiceId: allocation.invoiceId,
                  paymentReceivedId: paymentReceived.id,
                  amount: allocation.amountAllocated,
                  amountAllocated: allocation.amountAllocated
                }
              })
            )
          );

          // Update invoice paid amounts and status
          for (const allocation of data.invoiceAllocations) {
            // Get current invoice to check total amount
            const invoice = await tx.invoice.findUnique({
              where: { id: allocation.invoiceId },
              select: { totalAmount: true, paidAmount: true }
            });

            if (!invoice) continue;

            const newPaidAmount = Number(invoice.paidAmount) + allocation.amountAllocated;
            const totalAmount = Number(invoice.totalAmount);

            // Determine new status based on payment
            let newStatus: 'SENT' | 'PAID' | 'PARTIALLY_PAID' = 'SENT'; // Default status
            if (newPaidAmount >= totalAmount) {
              newStatus = 'PAID';
            } else if (newPaidAmount > 0) {
              newStatus = 'PARTIALLY_PAID';
            }

            await tx.invoice.update({
              where: { id: allocation.invoiceId },
              data: {
                paidAmount: {
                  increment: allocation.amountAllocated
                },
                status: newStatus as any
              }
            });
          }
        }

        // Create bank transaction if depositing to a bank/cash account
        if (data.depositToAccountId) {
          try {
            // Get the account details to determine if it's a bank account
            const depositAccount = await tx.account.findUnique({
              where: { id: data.depositToAccountId }
            });

            if (depositAccount && (depositAccount.type === 'BANK' || depositAccount.type === 'CASH')) {
              // Find corresponding payment method for this account
              // Match by account name or description
              const paymentMethod = await tx.paymentMethod.findFirst({
                where: { 
                  tenantId,
                  isActive: true,
                  OR: [
                    { name: depositAccount.name },
                    { name: { contains: depositAccount.name } },
                    { description: { contains: depositAccount.name } }
                  ]
                }
              });

              if (paymentMethod) {
                // Calculate running balance for this payment method
                const lastTransaction = await tx.bankTransaction.findFirst({
                  where: {
                    paymentMethodId: paymentMethod.id,
                    tenantId
                  },
                  orderBy: { transactionDate: 'desc' }
                });

                const currentBalance = lastTransaction?.balance ? parseFloat(lastTransaction.balance.toString()) : 0;
                const newBalance = currentBalance + data.amount;

                // Create bank transaction
                await tx.bankTransaction.create({
                  data: {
                    tenantId,
                    paymentMethodId: paymentMethod.id,
                    description: `Payment received from ${data.customerName || 'Customer'} - ${nextNumber}`,
                    amount: data.amount,
                    type: 'DEPOSIT',
                    transactionDate: new Date(data.paymentDate),
                    reference: data.referenceNumber || `PAY-${nextNumber}`,
                    status: 'cleared',
                    reconciled: false,
                    balance: newBalance,
                    runningBalance: newBalance,
                    debitAmount: 0,
                    creditAmount: data.amount,
                    category: 'customer_payment',
                    metadata: {
                      paymentReceivedId: paymentReceived.id,
                      depositAccountId: data.depositToAccountId,
                      source: 'payment_received'
                    }
                  }
                });

                console.log(`✅ Bank transaction created for payment method: ${paymentMethod.name}`);
              } else {
                console.warn(`⚠️ No payment method found for account: ${depositAccount.name}`);
              }
            }
          } catch (bankError) {
            console.warn('Failed to create bank transaction:', bankError);
            // Don't fail the whole payment creation if bank transaction fails
          }
        }

        return paymentReceived;
      }, {
        timeout: 30000 // 30 seconds timeout (increased)
      });

      // Create accounting entries after main transaction (optional)
      try {
        await PaymentReceivedController.createAccountingEntriesAsync(payment.id, tenantId);
      } catch (accountingError) {
        console.warn('Accounting entries creation failed:', accountingError);
        // Don't fail the main operation if accounting fails
      }

      const fullPayment = await prisma.paymentReceived.findUnique({
        where: { id: payment.id },
        include: {
          customer: true,
          invoicePayments: {
            include: {
              invoice: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Payment received created successfully',
        data: fullPayment
      });
    } catch (error) {
      console.error('Error creating payment received:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment received',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * ✏️ UPDATE PAYMENT RECEIVED
   */
  static async updatePaymentReceived(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const data: PaymentReceivedRequest = req.body;

      // Check if payment exists
      const existingPayment = await prisma.paymentReceived.findFirst({
        where: { id, tenantId }
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      const payment = await prisma.$transaction(async (tx) => {
        // Update payment received record
        const updatedPayment = await tx.paymentReceived.update({
          where: { id },
          data: {
            customerId: data.customerId,
            customerName: data.customerName,
            amount: data.amount,
            paymentDate: new Date(data.paymentDate),
            paymentMode: data.paymentMode as any,
            depositType: data.depositType as any,
            bankCharges: data.bankCharges || null,
            referenceNumber: data.referenceNumber,
            taxDeducted: data.taxDeducted,
            taxAmount: data.taxAmount || null,
            notes: data.notes,
            internalNotes: data.internalNotes,
            sendThankYouEmail: data.sendThankYouEmail
          }
        });

        // Remove existing invoice allocations
        const existingAllocations = await tx.invoicePayment.findMany({
          where: { paymentReceivedId: id }
        });

        for (const allocation of existingAllocations) {
          await tx.invoice.update({
            where: { id: allocation.invoiceId },
            data: {
              paidAmount: {
                decrement: allocation.amountAllocated || 0
              }
            }
          });
        }

        await tx.invoicePayment.deleteMany({
          where: { paymentReceivedId: id }
        });

        // Create new invoice allocations
        if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
          await Promise.all(
            data.invoiceAllocations.map(allocation =>
              tx.invoicePayment.create({
                data: {
                  tenantId,
                  invoiceId: allocation.invoiceId,
                  paymentReceivedId: id,
                  amount: allocation.amountAllocated,
                  amountAllocated: allocation.amountAllocated
                }
              })
            )
          );

          // Update invoice paid amounts
          for (const allocation of data.invoiceAllocations) {
            await tx.invoice.update({
              where: { id: allocation.invoiceId },
              data: {
                paidAmount: {
                  increment: allocation.amountAllocated
                }
              }
            });
          }
        }

        // Update accounting entries (delete old ones and create new ones)
        await tx.entry.deleteMany({
          where: { reference: id }
        });
        
        // Note: Accounting entries for payment updates should be handled separately
        // to avoid transaction timeouts

        return updatedPayment;
      });

      const fullPayment = await prisma.paymentReceived.findUnique({
        where: { id: payment.id },
        include: {
          customer: true,
          invoicePayments: {
            include: {
              invoice: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Payment received updated successfully',
        data: fullPayment
      });
    } catch (error) {
      console.error('Error updating payment received:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment received',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🗑️ DELETE PAYMENT RECEIVED
   */
  static async deletePaymentReceived(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const payment = await prisma.paymentReceived.findFirst({
        where: { id, tenantId },
        include: {
          invoicePayments: true
        }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      await prisma.$transaction(async (tx) => {
        // Reverse invoice paid amounts
        for (const allocation of payment.invoicePayments) {
          await tx.invoice.update({
            where: { id: allocation.invoiceId },
            data: {
              paidAmount: {
                decrement: allocation.amountAllocated || 0
              }
            }
          });
        }

        // Delete invoice allocations
        await tx.invoicePayment.deleteMany({
          where: { paymentReceivedId: id }
        });

        // Delete journal entries
        await tx.entry.deleteMany({
          where: { reference: id }
        });

        // Delete payment received
        await tx.paymentReceived.delete({
          where: { id }
        });
      });

      res.json({
        success: true,
        message: 'Payment received deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment received:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment received',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 GET UNPAID INVOICES FOR CUSTOMER
   */
  static async getUnpaidInvoices(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      console.log(`🔍 Fetching unpaid invoices for customer: ${customerId}`);
      console.log(`🔍 Using tenantId: ${tenantId}`);

      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          customerId,
          status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] }
        },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          currency: true,
          status: true
        },
        orderBy: { dueDate: 'asc' }
      });

      console.log(`🔍 Raw invoices found: ${invoices.length}`);
      console.log('🔍 Invoice details:', invoices.map(inv => ({
        number: inv.invoiceNumber,
        status: inv.status,
        total: inv.totalAmount.toString(),
        paid: inv.paidAmount.toString()
      })));

      // Calculate amounts due
      const unpaidInvoices = invoices.map(invoice => {
        const amountDue = invoice.totalAmount.minus(invoice.paidAmount);
        return {
          ...invoice,
          totalAmount: parseFloat(invoice.totalAmount.toString()),
          paidAmount: parseFloat(invoice.paidAmount.toString()),
          amountDue: parseFloat(amountDue.toString()),
          isOverdue: new Date(invoice.dueDate) < new Date()
        };
      }).filter(invoice => invoice.amountDue > 0);

      console.log(`📋 Found ${unpaidInvoices.length} unpaid invoices for customer ${customerId}`);
      
      res.json({
        success: true,
        data: unpaidInvoices
      });
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unpaid invoices',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔢 CREATE ACCOUNTING ENTRIES FOR PAYMENT RECEIVED (ASYNC)
   * Implements proper double-entry bookkeeping - runs after main transaction
   */
  private static async createAccountingEntriesAsync(paymentId: string, tenantId: string) {
    try {
      // Get payment with necessary data
      const payment = await prisma.paymentReceived.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      await PaymentReceivedController.createAccountingEntries(prisma, payment, tenantId);
    } catch (error) {
      console.error('Error creating accounting entries async:', error);
      throw error;
    }
  }

  /**
   * 🔢 CREATE ACCOUNTING ENTRIES FOR PAYMENT RECEIVED
   * Implements proper double-entry bookkeeping
   */
  private static async createAccountingEntries(tx: any, payment: any, tenantId: string) {
    try {
      // Get default book
      const book = await tx.book.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
      });

      if (!book) {
        throw new Error('No accounting book found for tenant');
      }

      const journalId = `PMTR-${payment.paymentNumber}`;

      // Determine cash/bank account based on deposit type
      let cashAccountCode = '1000'; // Default to Cash
      
      // Handle both legacy enum values and new bank account IDs
      if (payment.depositType && payment.depositType.length > 20) {
        // This is a bank account ID, get the specific account mapping
        const bankAccount = await tx.paymentMethod.findFirst({
          where: { id: payment.depositType, tenantId }
        });
        
        if (bankAccount) {
          // Map different bank account types to appropriate GL accounts
          switch (bankAccount.type) {
            case 'bank_transfer':
            case 'bank_account':
              cashAccountCode = '1111'; // Bank Account
              break;
            case 'cash':
              cashAccountCode = '1112'; // Cash Account
              break;
            case 'petty_cash':
              cashAccountCode = '1112'; // Petty Cash
              break;
            default:
              cashAccountCode = '1111'; // Default to Bank Account
              break;
          }
        } else {
          cashAccountCode = '1111'; // Default bank account
        }
      } else {
        // Legacy enum values with proper account mapping
        switch (payment.depositType) {
          case 'BANK_DEPOSIT':
            cashAccountCode = '1111'; // Bank Account
            break;
          case 'PETTY_CASH':
            cashAccountCode = '1112'; // Petty Cash
            break;
          case 'UNDEPOSITED_FUNDS':
            cashAccountCode = '1115'; // Undeposited Funds
            break;
          case 'CASH_IN_HAND':
            cashAccountCode = '1112'; // Cash in Hand
            break;
          default:
            cashAccountCode = '1111'; // Default to Bank Account
            break;
        }
      }

      // Get or create accounts
      const [cashAccount, revenueAccount, taxAccount] = await Promise.all([
        tx.account.findFirst({
          where: { tenantId, code: cashAccountCode }
        }),
        tx.account.findFirst({
          where: { tenantId, code: '4000' } // Sales Revenue
        }),
        payment.taxDeducted ? tx.account.findFirst({
          where: { tenantId, code: '2300' } // Taxes Payable
        }) : null
      ]);

      if (!cashAccount || !revenueAccount) {
        throw new Error('Required accounts not found');
      }

      const entries = [];

      // Debit: Cash/Bank Account (increase asset)
      const netAmount = payment.amount - (payment.bankCharges || 0);
      entries.push({
        accountId: cashAccount.id,
        bookId: book.id,
        tenantId,
        amount: netAmount,
        currency: payment.currency,
        type: 'DEBIT',
        memo: `Payment received from ${payment.customerName || 'Customer'} - ${payment.paymentNumber}`,
        reference: payment.id,
        journalId,
        postedAt: payment.paymentDate
      });

      // Credit: Revenue Account (increase revenue)
      const revenueAmount = payment.taxDeducted 
        ? payment.amount - (payment.taxAmount || 0)
        : payment.amount;
      
      entries.push({
        accountId: revenueAccount.id,
        bookId: book.id,
        tenantId,
        amount: revenueAmount,
        currency: payment.currency,
        type: 'CREDIT',
        memo: `Revenue from payment ${payment.paymentNumber}`,
        reference: payment.id,
        journalId,
        postedAt: payment.paymentDate
      });

      // Credit: Tax Account (if tax deducted)
      if (payment.taxDeducted && payment.taxAmount > 0 && taxAccount) {
        entries.push({
          accountId: taxAccount.id,
          bookId: book.id,
          tenantId,
          amount: payment.taxAmount,
          currency: payment.currency,
          type: 'CREDIT',
          memo: `Tax deducted from payment ${payment.paymentNumber}`,
          reference: payment.id,
          journalId,
          postedAt: payment.paymentDate
        });
      }

      // Debit: Bank Charges (if applicable)
      if (payment.bankCharges && payment.bankCharges > 0) {
        const bankChargeAccount = await tx.account.findFirst({
          where: { tenantId, code: '6001' } // Bank Charges Expense
        });

        if (bankChargeAccount) {
          entries.push({
            accountId: bankChargeAccount.id,
            bookId: book.id,
            tenantId,
            amount: payment.bankCharges,
            currency: payment.currency,
            type: 'DEBIT',
            memo: `Bank charges for payment ${payment.paymentNumber}`,
            reference: payment.id,
            journalId,
            postedAt: payment.paymentDate
          });
        }
      }

      // Create all journal entries
      await Promise.all(entries.map(entry => tx.entry.create({ data: entry })));

      // Update account balances
      for (const entry of entries) {
        const account = await tx.account.findUnique({
          where: { id: entry.accountId }
        });

        if (account) {
          const balanceChange = entry.type === 'DEBIT' 
            ? (account.type === 'ASSET' || account.type === 'EXPENSE' ? entry.amount : -entry.amount)
            : (account.type === 'LIABILITY' || account.type === 'EQUITY' || account.type === 'REVENUE' ? entry.amount : -entry.amount);

          await tx.account.update({
            where: { id: entry.accountId },
            data: {
              balance: {
                increment: balanceChange
              }
            }
          });
        }
      }

    } catch (error) {
      console.error('Error creating accounting entries:', error);
      throw error;
    }
  }

  /**
   * 🏦 GET ELIGIBLE DEPOSIT ACCOUNTS
   * Returns accounts that can be used for "Deposit To" in payments
   */
  static async getDepositAccounts(req: Request, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      // Get accounts that are suitable for deposits: CASH, BANK, OTHER_CURRENT_ASSET, etc.
      const accounts = await prisma.account.findMany({
        where: {
          tenantId,
          isActive: true,
          type: {
            in: [
              'CASH',
              'BANK', 
              'OTHER_CURRENT_ASSET',
              'OTHER_ASSET',
              'PAYMENT_CLEARING_ACCOUNT'
            ]
          }
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          currency: true,
          balance: true,
          description: true
        },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' }
        ]
      });

      res.json({
        success: true,
        accounts
      });
    } catch (error) {
      console.error('Error fetching deposit accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deposit accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}