import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prismaWithTenant';

// Validation schemas
const createPaymentMethodSchema = z.object({
  name: z.string().min(1, 'Payment method name is required'),
  type: z.enum(['cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'digital_wallet', 'cryptocurrency', 'other']),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
});

const updatePaymentMethodSchema = createPaymentMethodSchema.partial();

// Get all payment methods for a tenant
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { active = 'true' } = req.query;
    const isActive = active === 'true';

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        tenantId,
        ...(active !== 'all' && { isActive })
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json({
      paymentMethods,
      total: paymentMethods.length
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

// Get a single payment method
export const getPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, tenantId }
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json(paymentMethod);
  } catch (error) {
    console.error('Error fetching payment method:', error);
    res.status(500).json({ error: 'Failed to fetch payment method' });
  }
};

// Create a new payment method
export const createPaymentMethod = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const validatedData = createPaymentMethodSchema.parse(req.body);

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        ...validatedData,
        tenantId
      }
    });

    res.status(201).json(paymentMethod);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error creating payment method:', error);
    res.status(500).json({ error: 'Failed to create payment method' });
  }
};

// Update a payment method
export const updatePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const validatedData = updatePaymentMethodSchema.parse(req.body);

    // Check if payment method exists
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, tenantId }
    });

    if (!existingPaymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: validatedData
    });

    res.json(paymentMethod);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
};

// Delete a payment method (soft delete)
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Check if payment method exists
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, tenantId }
    });

    if (!existingPaymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Check if payment method is used in any payments
    const paymentCount = await prisma.invoicePayment.count({
      where: { paymentMethod: id }
    });

    if (paymentCount > 0) {
      // Soft delete - just mark as inactive
      await prisma.paymentMethod.update({
        where: { id },
        data: { isActive: false }
      });
      
      res.json({ 
        message: 'Payment method deactivated (has associated payments)',
        deactivated: true
      });
    } else {
      // Hard delete if no payments are associated
      await prisma.paymentMethod.delete({
        where: { id }
      });
      
      res.json({ 
        message: 'Payment method deleted successfully',
        deleted: true
      });
    }
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
};

// Set payment method as default
export const setDefaultPaymentMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Check if payment method exists
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, tenantId }
    });

    if (!existingPaymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Unset all defaults and set this one as default
    await prisma.$transaction([
      prisma.paymentMethod.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false }
      }),
      prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);

    res.json({ message: 'Default payment method updated successfully' });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
}; 