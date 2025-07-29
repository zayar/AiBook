import { Request, Response } from 'express';
import prisma from '../utils/prismaWithTenant';

/**
 * 📊 LIST ALL ACCOUNTS
 * GET /api/v1/accounts
 * Returns accounts for dropdowns and selection
 */
export const listAccounts = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;

    // Get all active accounts
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' },
      ],
    });

    // Group accounts by type for easier UI handling
    const groupedAccounts = accounts.reduce((acc, account) => {
      const type = account.type || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    }, {} as Record<string, typeof accounts>);

    res.status(200).json({
      accounts,
      groupedAccounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 🔍 GET ACCOUNT BY ID
 * GET /api/v1/accounts/:id
 */
export const getAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { id } = req.params;

    const account = await prisma.account.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        entries: {
          take: 1, // Just to check if there are entries
        },
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
      });
    }

    res.status(200).json({ account });
  } catch (error) {
    console.error('❌ Error fetching account:', error);
    res.status(500).json({
      error: 'Failed to fetch account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 🏭 GET ACCOUNTS BY TYPE
 * GET /api/v1/accounts/by-type/:type
 * Useful for specific account selections (Asset, Expense, etc.)
 */
export const getAccountsByType = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.tenant!;
    const { type } = req.params;

    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        type: type.toUpperCase() as any, // Type assertion for enum
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' },
      ],
    });

    res.status(200).json({
      accounts,
      type: type.toUpperCase(),
      total: accounts.length,
    });
  } catch (error) {
    console.error('❌ Error fetching accounts by type:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts by type',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}; 