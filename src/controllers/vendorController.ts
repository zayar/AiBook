import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, PaymentTerms } from '@prisma/client';
import prismaWithTenant from '../utils/prismaWithTenant';

// Helper function to handle null, empty strings, and undefined for optional string fields
const optionalString = () => z.union([
  z.string().min(1),
  z.literal(''),
  z.null(),
  z.undefined()
]).transform(val => val === '' || val === null ? undefined : val).optional();

// Helper function for optional email fields
const optionalEmail = () => z.union([
  z.string().email(),
  z.literal(''),
  z.null(),
  z.undefined()
]).transform(val => val === '' || val === null ? undefined : val).optional();

// Helper function for optional URL fields
const optionalUrl = () => z.union([
  z.string().url(),
  z.literal(''),
  z.null(),
  z.undefined()
]).transform(val => val === '' || val === null ? undefined : val).optional();

// Helper function for optional number fields
const optionalNumber = () => z.union([
  z.number(),
  z.literal(0),
  z.null(),
  z.undefined()
]).transform(val => val === 0 || val === null ? undefined : val).optional();

// Validation schemas
const addressSchema = z.object({
  attention: optionalString(),
  country: optionalString(),
  address: optionalString(),
  street2: optionalString(),
  city: optionalString(),
  state: optionalString(),
  zipCode: optionalString(),
  phone: optionalString(),
  fax: optionalString(),
}).optional();

const primaryContactSchema = z.object({
  salutation: optionalString(),
  firstName: optionalString(),
  lastName: optionalString(),
  workPhone: optionalString(),
  mobile: optionalString(),
}).optional();

const contactPersonSchema = z.object({
  salutation: optionalString(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: optionalEmail(),
  workPhone: optionalString(),
  mobile: z.union([z.string(), z.literal(''), z.null(), z.undefined()]).transform(val => val === '' || val === null ? undefined : val).optional(),
  department: z.union([z.string(), z.literal(''), z.null(), z.undefined()]).transform(val => val === '' || val === null ? undefined : val).optional(),
  designation: z.union([z.string(), z.literal(''), z.null(), z.undefined()]).transform(val => val === '' || val === null ? undefined : val).optional(),
  isPrimary: z.boolean().default(false),
});

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  displayName: optionalString(),
  email: optionalEmail(),
  phone: optionalString(),
  website: optionalUrl(),
  primaryContact: primaryContactSchema,
  companyId: optionalString(),
  taxRate: optionalString(),
  currency: z.string().default('MMK'),
  paymentTerms: z.nativeEnum(PaymentTerms).default('DUE_ON_RECEIPT'),
  openingBalance: optionalNumber(),
  enablePortal: z.boolean().default(false),
  portalLanguage: z.string().default('English'),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  taxId: optionalString(),
  remarks: optionalString(),
  contactPersons: z.array(contactPersonSchema).optional(),
});

const updateVendorSchema = vendorSchema.partial();

export class VendorController {
  // Get all vendors with filtering, search, and pagination
  static async getAllVendors(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const prisma = prismaWithTenant;
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const currency = req.query.currency as string;
      const paymentTerms = req.query.paymentTerms as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        tenantId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      if (currency) {
        where.currency = currency;
      }

      if (paymentTerms && Object.values(PaymentTerms).includes(paymentTerms as PaymentTerms)) {
        where.paymentTerms = paymentTerms;
      }

      // Get vendors with related data
      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { createdAt: 'desc' }
          ],
          include: {
            contactPersons: true,
            _count: {
              select: {
                bills: true,
                purchases: true,
              }
            }
          }
        }),
        prisma.vendor.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        vendors,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          search,
          status,
          currency,
          paymentTerms,
        }
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  }

  // Get vendor by ID
  static async getVendorById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;
      const prisma = prismaWithTenant;

      const vendor = await prisma.vendor.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          contactPersons: {
            orderBy: [
              { isPrimary: 'desc' },
              { firstName: 'asc' }
            ]
          },
          documents: {
            orderBy: { createdAt: 'desc' }
          },
          bills: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              billNumber: true,
              billDate: true,
              totalAmount: true,
              status: true,
              currency: true,
            }
          },
          purchases: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              purchaseNumber: true,
              purchaseDate: true,
              totalAmount: true,
              status: true,
              currency: true,
            }
          },
          _count: {
            select: {
              bills: true,
              purchases: true,
              contactPersons: true,
            }
          }
        }
      });

      if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      res.json({ vendor });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({ error: 'Failed to fetch vendor' });
    }
  }

  // Create new vendor
  static async createVendor(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = vendorSchema.parse(req.body);
      const prisma = prismaWithTenant;

      // Check if vendor with email already exists
      if (validatedData.email) {
        const existingVendor = await prisma.vendor.findFirst({
          where: {
            email: validatedData.email,
            tenantId,
          }
        });

        if (existingVendor) {
          res.status(400).json({ error: 'Vendor with this email already exists' });
          return;
        }
      }

      // Extract contact persons from validated data
      const { contactPersons, ...vendorData } = validatedData;

      // Create vendor with contact persons
      const vendor = await prisma.vendor.create({
        data: {
          ...vendorData,
          tenantId,
          contactPersons: contactPersons ? {
            create: contactPersons.map(cp => ({
              ...cp,
              tenantId,
            }))
          } : undefined,
        },
        include: {
          contactPersons: true,
        }
      });

      res.status(201).json({ vendor, message: 'Vendor created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }

      console.error('Error creating vendor:', error);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  }

  // Update vendor
  static async updateVendor(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;
      const validatedData = updateVendorSchema.parse(req.body);
      const prisma = prismaWithTenant;

      // Check if vendor exists
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          id,
          tenantId,
        }
      });

      if (!existingVendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      // Check email uniqueness if email is being updated
      if (validatedData.email && validatedData.email !== existingVendor.email) {
        const emailExists = await prisma.vendor.findFirst({
          where: {
            email: validatedData.email,
            tenantId,
            id: { not: id },
          }
        });

        if (emailExists) {
          res.status(400).json({ error: 'Vendor with this email already exists' });
          return;
        }
      }

      // Extract contact persons from validated data
      const { contactPersons, ...vendorData } = validatedData;

      // Update vendor
      const vendor = await prisma.vendor.update({
        where: { id },
        data: vendorData,
        include: {
          contactPersons: true,
        }
      });

      res.json({ vendor, message: 'Vendor updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }

      console.error('Error updating vendor:', error);
      res.status(500).json({ error: 'Failed to update vendor' });
    }
  }

  // Delete vendor (soft delete)
  static async deleteVendor(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;
      const prisma = prismaWithTenant;

      // Check if vendor exists
      const vendor = await prisma.vendor.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          _count: {
            select: {
              bills: true,
              purchases: true,
            }
          }
        }
      });

      if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      // Check if vendor has related records
      if (vendor._count.bills > 0 || vendor._count.purchases > 0) {
        // Soft delete - just mark as inactive
        await prisma.vendor.update({
          where: { id },
          data: { isActive: false }
        });
        res.json({ message: 'Vendor deactivated successfully' });
      } else {
        // Hard delete if no related records
        await prisma.vendor.delete({
          where: { id }
        });
        res.json({ message: 'Vendor deleted successfully' });
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ error: 'Failed to delete vendor' });
    }
  }

  // Toggle vendor status
  static async toggleVendorStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id } = req.params;
      const prisma = prismaWithTenant;

      const vendor = await prisma.vendor.findFirst({
        where: {
          id,
          tenantId,
        }
      });

      if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      const updatedVendor = await prisma.vendor.update({
        where: { id },
        data: { isActive: !vendor.isActive }
      });

      res.json({
        vendor: updatedVendor,
        message: `Vendor ${updatedVendor.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling vendor status:', error);
      res.status(500).json({ error: 'Failed to toggle vendor status' });
    }
  }

  // Get vendor statistics
  static async getVendorStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const prisma = prismaWithTenant;

      const [totalVendors, activeVendors, totalBills, totalPurchases, topVendors] = await Promise.all([
        prisma.vendor.count({ where: { tenantId } }),
        prisma.vendor.count({ where: { tenantId, isActive: true } }),
        prisma.bill.count({ where: { tenantId } }),
        prisma.purchase.count({ where: { tenantId } }),
        prisma.vendor.findMany({
          where: { tenantId, isActive: true },
          take: 5,
          include: {
            _count: {
              select: {
                bills: true,
                purchases: true,
              }
            }
          },
          orderBy: {
            bills: {
              _count: 'desc'
            }
          }
        })
      ]);

      const stats = {
        totalVendors,
        activeVendors,
        inactiveVendors: totalVendors - activeVendors,
        totalBills,
        totalPurchases,
        topVendors: topVendors.map((vendor: any) => ({
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          billsCount: vendor._count.bills,
          purchasesCount: vendor._count.purchases,
        }))
      };

      res.json({ stats });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
      res.status(500).json({ error: 'Failed to fetch vendor statistics' });
    }
  }

  // Manage contact persons
  static async addContactPerson(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id: vendorId } = req.params;
      const validatedData = contactPersonSchema.parse(req.body);
      const prisma = prismaWithTenant;

      // Check if vendor exists
      const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, tenantId }
      });

      if (!vendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }

      // If this is set as primary, update other contact persons
      if (validatedData.isPrimary) {
        await prisma.vendorContactPerson.updateMany({
          where: { vendorId, tenantId },
          data: { isPrimary: false }
        });
      }

      const contactPerson = await prisma.vendorContactPerson.create({
        data: {
          ...validatedData,
          vendorId,
          tenantId,
        }
      });

      res.status(201).json({ contactPerson, message: 'Contact person added successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }

      console.error('Error adding contact person:', error);
      res.status(500).json({ error: 'Failed to add contact person' });
    }
  }

  static async updateContactPerson(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id: vendorId, contactId } = req.params;
      const validatedData = contactPersonSchema.partial().parse(req.body);
      const prisma = prismaWithTenant;

      // Check if contact person exists
      const contactPerson = await prisma.vendorContactPerson.findFirst({
        where: { id: contactId, vendorId, tenantId }
      });

      if (!contactPerson) {
        res.status(404).json({ error: 'Contact person not found' });
        return;
      }

      // If this is set as primary, update other contact persons
      if (validatedData.isPrimary) {
        await prisma.vendorContactPerson.updateMany({
          where: { vendorId, tenantId, id: { not: contactId } },
          data: { isPrimary: false }
        });
      }

      const updatedContactPerson = await prisma.vendorContactPerson.update({
        where: { id: contactId },
        data: validatedData
      });

      res.json({ contactPerson: updatedContactPerson, message: 'Contact person updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
        return;
      }

      console.error('Error updating contact person:', error);
      res.status(500).json({ error: 'Failed to update contact person' });
    }
  }

  static async deleteContactPerson(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { id: vendorId, contactId } = req.params;
      const prisma = prismaWithTenant;

      // Check if contact person exists
      const contactPerson = await prisma.vendorContactPerson.findFirst({
        where: { id: contactId, vendorId, tenantId }
      });

      if (!contactPerson) {
        res.status(404).json({ error: 'Contact person not found' });
        return;
      }

      await prisma.vendorContactPerson.delete({
        where: { id: contactId }
      });

      res.json({ message: 'Contact person deleted successfully' });
    } catch (error) {
      console.error('Error deleting contact person:', error);
      res.status(500).json({ error: 'Failed to delete contact person' });
    }
  }
}