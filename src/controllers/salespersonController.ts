import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createSalespersonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  commission: z.number().min(0).max(1).optional(), // Between 0 and 1 (0% to 100%)
  target: z.number().min(0).optional(),
  territory: z.string().optional(),
  manager: z.string().optional(),
  isActive: z.boolean().default(true)
});

const updateSalespersonSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  commission: z.number().min(0).max(1).optional(),
  target: z.number().min(0).optional(),
  territory: z.string().optional(),
  manager: z.string().optional(),
  isActive: z.boolean().optional()
});

export class SalespersonController {
  /**
   * 📋 GET ALL SALESPEOPLE
   * Get all salespeople with filtering and pagination
   */
  static async getSalespeople(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        status, 
        department,
        territory 
      } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      // Build where clause
      const where: any = { tenantId };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } },
          { position: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (status) {
        where.isActive = status === 'active';
      }

      if (department) {
        where.department = { contains: department as string, mode: 'insensitive' };
      }

      if (territory) {
        where.territory = { contains: territory as string, mode: 'insensitive' };
      }

      // Get salespeople with pagination
      const [salespeople, total] = await Promise.all([
        prisma.salesperson.findMany({
          where,
          skip,
          take,
          include: {
            _count: {
              select: {
                invoices: true,
                salesOrders: true
              }
            }
          },
          orderBy: [
            { isActive: 'desc' },
            { name: 'asc' }
          ]
        }),
        prisma.salesperson.count({ where })
      ]);

      // Calculate sales performance for each salesperson
      const enrichedSalespeople = await Promise.all(
        salespeople.map(async (salesperson) => {
          // Get current month sales
          const currentMonth = new Date();
          currentMonth.setDate(1);
          currentMonth.setHours(0, 0, 0, 0);

          const salesStats = await prisma.invoice.aggregate({
            where: {
              salespersonId: salesperson.id,
              tenantId,
              issueDate: { gte: currentMonth },
              status: { not: 'CANCELLED' }
            },
            _sum: { totalAmount: true },
            _count: true
          });

          return {
            ...salesperson,
            performance: {
              currentMonthSales: salesStats._sum.totalAmount || 0,
              currentMonthInvoices: salesStats._count,
                          targetProgress: salesperson.target 
              ? (parseFloat((salesStats._sum.totalAmount || 0).toString()) / parseFloat(salesperson.target.toString())) * 100 
              : null
            }
          };
        })
      );

      const pagination = {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take)
      };

      res.json({
        message: 'Salespeople retrieved successfully',
        salespeople: enrichedSalespeople,
        pagination
      });
    } catch (error) {
      console.error('Error fetching salespeople:', error);
      res.status(500).json({ error: 'Failed to fetch salespeople' });
    }
  }

  /**
   * 👤 GET SALESPERSON BY ID
   * Get a specific salesperson with detailed information
   */
  static async getSalespersonById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const salesperson = await prisma.salesperson.findFirst({
        where: { id, tenantId },
        include: {
          _count: {
            select: {
              invoices: true,
              salesOrders: true
            }
          }
        }
      });

      if (!salesperson) {
        res.status(404).json({ error: 'Salesperson not found' });
        return;
      }

      // Get detailed performance metrics
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const [monthlyStats, yearlyStats, recentInvoices] = await Promise.all([
        // Current month stats
        prisma.invoice.aggregate({
          where: {
            salespersonId: id,
            tenantId,
            issueDate: { gte: currentMonth },
            status: { not: 'CANCELLED' }
          },
          _sum: { totalAmount: true },
          _count: true
        }),
        // Current year stats
        prisma.invoice.aggregate({
          where: {
            salespersonId: id,
            tenantId,
            issueDate: { gte: new Date(currentYear, 0, 1) },
            status: { not: 'CANCELLED' }
          },
          _sum: { totalAmount: true },
          _count: true
        }),
        // Recent invoices
        prisma.invoice.findMany({
          where: {
            salespersonId: id,
            tenantId
          },
          include: {
            customer: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      const enrichedSalesperson = {
        ...salesperson,
        performance: {
          currentMonth: {
            sales: monthlyStats._sum.totalAmount || 0,
            invoices: monthlyStats._count,
            targetProgress: salesperson.target 
              ? (parseFloat((monthlyStats._sum.totalAmount || 0).toString()) / parseFloat(salesperson.target.toString())) * 100 
              : null
          },
          currentYear: {
            sales: yearlyStats._sum.totalAmount || 0,
            invoices: yearlyStats._count
          }
        },
        recentInvoices
      };

      res.json({
        message: 'Salesperson retrieved successfully',
        salesperson: enrichedSalesperson
      });
    } catch (error) {
      console.error('Error fetching salesperson:', error);
      res.status(500).json({ error: 'Failed to fetch salesperson' });
    }
  }

  /**
   * ➕ CREATE SALESPERSON
   * Create a new salesperson
   */
  static async createSalesperson(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = createSalespersonSchema.parse(req.body);

      // Check if email already exists (if provided)
      if (validatedData.email) {
        const existingSalesperson = await prisma.salesperson.findFirst({
          where: {
            tenantId,
            email: validatedData.email
          }
        });

        if (existingSalesperson) {
          res.status(409).json({ error: 'A salesperson with this email already exists' });
          return;
        }
      }

      const salesperson = await prisma.salesperson.create({
        data: {
          ...validatedData,
          tenantId
        },
        include: {
          _count: {
            select: {
              invoices: true,
              salesOrders: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Salesperson created successfully',
        salesperson
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
        return;
      }
      console.error('Error creating salesperson:', error);
      res.status(500).json({ error: 'Failed to create salesperson' });
    }
  }

  /**
   * 🔄 UPDATE SALESPERSON
   * Update an existing salesperson
   */
  static async updateSalesperson(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = updateSalespersonSchema.parse(req.body);

      // Check if salesperson exists
      const existingSalesperson = await prisma.salesperson.findFirst({
        where: { id, tenantId }
      });

      if (!existingSalesperson) {
        res.status(404).json({ error: 'Salesperson not found' });
        return;
      }

      // Check if email already exists (if being updated)
      if (validatedData.email && validatedData.email !== existingSalesperson.email) {
        const duplicateEmail = await prisma.salesperson.findFirst({
          where: {
            tenantId,
            email: validatedData.email,
            id: { not: id }
          }
        });

        if (duplicateEmail) {
          res.status(409).json({ error: 'A salesperson with this email already exists' });
          return;
        }
      }

      const updatedSalesperson = await prisma.salesperson.update({
        where: { id },
        data: validatedData,
        include: {
          _count: {
            select: {
              invoices: true,
              salesOrders: true
            }
          }
        }
      });

      res.json({
        message: 'Salesperson updated successfully',
        salesperson: updatedSalesperson
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
        return;
      }
      console.error('Error updating salesperson:', error);
      res.status(500).json({ error: 'Failed to update salesperson' });
    }
  }

  /**
   * 🗑️ DELETE SALESPERSON
   * Delete or deactivate a salesperson
   */
  static async deleteSalesperson(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Check if salesperson exists
      const existingSalesperson = await prisma.salesperson.findFirst({
        where: { id, tenantId }
      });

      if (!existingSalesperson) {
        res.status(404).json({ error: 'Salesperson not found' });
        return;
      }

      // Check if salesperson has associated invoices or sales orders
      const [invoiceCount, salesOrderCount] = await Promise.all([
        prisma.invoice.count({ where: { salespersonId: id } }),
        prisma.salesOrder.count({ where: { salespersonId: id } })
      ]);

      if (invoiceCount > 0 || salesOrderCount > 0) {
        // Soft delete (deactivate) if has associated records
        await prisma.salesperson.update({
          where: { id },
          data: { isActive: false }
        });

        res.json({
          message: 'Salesperson deactivated due to existing associations',
          action: 'deactivated',
          associations: { invoices: invoiceCount, salesOrders: salesOrderCount }
        });
      } else {
        // Hard delete if no associations
        await prisma.salesperson.delete({
          where: { id }
        });

        res.json({
          message: 'Salesperson deleted successfully',
          action: 'deleted'
        });
      }
    } catch (error) {
      console.error('Error deleting salesperson:', error);
      res.status(500).json({ error: 'Failed to delete salesperson' });
    }
  }

  /**
   * 🔄 TOGGLE SALESPERSON STATUS
   * Toggle a salesperson between active and inactive
   */
  static async toggleSalespersonStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Check if salesperson exists
      const existingSalesperson = await prisma.salesperson.findFirst({
        where: { id, tenantId }
      });

      if (!existingSalesperson) {
        res.status(404).json({ error: 'Salesperson not found' });
        return;
      }

      // Toggle status
      const updatedSalesperson = await prisma.salesperson.update({
        where: { id },
        data: { isActive: !existingSalesperson.isActive },
        include: {
          _count: {
            select: {
              invoices: true,
              salesOrders: true
            }
          }
        }
      });

      res.json({
        message: `Salesperson ${updatedSalesperson.isActive ? 'activated' : 'deactivated'} successfully`,
        salesperson: updatedSalesperson
      });
    } catch (error) {
      console.error('Error toggling salesperson status:', error);
      res.status(500).json({ error: 'Failed to toggle salesperson status' });
    }
  }

  /**
   * 📊 GET SALESPERSON PERFORMANCE
   * Get detailed performance metrics for a salesperson
   */
  static async getSalespersonPerformance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      const { id } = req.params;
      const { year = new Date().getFullYear(), month } = req.query;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Check if salesperson exists
      const salesperson = await prisma.salesperson.findFirst({
        where: { id, tenantId }
      });

      if (!salesperson) {
        res.status(404).json({ error: 'Salesperson not found' });
        return;
      }

      const yearNum = parseInt(year as string);
      const monthNum = month ? parseInt(month as string) : null;

      // Build date range
      const startDate = monthNum 
        ? new Date(yearNum, monthNum - 1, 1)
        : new Date(yearNum, 0, 1);
      
      const endDate = monthNum
        ? new Date(yearNum, monthNum, 0, 23, 59, 59)
        : new Date(yearNum, 11, 31, 23, 59, 59);

      // Get performance data
      const [salesStats, invoices, salesOrders] = await Promise.all([
        // Aggregate stats
        prisma.invoice.aggregate({
          where: {
            salespersonId: id,
            tenantId,
            issueDate: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' }
          },
          _sum: { totalAmount: true, paidAmount: true },
          _count: true
        }),
        // Detailed invoices
        prisma.invoice.findMany({
          where: {
            salespersonId: id,
            tenantId,
            issueDate: { gte: startDate, lte: endDate }
          },
          include: {
            customer: { select: { name: true } }
          },
          orderBy: { issueDate: 'desc' }
        }),
        // Sales orders
        prisma.salesOrder.findMany({
          where: {
            salespersonId: id,
            tenantId,
            orderDate: { gte: startDate, lte: endDate }
          },
          include: {
            customer: { select: { name: true } }
          },
          orderBy: { orderDate: 'desc' }
        })
      ]);

      const performance = {
        period: { startDate, endDate, year: yearNum, month: monthNum },
        summary: {
          totalSales: salesStats._sum.totalAmount || 0,
          totalPaid: salesStats._sum.paidAmount || 0,
          totalInvoices: salesStats._count,
          totalSalesOrders: salesOrders.length,
          averageInvoiceAmount: salesStats._count > 0 
            ? parseFloat((salesStats._sum.totalAmount || 0).toString()) / salesStats._count 
            : 0,
          collectionRate: salesStats._sum.totalAmount 
            ? (parseFloat((salesStats._sum.paidAmount || 0).toString()) / parseFloat(salesStats._sum.totalAmount.toString())) * 100
            : 0
        },
        target: {
          amount: salesperson.target,
          achieved: salesStats._sum.totalAmount || 0,
          progress: salesperson.target 
            ? (parseFloat((salesStats._sum.totalAmount || 0).toString()) / parseFloat(salesperson.target.toString())) * 100 
            : null
        },
        invoices,
        salesOrders
      };

      res.json({
        message: 'Salesperson performance retrieved successfully',
        salesperson: {
          id: salesperson.id,
          name: salesperson.name,
          position: salesperson.position,
          department: salesperson.department
        },
        performance
      });
    } catch (error) {
      console.error('Error fetching salesperson performance:', error);
      res.status(500).json({ error: 'Failed to fetch salesperson performance' });
    }
  }
}

export default SalespersonController;