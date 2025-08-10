import { Request, Response, NextFunction } from 'express';
import firebaseService from '../services/firebaseService';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
import { UserRole } from '@/types';
import { AppError } from '@/middleware/errorHandler';


export class AuthController {
  /**
   * Username/password login (App login)
   */
  static async passwordLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const [scheme, iterationsStr, digest, salt, hash] = user.passwordHash.split('$');
      if (scheme !== 'pbkdf2') return res.status(401).json({ error: 'Invalid credentials' });
      const iterations = parseInt(iterationsStr, 10);
      const check = crypto.pbkdf2Sync(password, salt, iterations, hash.length / 2, digest).toString('hex');
      const ok = crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      // Issue a simple session token (JWT)
      const token = jwt.sign(
        { 
          adminId: user.id,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        },
        process.env.JWT_SECRET || 'fallback-secret'
      );

      res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, role: user.role, mustChange: user.passwordMustChange } });
    } catch (error) {
      next(error);
    }
  }

  /** Change password for logged-in user */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword: string };
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

      const user = await prisma.user.findUnique({ where: { firebaseUid: req.user.uid } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.passwordHash) {
        if (!currentPassword && !user.passwordMustChange) {
          return res.status(400).json({ error: 'Current password required' });
        }
        if (currentPassword && !user.passwordMustChange) {
          const [scheme, iterationsStr, digest, salt, hash] = user.passwordHash.split('$');
          const iterations = parseInt(iterationsStr, 10);
          const check = require('crypto').pbkdf2Sync(currentPassword, salt, iterations, hash.length / 2, digest).toString('hex');
          const ok = require('crypto').timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
          if (!ok) return res.status(401).json({ error: 'Invalid current password' });
        }
      }

      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const iterations = 120000;
      const keylen = 32;
      const digest = 'sha256';
      const derived = crypto.pbkdf2Sync(newPassword, salt, iterations, keylen, digest).toString('hex');
      const passwordHash = `pbkdf2$${iterations}$${digest}$${salt}$${derived}`;

      await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordMustChange: false } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /** Set password using app login token (first-login flow) */
  static async setPasswordWithToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPassword } = req.body as { newPassword: string };
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!token) return res.status(401).json({ error: 'Authorization required' });

      // Verify JWT token (not the super admin HMAC token)
      let payload: any;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (!payload || typeof payload === 'string' || !payload.adminId) return res.status(401).json({ error: 'Invalid token' });
      const userId = payload.adminId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const salt = crypto.randomBytes(16).toString('hex');
      const iterations = 120000;
      const keylen = 32;
      const digest = 'sha256';
      const derived = crypto.pbkdf2Sync(newPassword, salt, iterations, keylen, digest).toString('hex');
      const passwordHash = `pbkdf2$${iterations}$${digest}$${salt}$${derived}`;

      await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordMustChange: false } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

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