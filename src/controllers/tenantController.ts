import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { AccountingService } from '@/services/accountingService';
import { UserRole } from '@/types';

export class TenantController {
  /**
   * Get current tenant information
   */
  static async getCurrentTenant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenant.tenantId },
        include: {
          books: {
            select: {
              id: true,
              name: true,
              currency: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              accounts: true,
              entries: true,
            },
          },
        },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new tenant (admin only)
   */
  static async createTenant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Check if user has admin privileges
      if (req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { name, domain, settings, adminEmail, adminName } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Tenant name is required' });
      }

      // Create tenant with default book and admin user
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name,
            domain,
            settings: settings || {
              baseCurrency: 'USD',
              fiscalYearStart: '01-01',
              timezone: 'UTC',
            },
          },
        });

        // Create default book
        const book = await tx.book.create({
          data: {
            name: 'General Ledger',
            currency: settings?.baseCurrency || 'USD',
            tenantId: tenant.id,
          },
        });

        // Create admin user if provided
        let adminUser = null;
        if (adminEmail) {
          adminUser = await tx.user.create({
            data: {
              email: adminEmail,
              firebaseUid: `admin_${tenant.id}`,
              name: adminName || 'Tenant Administrator',
              role: UserRole.ADMIN,
              tenantId: tenant.id,
            },
          });
        }

        // Create standard chart of accounts using our accounting service
        // We'll create a temporary tenant context for this
        const tempTenantContext = { tenantId: tenant.id };
        const accountingService = new AccountingService(tempTenantContext);

        // Create basic account structure
        const accounts = [
          { code: '1000', name: 'Assets', type: 'ASSET' as const },
          { code: '1100', name: 'Current Assets', type: 'ASSET' as const },
          { code: '1111', name: 'Checking Account', type: 'ASSET' as const },
          { code: '2000', name: 'Liabilities', type: 'LIABILITY' as const },
          { code: '3000', name: 'Equity', type: 'EQUITY' as const },
          { code: '3100', name: 'Owner Equity', type: 'EQUITY' as const },
          { code: '4000', name: 'Revenue', type: 'REVENUE' as const },
          { code: '5000', name: 'Expenses', type: 'EXPENSE' as const },
        ];

        for (const accountData of accounts) {
          await tx.account.create({
            data: {
              code: accountData.code,
              name: accountData.name,
              type: accountData.type,
              bookId: book.id,
              tenantId: tenant.id,
            },
          });
        }

        return { tenant, book, adminUser };
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Tenant created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant settings
   */
  static async updateTenant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      // Check if user has admin privileges for this tenant
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { name, domain, settings } = req.body;

      const updatedTenant = await prisma.tenant.update({
        where: { id: req.tenant.tenantId },
        data: {
          ...(name && { name }),
          ...(domain && { domain }),
          ...(settings && { settings }),
        },
      });

      res.json({
        success: true,
        data: updatedTenant,
        message: 'Tenant updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant statistics and metrics
   */
  static async getTenantStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.tenant) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const tenantId = req.tenant.tenantId;

      // Get comprehensive tenant statistics
      const [
        tenantInfo,
        accountCount,
        entryCount,
        bookCount,
        userCount,
        recentEntries,
      ] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, domain: true, createdAt: true },
        }),
        prisma.account.count({ where: { tenantId } }),
        prisma.entry.count({ where: { tenantId } }),
        prisma.book.count({ where: { tenantId } }),
        prisma.user.count({ where: { tenantId } }),
        prisma.entry.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            account: {
              select: { code: true, name: true },
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          tenant: tenantInfo,
          statistics: {
            totalAccounts: accountCount,
            totalEntries: entryCount,
            totalBooks: bookCount,
            totalUsers: userCount,
          },
          recentActivity: recentEntries.map(entry => ({
            id: entry.id,
            amount: parseFloat(entry.amount.toString()),
            type: entry.type,
            account: entry.account,
            memo: entry.memo,
            createdAt: entry.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all tenants (super admin only)
   */
  static async listTenants(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Only super admins can list all tenants
      if (req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          skip,
          take: Number(limit),
          include: {
            _count: {
              select: {
                accounts: true,
                entries: true,
                books: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.tenant.count(),
      ]);

      res.json({
        success: true,
        data: {
          tenants,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
} 