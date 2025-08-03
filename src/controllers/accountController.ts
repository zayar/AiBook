import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prismaWithTenant';

// Validation schemas
const AccountCreateSchema = z.object({
  code: z.string().min(1, 'Account code is required').max(10, 'Account code too long'),
  name: z.string().min(1, 'Account name is required').max(100, 'Account name too long'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'], {
    errorMap: () => ({ message: 'Invalid account type' })
  }),
  currency: z.string().default('MMK'),
  parentId: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const AccountUpdateSchema = AccountCreateSchema.partial().omit({ code: true });

const AccountListSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  search: z.string().optional(),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']).optional(),
  isActive: z.string().optional().transform(val => val === undefined ? undefined : val === 'true'),
  includeHierarchy: z.string().optional().transform(val => val === 'true'),
  sortBy: z.enum(['code', 'name', 'type', 'balance', 'createdAt']).optional().default('code'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * 📊 LIST ALL ACCOUNTS WITH ADVANCED FILTERING
 * GET /api/v1/accounts
 * Returns accounts with pagination, search, and hierarchy support
 */
export const listAccounts = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    
    // Parse and validate query parameters
    const query = AccountListSchema.parse(req.query);
    const { page, limit, search, type, isActive, includeHierarchy, sortBy, sortOrder } = query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenantId,
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get accounts with enhanced data
    const [accounts, totalCount] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          parent: {
            select: { id: true, code: true, name: true, type: true }
          },
          children: includeHierarchy ? {
            select: { id: true, code: true, name: true, type: true, balance: true }
          } : false,
          _count: {
            select: { entries: true, children: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.account.count({ where }),
    ]);

    // Group accounts by type for easier UI handling
    const groupedAccounts = accounts.reduce((acc, account) => {
      const accountType = account.type || 'Other';
      if (!acc[accountType]) acc[accountType] = [];
      acc[accountType].push({
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balance: Number(account.balance),
        currency: account.currency,
        isActive: account.isActive,
        parent: account.parent,
        childrenCount: account._count.children,
        entriesCount: account._count.entries,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate summary statistics
    const summary = {
      totalAssets: accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + Number(a.balance), 0),
      totalLiabilities: accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + Number(a.balance), 0),
      totalEquity: accounts.filter(a => a.type === 'EQUITY').reduce((sum, a) => sum + Number(a.balance), 0),
      totalRevenue: accounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + Number(a.balance), 0),
      totalExpenses: accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + Number(a.balance), 0),
    };

    res.status(200).json({
      accounts: accounts.map(account => ({
        ...account,
        balance: Number(account.balance),
      })),
      groupedAccounts,
      summary,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }
    res.status(500).json({
      error: 'Failed to fetch accounts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 🔍 GET ACCOUNT BY ID WITH FULL DETAILS
 * GET /api/v1/accounts/:id
 * Returns account with hierarchy, recent entries, and statistics
 */
export const getAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const account = await prisma.account.findFirst({
      where: { id, tenantId },
      include: {
        parent: {
          select: { id: true, code: true, name: true, type: true }
        },
        children: {
          select: { id: true, code: true, name: true, type: true, balance: true, isActive: true },
          orderBy: { code: 'asc' }
        },
        entries: {
          take: 10,
          orderBy: { postedAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            memo: true,
            reference: true,
            postedAt: true,
            journalId: true,
          }
        },
        _count: {
          select: { entries: true, children: true }
        }
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Calculate account statistics
    const stats = await prisma.entry.aggregate({
      where: { accountId: id, tenantId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      }
    });

    // Get recent activity summary
    const recentActivity = await prisma.entry.groupBy({
      by: ['type'],
      where: { 
        accountId: id, 
        tenantId,
        postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    res.status(200).json({
      account: {
        ...account,
        balance: Number(account.balance),
      },
      statistics: {
        totalEntries: stats._count.id || 0,
        totalAmount: Number(stats._sum.amount || 0),
        childrenCount: account._count.children,
        hasEntries: account._count.entries > 0,
      },
      recentActivity: recentActivity.map(activity => ({
        type: activity.type,
        totalAmount: Number(activity._sum.amount || 0),
        count: activity._count.id,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching account:', error);
    res.status(500).json({
      error: 'Failed to fetch account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * ➕ CREATE NEW ACCOUNT
 * POST /api/v1/accounts
 * Creates a new account with ALE compliance validation
 */
export const createAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    
    // Validate input
    const validationResult = AccountCreateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Check if account code already exists
    const existingAccount = await prisma.account.findFirst({
      where: { code: data.code, tenantId },
    });

    if (existingAccount) {
      return res.status(400).json({
        error: 'Account code already exists',
        code: data.code,
      });
    }

    // Validate parent account if specified
    if (data.parentId) {
      const parentAccount = await prisma.account.findFirst({
        where: { id: data.parentId, tenantId },
      });

      if (!parentAccount) {
        return res.status(400).json({
          error: 'Parent account not found',
        });
      }

      // Ensure parent and child are of compatible types
      if (parentAccount.type !== data.type) {
        return res.status(400).json({
          error: 'Parent and child accounts must be of the same type',
          parentType: parentAccount.type,
          childType: data.type,
        });
      }
    }

    // Get the default book for this tenant
    const book = await prisma.book.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (!book) {
      return res.status(400).json({
        error: 'No accounting book found for tenant',
      });
    }

    // Create the account
    const account = await prisma.account.create({
      data: {
        ...data,
        bookId: book.id,
        tenantId,
      },
      include: {
        parent: {
          select: { id: true, code: true, name: true, type: true }
        },
      },
    });

    res.status(201).json({
      account: {
        ...account,
        balance: Number(account.balance),
      },
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('❌ Error creating account:', error);
    res.status(500).json({
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * ✏️ UPDATE ACCOUNT
 * PUT /api/v1/accounts/:id
 * Updates account with validation and ALE compliance
 */
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    // Validate input
    const validationResult = AccountUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Check if account exists
    const existingAccount = await prisma.account.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { entries: true } }
      },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Validate parent account if being changed
    if (data.parentId && data.parentId !== existingAccount.parentId) {
      const parentAccount = await prisma.account.findFirst({
        where: { id: data.parentId, tenantId },
      });

      if (!parentAccount) {
        return res.status(400).json({
          error: 'Parent account not found',
        });
      }

      // Prevent circular references
      if (data.parentId === id) {
        return res.status(400).json({
          error: 'Account cannot be its own parent',
        });
      }

      // Check if setting this parent would create a circular reference
      let checkParent = parentAccount;
      while (checkParent.parentId) {
        if (checkParent.parentId === id) {
          return res.status(400).json({
            error: 'Circular reference detected in account hierarchy',
          });
        }
        const nextParent = await prisma.account.findFirst({
          where: { id: checkParent.parentId, tenantId },
        });
        if (!nextParent) break;
        checkParent = nextParent;
      }

      // Ensure type compatibility
      const newType = data.type || existingAccount.type;
      if (parentAccount.type !== newType) {
        return res.status(400).json({
          error: 'Parent and child accounts must be of the same type',
        });
      }
    }

    // Don't allow type changes if account has entries (ALE compliance)
    if (data.type && data.type !== existingAccount.type && existingAccount._count.entries > 0) {
      return res.status(400).json({
        error: 'Cannot change account type when account has journal entries',
        entriesCount: existingAccount._count.entries,
      });
    }

    // Update the account
    const updatedAccount = await prisma.account.update({
      where: { id },
      data,
      include: {
        parent: {
          select: { id: true, code: true, name: true, type: true }
        },
        children: {
          select: { id: true, code: true, name: true, type: true, balance: true }
        },
      },
    });

    res.status(200).json({
      account: {
        ...updatedAccount,
        balance: Number(updatedAccount.balance),
      },
      message: 'Account updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating account:', error);
    res.status(500).json({
      error: 'Failed to update account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 🗑️ DELETE ACCOUNT
 * DELETE /api/v1/accounts/:id
 * Soft delete with ALE compliance validation
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    // Check if account exists and get details
    const account = await prisma.account.findFirst({
      where: { id, tenantId },
      include: {
        _count: { 
          select: { 
            entries: true, 
            children: true,
            bankAccounts: true,
            inventoryAssets: true,
            inventoryCOGS: true,
          } 
        }
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // ALE Compliance: Check if account can be deleted
    const blockers = [];
    if (account._count.entries > 0) {
      blockers.push(`${account._count.entries} journal entries`);
    }
    if (account._count.children > 0) {
      blockers.push(`${account._count.children} child accounts`);
    }
    if (account._count.bankAccounts > 0) {
      blockers.push(`${account._count.bankAccounts} bank accounts`);
    }
    if (account._count.inventoryAssets > 0) {
      blockers.push(`${account._count.inventoryAssets} inventory items (asset account)`);
    }
    if (account._count.inventoryCOGS > 0) {
      blockers.push(`${account._count.inventoryCOGS} inventory items (COGS account)`);
    }

    if (blockers.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete account due to existing references',
        blockers,
        suggestion: 'Consider deactivating the account instead of deleting it',
      });
    }

    // Soft delete by deactivating
    const deactivatedAccount = await prisma.account.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      message: 'Account deactivated successfully',
      account: {
        ...deactivatedAccount,
        balance: Number(deactivatedAccount.balance),
      },
    });
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 🏭 GET ACCOUNTS BY TYPE (Enhanced)
 * GET /api/v1/accounts/by-type/:type
 * Returns accounts filtered by type with balance information
 */
export const getAccountsByType = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { type } = req.params;

    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        type: type.toUpperCase() as any,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        balance: true,
        currency: true,
        description: true,
        parent: {
          select: { id: true, code: true, name: true }
        },
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });

    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

    res.status(200).json({
      accounts: accounts.map(account => ({
        ...account,
        balance: Number(account.balance),
      })),
      type: type.toUpperCase(),
      total: accounts.length,
      totalBalance,
    });
  } catch (error) {
    console.error('❌ Error fetching accounts by type:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts by type',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 🌳 GET ACCOUNT HIERARCHY
 * GET /api/v1/accounts/hierarchy
 * Returns accounts in hierarchical tree structure
 */
export const getAccountHierarchy = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { type } = req.query;

    const where: any = {
      tenantId,
      isActive: true,
      ...(type && { type: (type as string).toUpperCase() }),
    };

    // Get all accounts
    const accounts = await prisma.account.findMany({
      where,
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Build hierarchy (only root accounts)
    const rootAccounts = accounts
      .filter(account => !account.parentId)
      .map(account => ({
        ...account,
        balance: Number(account.balance),
        children: account.children.map(child => ({
          ...child,
          balance: Number(child.balance),
          children: child.children.map(grandchild => ({
            ...grandchild,
            balance: Number(grandchild.balance),
          })),
        })),
      }));

    res.status(200).json({
      hierarchy: rootAccounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error('❌ Error fetching account hierarchy:', error);
    res.status(500).json({
      error: 'Failed to fetch account hierarchy',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}; 