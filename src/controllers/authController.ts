import { Request, Response, NextFunction } from 'express';
import firebaseService from '../services/firebaseService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { UserRole } from '@/types';
import { AppError } from '@/middleware/errorHandler';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, tenantId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      // Validate tenant exists if provided
      if (tenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
        });

        if (!tenant) {
          return res.status(404).json({ 
            error: 'Invalid tenant ID' 
          });
        }
      }

      // Create user in Firebase
      const firebaseUid = await firebaseService.createUser(
        email, 
        password, 
        name || email.split('@')[0]
      );

      // Create user in database
      const dbUser = await prisma.user.create({
        data: {
          email,
          firebaseUid,
          name: name || email.split('@')[0],
          role: UserRole.USER,
          tenantId,
          isActive: true,
        },
      });

      // Set custom claims in Firebase
      await firebaseService.setCustomClaims(firebaseUid, {
        tenantId: dbUser.tenantId || undefined,
        role: dbUser.role,
        permissions: ['account:read', 'transaction:create', 'transaction:read'],
      });

      res.status(201).json({
        success: true,
        data: {
          uid: firebaseUid,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          tenantId: dbUser.tenantId,
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('email-already-exists')) {
        res.status(409).json({
          error: 'User with this email already exists',
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const dbUser = await prisma.user.findUnique({
        where: { firebaseUid: req.user.uid },
      });

      // Get tenant information separately if user has tenantId
      let tenantInfo = null;
      if (dbUser?.tenantId) {
        tenantInfo = await prisma.tenant.findUnique({
          where: { id: dbUser.tenantId },
          select: {
            id: true,
            name: true,
            domain: true,
          },
        });
      }

      if (!dbUser) {
        return res.status(404).json({ error: 'User not found in database' });
      }

      res.json({
        success: true,
        data: {
          uid: dbUser.firebaseUid,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          isActive: dbUser.isActive,
          createdAt: dbUser.createdAt,
          tenant: tenantInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { name, email } = req.body;
      const updates: any = {};

      if (name) updates.name = name;
      if (email) updates.email = email;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      // Update in database
      const updatedUser = await prisma.user.update({
        where: { firebaseUid: req.user.uid },
        data: updates,
      });

      // Update in Firebase if email changed
      if (email) {
        await firebaseService.updateUser(req.user.uid, { email });
      }

      res.json({
        success: true,
        data: {
          uid: updatedUser.firebaseUid,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign user to tenant (admin only)
   */
  static async assignToTenant(req: Request, res: Response, next: NextFunction) {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { userId, tenantId, role } = req.body;

      if (!userId || !tenantId) {
        return res.status(400).json({ 
          error: 'User ID and tenant ID are required' 
        });
      }

      // Validate tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          tenantId,
          ...(role && { role: role as UserRole }),
        },
      });

      // Update Firebase custom claims
      await firebaseService.setCustomClaims(updatedUser.firebaseUid, {
        tenantId,
        role: updatedUser.role,
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'User assigned to tenant successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List users in tenant (admin only)
   */
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { page = 1, limit = 10 } = req.query;
      const tenantId = req.user?.role === 'SUPER_ADMIN' 
        ? req.query.tenantId as string 
        : req.tenant?.tenantId;

      const whereClause = tenantId ? { tenantId } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            tenantId: true,
          },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        data: {
          users,
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

  /**
   * Update user role (admin only)
   */
  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { userId } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Prevent non-super-admins from creating super admins
      if (role === UserRole.SUPER_ADMIN && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ 
          error: 'Only super admins can assign super admin role' 
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      // Update Firebase custom claims
      await firebaseService.setCustomClaims(updatedUser.firebaseUid, {
        tenantId: updatedUser.tenantId || undefined,
        role: updatedUser.role,
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'User role updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate user (admin only)
   */
  static async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { userId } = req.params;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Disable user in Firebase
      await firebaseService.updateUser(updatedUser.firebaseUid, {
        disabled: true,
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate custom token for testing
   */
  static async generateTestToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ 
          error: 'Test tokens not available in production' 
        });
      }

      const { uid, tenantId, role } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
      }

      const customToken = await firebaseService.generateCustomToken(uid, {
        tenantId,
        role,
      });

      res.json({
        success: true,
        data: { customToken },
        message: 'Custom token generated for testing',
      });
    } catch (error) {
      next(error);
    }
  }
} 