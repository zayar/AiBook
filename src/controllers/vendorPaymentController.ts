import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const CreateVendorPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  amount: z.number().positive('Amount must be positive'),
  bankCharges: z.number().default(0),
  paymentDate: z.string().optional(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'OTHER']).default('CASH'),
  paidThroughId: z.string().optional(), // Keep for backward compatibility
  paidThroughAccountId: z.string().optional(), // NEW: Chart of Accounts integration
  referenceNumber: z.string().optional(),
  taxDeducted: z.boolean().default(false),
  taxAmount: z.number().default(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  billPayments: z.array(z.object({
    billId: z.string(),
    amount: z.number().positive()
  })).optional(),
  branch: z.string().optional(),
}).refine(data => data.paidThroughId || data.paidThroughAccountId, {
  message: "Either paidThroughId or paidThroughAccountId must be provided",
  path: ["paidThroughAccountId"]
});

const UpdateVendorPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  bankCharges: z.number().default(0).optional(),
  paymentDate: z.string().optional(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'OTHER']).optional(),
  paidThroughId: z.string().optional(),
  paidThroughAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  taxDeducted: z.boolean().optional(),
  taxAmount: z.number().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  billPayments: z.array(z.object({
    billId: z.string(),
    amount: z.number().positive()
  })).optional(),
  branch: z.string().optional(),
});

const VendorPaymentListSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  vendorId: z.string().optional(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'OTHER']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['paymentDate', 'amount', 'paymentNumber', 'createdAt']).optional().default('paymentDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * 💰 LIST ALL VENDOR PAYMENTS WITH ADVANCED FILTERING
 * GET /api/v1/vendor-payments
 * Returns vendor payments with pagination, search, and filtering
 */
export const listVendorPayments = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    
    const query = VendorPaymentListSchema.parse(req.query);
    const { page, limit, search, vendorId, paymentMode, startDate, endDate, sortBy, sortOrder } = query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
      ...(vendorId && { vendorId }),
      ...(paymentMode && { paymentMode }),
      ...(startDate && endDate && {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }),
      ...(search && {
        OR: [
          { paymentNumber: { contains: search } },
          { referenceNumber: { contains: search } },
          { notes: { contains: search } },
          { vendor: { name: { contains: search } } },
        ]
      })
    };

    // Get vendor payments with relations
    const [vendorPayments, total] = await Promise.all([
      prisma.vendorPayment.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true, displayName: true }
          },
          paidThrough: {
            select: { id: true, accountNumber: true, name: true, type: true }
          },
          paidThroughAccount: {
            select: { id: true, code: true, name: true, type: true }
          },
          billPayments: {
            include: {
              bill: {
                select: { id: true, billNumber: true, totalAmount: true }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.vendorPayment.count({ where }),
    ]);

    // Calculate summary statistics
    const stats = await prisma.vendorPayment.aggregate({
      where: { tenantId },
      _sum: {
        amount: true,
        bankCharges: true,
        taxAmount: true,
      },
      _count: {
        _all: true,
      },
    });

    // Payment mode breakdown
    const paymentModeBreakdown = await prisma.vendorPayment.groupBy({
      by: ['paymentMode'],
      where: { tenantId },
      _count: { _all: true },
      _sum: { amount: true },
    });

    res.json({
      vendorPayments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalPayments: stats._count._all,
        totalAmount: stats._sum.amount || 0,
        totalBankCharges: stats._sum.bankCharges || 0,
        totalTaxAmount: stats._sum.taxAmount || 0,
        paymentModeBreakdown: paymentModeBreakdown.map(item => ({
          paymentMode: item.paymentMode,
          count: item._count._all,
          totalAmount: item._sum.amount || 0
        }))
      }
    });
  } catch (error) {
    console.error('Error listing vendor payments:', error);
    res.status(500).json({ error: 'Failed to list vendor payments' });
  }
};

/**
 * 📄 GET VENDOR PAYMENT BY ID WITH FULL DETAILS
 * GET /api/v1/vendor-payments/:id
 * Returns vendor payment with journal entries and full details
 */
export const getVendorPayment = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const vendorPayment = await prisma.vendorPayment.findFirst({
      where: { id, tenantId },
      include: {
        vendor: {
          select: { id: true, name: true, displayName: true, email: true, phone: true }
        },
        paidThrough: {
          select: { id: true, accountNumber: true, name: true, type: true }
        },
        billPayments: {
          include: {
            bill: {
              select: { 
                id: true, 
                billNumber: true, 
                totalAmount: true, 
                paidAmount: true,
                billDate: true,
                dueDate: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!vendorPayment) {
      return res.status(404).json({ error: 'Vendor payment not found' });
    }

    // Get journal entries
    let journalEntries = null;
    if (vendorPayment.journalId) {
      journalEntries = await prisma.entry.findMany({
        where: {
          journalId: vendorPayment.journalId,
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
      vendorPayment,
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
    console.error('Error getting vendor payment:', error);
    res.status(500).json({ error: 'Failed to get vendor payment' });
  }
};

/**
 * ➕ CREATE NEW VENDOR PAYMENT WITH DOUBLE ENTRY
 * POST /api/v1/vendor-payments
 * Creates vendor payment with proper journal entries and bill allocation
 */
export const createVendorPayment = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    
    const validatedData = CreateVendorPaymentSchema.parse(req.body);

    // Calculate net amount (amount + bank charges + tax)
    const netAmount = validatedData.amount + validatedData.bankCharges + validatedData.taxAmount;

    // Generate payment number
    const latestPayment = await prisma.vendorPayment.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { paymentNumber: true }
    });

    const paymentNumber = generatePaymentNumber(latestPayment?.paymentNumber);

    // Get default book
    const book = await prisma.book.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });

    if (!book) {
      return res.status(400).json({ error: 'No accounting book found' });
    }

    // Get vendor to check if we have an accounts payable account
    const vendor = await prisma.vendor.findFirst({
      where: { id: validatedData.vendorId, tenantId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Find Accounts Payable account (LIABILITY type)
    const accountsPayableAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        type: 'ACCOUNTS_PAYABLE',
        name: { contains: 'Accounts Payable' }
      }
    });

    if (!accountsPayableAccount) {
      return res.status(400).json({ error: 'Accounts Payable account not found. Please create one first.' });
    }

    // Start transaction for double-entry bookkeeping
    const journalId = `VP-${paymentNumber}-${Date.now()}`;
    
    const result = await prisma.$transaction(async (tx) => {
      // Resolve paid through references
      const paidThroughAccount = validatedData.paidThroughAccountId
        ? await tx.account.findFirst({
            where: { id: validatedData.paidThroughAccountId, tenantId },
          })
        : null;

      let paidThroughMethod = null as null | { id: string; name: string; type: string };
      if (validatedData.paidThroughId) {
        paidThroughMethod = await tx.paymentMethod.findFirst({
          where: { id: validatedData.paidThroughId, tenantId, isActive: true },
          select: { id: true, name: true, type: true },
        });
      }

      // Create vendor payment record (avoid FK violation by using resolved ids only)
      const vendorPayment = await tx.vendorPayment.create({
        data: {
          paymentNumber,
          vendorId: validatedData.vendorId,
          amount: validatedData.amount,
          bankCharges: validatedData.bankCharges,
          taxAmount: validatedData.taxAmount,
          paymentDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date(),
          paymentMode: validatedData.paymentMode,
          paidThroughId: paidThroughMethod?.id ?? null,
          paidThroughAccountId: paidThroughAccount?.id ?? null,
          referenceNumber: validatedData.referenceNumber,
          taxDeducted: validatedData.taxDeducted,
          notes: validatedData.notes,
          internalNotes: validatedData.internalNotes,
          branch: validatedData.branch || 'Head Office',
          journalId,
          tenantId,
          createdBy: req.user?.uid || 'system',
        }
      });

      // Create bill payment allocations if provided
      if (validatedData.billPayments && validatedData.billPayments.length > 0) {
        for (const billPayment of validatedData.billPayments) {
          await tx.billPayment.create({
            data: {
              billId: billPayment.billId,
              amount: billPayment.amount,
              paymentDate: vendorPayment.paymentDate,
              paymentMethod: validatedData.paymentMode,
              reference: vendorPayment.paymentNumber,
              notes: `Payment from ${vendorPayment.paymentNumber}`,
              vendorPaymentId: vendorPayment.id,
              tenantId,
            }
          });

          // Update bill paid amount and status
          // Get current bill to check total amount
          const bill = await tx.bill.findUnique({
            where: { id: billPayment.billId },
            select: { totalAmount: true, paidAmount: true }
          });

          if (bill) {
            const newPaidAmount = Number(bill.paidAmount) + billPayment.amount;
            const totalAmount = Number(bill.totalAmount);

            // Validate against overpayment (allow small rounding differences)
            if (newPaidAmount > totalAmount + 0.01) {
              throw new Error(`Payment amount would exceed bill total. Bill total: ${totalAmount}, Current paid: ${bill.paidAmount}, Payment: ${billPayment.amount}`);
            }

            // Determine new status based on payment
            let newStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' = 'PENDING'; // Default status
            if (Math.abs(newPaidAmount - totalAmount) <= 0.01) {
              newStatus = 'PAID';
            } else if (newPaidAmount > 0) {
              newStatus = 'PARTIALLY_PAID';
            }

            await tx.bill.update({
              where: { id: billPayment.billId },
              data: {
                paidAmount: {
                  increment: billPayment.amount
                },
                status: newStatus
              }
            });
          }
        }
      }

      // JOURNAL ENTRIES - Double Entry Bookkeeping
      // 1. Debit: Accounts Payable (LIABILITY) - reduces what we owe
      await tx.entry.create({
        data: {
          accountId: accountsPayableAccount.id,
          bookId: book.id,
          tenantId,
          amount: validatedData.amount,
          currency: 'MMK',
          exchangeRate: 1,
          type: 'DEBIT',
          memo: `Payment to ${vendor.name}`,
          reference: paymentNumber,
          journalId,
          postedAt: new Date()
        }
      });

      // 2. If bank charges, debit bank charges expense account
      if (validatedData.bankCharges > 0) {
        const bankChargesAccount = await tx.account.findFirst({
          where: {
            tenantId,
            type: 'EXPENSE',
            OR: [
              { name: { contains: 'Bank Charges' } },
              { name: { contains: 'Bank Fees' } },
              { code: '6500' } // Standard bank charges account code
            ]
          }
        });

        if (bankChargesAccount) {
          await tx.entry.create({
            data: {
              accountId: bankChargesAccount.id,
              bookId: book.id,
              tenantId,
              amount: validatedData.bankCharges,
              currency: 'MMK',
              exchangeRate: 1,
              type: 'DEBIT',
              memo: `Bank charges for payment to ${vendor.name}`,
              reference: paymentNumber,
              journalId,
              postedAt: new Date()
            }
          });
        }
      }

      // 3. If tax deducted, debit tax account
      if (validatedData.taxDeducted && validatedData.taxAmount > 0) {
        const taxAccount = await tx.account.findFirst({
          where: {
            tenantId,
            type: 'OTHER_ASSET',
            OR: [
              { name: { contains: 'Tax Deducted' } },
              { name: { contains: 'TDS' } },
              { code: '1300' } // Standard TDS account code
            ]
          }
        });

        if (taxAccount) {
          await tx.entry.create({
            data: {
              accountId: taxAccount.id,
              bookId: book.id,
              tenantId,
              amount: validatedData.taxAmount,
              currency: 'MMK',
              exchangeRate: 1,
              type: 'DEBIT',
              memo: `Tax deducted for payment to ${vendor.name}`,
              reference: paymentNumber,
              journalId,
              postedAt: new Date()
            }
          });
        }
      }

      // 4. Credit: Paid Through Account (ASSET) - reduces cash/bank balance
      // Prefer explicit Chart of Accounts account if provided
      let creditAccountId: string | null = null;
      if (paidThroughAccount) {
        creditAccountId = paidThroughAccount.id;
      } else if (paidThroughMethod) {
        // Map payment method to a default cash/bank account (fallback to code 1000)
        const fallbackAccount = await tx.account.findFirst({
          where: { tenantId, code: '1000' },
        });
        creditAccountId = fallbackAccount?.id || null;
      }

      if (!creditAccountId) {
        throw new Error('Unable to resolve paid through account. Please set up Chart of Accounts or select a deposit account.');
      }

      await tx.entry.create({
        data: {
          accountId: creditAccountId,
          bookId: book.id,
          tenantId,
          amount: netAmount,
          currency: 'MMK',
          exchangeRate: 1,
          type: 'CREDIT',
          memo: `Payment to ${vendor.name}`,
          reference: paymentNumber,
          journalId,
          postedAt: new Date()
        }
      });

      // Create bank transaction for outgoing payment
      try {
        // Resolve a PaymentMethod to attach the bank transaction to
        let resolvedPaymentMethodId: string | null = null;

        if (paidThroughMethod?.id) {
          resolvedPaymentMethodId = paidThroughMethod.id;
        } else if (paidThroughAccount) {
          // Try to find a matching PaymentMethod by name or by type mapping
          const byName = await tx.paymentMethod.findFirst({
            where: {
              tenantId,
              isActive: true,
              name: paidThroughAccount.name,
            },
            select: { id: true }
          });

          if (byName) {
            resolvedPaymentMethodId = byName.id;
          } else {
            // Type mapping from Account.type -> PaymentMethod.type
            const mappedType = paidThroughAccount.type === 'BANK'
              ? 'BANK_ACCOUNT'
              : paidThroughAccount.type === 'CASH'
                ? 'CASH'
                : undefined;

            if (mappedType) {
              const byType = await tx.paymentMethod.findFirst({
                where: { tenantId, isActive: true, type: mappedType },
                select: { id: true },
                orderBy: { createdAt: 'asc' }
              });
              if (byType) {
                resolvedPaymentMethodId = byType.id;
              }
            }
          }
        }

        if (resolvedPaymentMethodId) {
          // Create outgoing bank transaction (negative amount for withdrawals)
          await tx.bankTransaction.create({
            data: {
              tenantId,
              paymentMethodId: resolvedPaymentMethodId,
              description: `Payment to ${vendor.name} - ${paymentNumber}`,
              amount: -netAmount, // Negative amount for withdrawals
              type: 'WITHDRAWAL',
              transactionDate: new Date(validatedData.paymentDate || new Date()),
              reference: validatedData.referenceNumber,
              status: 'cleared',
              reconciled: false,
              runningBalance: 0, // Will be calculated by balance update logic
              debitAmount: netAmount,
              creditAmount: 0
            }
          });
        }
      } catch (bankError) {
        console.warn('Failed to create bank transaction:', bankError);
        // Don't fail the whole payment creation if bank transaction fails
      }

      return vendorPayment;
    }, {
      timeout: 30000,
    });

    // Fetch the created payment with full details
    const paymentWithDetails = await prisma.vendorPayment.findUnique({
      where: { id: result.id },
      include: {
        vendor: { select: { id: true, name: true, displayName: true } },
        paidThrough: { select: { id: true, accountNumber: true, name: true, type: true } },
        billPayments: {
          include: {
            bill: { select: { id: true, billNumber: true, totalAmount: true } }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Vendor payment created successfully',
      vendorPayment: paymentWithDetails
    });

  } catch (error: any) {
    console.error('Error creating vendor payment:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ error: 'Foreign key constraint failed', details: error?.meta });
    }
    res.status(500).json({ error: 'Failed to create vendor payment', details: error?.message || String(error) });
  }
};

/**
 * 🗑️ DELETE VENDOR PAYMENT (SOFT DELETE)
 * DELETE /api/v1/vendor-payments/:id
 * Soft deletes vendor payment and reverses journal entries
 */
export const deleteVendorPayment = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const vendorPayment = await prisma.vendorPayment.findFirst({
      where: { id, tenantId },
      include: {
        billPayments: true
      }
    });

    if (!vendorPayment) {
      return res.status(404).json({ error: 'Vendor payment not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Reverse bill payments
      for (const billPayment of vendorPayment.billPayments) {
        await tx.bill.update({
          where: { id: billPayment.billId },
          data: {
            paidAmount: {
              decrement: Number(billPayment.amount)
            }
          }
        });

        await tx.billPayment.delete({
          where: { id: billPayment.id }
        });
      }

      // Delete journal entries
      if (vendorPayment.journalId) {
        await tx.entry.deleteMany({
          where: { journalId: vendorPayment.journalId, tenantId }
        });
      }

      // Delete vendor payment
      await tx.vendorPayment.delete({
        where: { id }
      });
    });

    res.json({ message: 'Vendor payment deleted successfully' });

  } catch (error) {
    console.error('Error deleting vendor payment:', error);
    res.status(500).json({ error: 'Failed to delete vendor payment' });
  }
};

/**
 * 📊 GET VENDOR PAYMENT STATISTICS
 * GET /api/v1/vendor-payments/stats
 * Returns comprehensive vendor payment statistics
 */
export const getVendorPaymentStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;

    const [
      totalStats,
      paymentModeStats,
      monthlyStats,
      vendorStats
    ] = await Promise.all([
      // Total statistics
      prisma.vendorPayment.aggregate({
        where: { tenantId },
        _sum: { amount: true, bankCharges: true, taxAmount: true },
        _count: { _all: true },
        _avg: { amount: true }
      }),

      // Payment mode breakdown
      prisma.vendorPayment.groupBy({
        by: ['paymentMode'],
        where: { tenantId },
        _count: { _all: true },
        _sum: { amount: true }
      }),

      // Monthly trends (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(paymentDate, '%Y-%m') as month,
          COUNT(*) as count,
          SUM(amount) as total
        FROM vendor_payments 
        WHERE tenantId = ${tenantId} 
          AND paymentDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(paymentDate, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `,

      // Top vendors by payment amount
      prisma.vendorPayment.groupBy({
        by: ['vendorId'],
        where: { tenantId },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      })
    ]);

    // Get vendor details for top vendors
    const vendorIds = vendorStats.map(stat => stat.vendorId);
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true, displayName: true }
    });

    const topVendors = vendorStats.map(stat => {
      const vendor = vendors.find(v => v.id === stat.vendorId);
      return {
        vendor: vendor || { id: stat.vendorId, name: 'Unknown', displayName: 'Unknown' },
        count: stat._count._all,
        totalAmount: stat._sum.amount || 0
      };
    });

    res.json({
      totalStats: {
        totalPayments: totalStats._count._all,
        totalAmount: totalStats._sum.amount || 0,
        totalBankCharges: totalStats._sum.bankCharges || 0,
        totalTaxAmount: totalStats._sum.taxAmount || 0,
        averageAmount: totalStats._avg.amount || 0
      },
      paymentModeBreakdown: paymentModeStats.map(stat => ({
        paymentMode: stat.paymentMode,
        count: stat._count._all,
        totalAmount: stat._sum.amount || 0
      })),
      monthlyTrends: monthlyStats,
      topVendors
    });

  } catch (error) {
    console.error('Error getting vendor payment stats:', error);
    res.status(500).json({ error: 'Failed to get vendor payment statistics' });
  }
};

/**
 * 🆔 GET NEXT PAYMENT NUMBER
 * GET /api/v1/vendor-payments/next-number
 * Returns the next payment number
 */
export const getNextPaymentNumber = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;

    const latestPayment = await prisma.vendorPayment.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { paymentNumber: true }
    });

    const nextNumber = generatePaymentNumber(latestPayment?.paymentNumber);

    res.json({ paymentNumber: nextNumber });

  } catch (error) {
    console.error('Error getting next payment number:', error);
    res.status(500).json({ error: 'Failed to get next payment number' });
  }
};

/**
 * 📋 GET VENDOR PENDING BILLS
 * GET /api/v1/vendor-payments/vendor/:vendorId/pending-bills
 * Returns pending bills for a specific vendor
 */
export const getVendorPendingBills = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { vendorId } = req.params;

    const pendingBills = await prisma.bill.findMany({
      where: {
        vendorId,
        tenantId,
        status: { in: ['PENDING', 'APPROVED', 'PARTIALLY_PAID'] }
      },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        subtotal: true,
        taxAmount: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        currency: true
      },
      orderBy: { dueDate: 'asc' }
    });

    // Calculate remaining amounts
    const billsWithBalance = pendingBills.map(bill => ({
      ...bill,
      remainingAmount: Number(bill.totalAmount) - Number(bill.paidAmount || 0),
      isOverdue: new Date(bill.dueDate) < new Date(),
      daysPastDue: Math.max(0, Math.floor((new Date().getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
    }));

    const totalPending = billsWithBalance.reduce((sum, bill) => sum + bill.remainingAmount, 0);

    res.json({
      pendingBills: billsWithBalance,
      summary: {
        totalBills: billsWithBalance.length,
        totalPendingAmount: totalPending,
        overdueBills: billsWithBalance.filter(bill => bill.isOverdue).length,
        overdueAmount: billsWithBalance.filter(bill => bill.isOverdue).reduce((sum, bill) => sum + bill.remainingAmount, 0)
      }
    });

  } catch (error) {
    console.error('Error getting vendor pending bills:', error);
    res.status(500).json({ error: 'Failed to get vendor pending bills' });
  }
};

/**
 * 🏦 GET ELIGIBLE PAID THROUGH ACCOUNTS
 * Returns accounts that can be used for "Paid Through" in vendor payments
 */
export const getPaidThroughAccounts = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;

    // Get accounts that are suitable for payments: CASH, BANK, OTHER_CURRENT_LIABILITY, EQUITY
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        type: {
          in: [
            'CASH',
            'BANK', 
            'OTHER_CURRENT_LIABILITY',
            'OTHER_LIABILITY',
            'EQUITY',
            'OTHER_CURRENT_ASSET'
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
    console.error('Error fetching paid through accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch paid through accounts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to generate payment numbers
function generatePaymentNumber(lastNumber?: string): string {
  if (!lastNumber) {
    return '001';
  }
  
  const match = lastNumber.match(/(\d+)$/);
  if (match) {
    const num = parseInt(match[1]) + 1;
    return num.toString().padStart(3, '0');
  }
  
  return '001';
}