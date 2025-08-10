import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import crypto from 'crypto';
import { issueToken } from '../middleware/superAdminAuth';

const prisma = new PrismaClient();

function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const keylen = 32;
  const digest = 'sha256';
  const derived = crypto.pbkdf2Sync(password, usedSalt, iterations, keylen, digest).toString('hex');
  return `pbkdf2$${iterations}$${digest}$${usedSalt}$${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, iterationsStr, digest, salt, hash] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = parseInt(iterationsStr, 10);
    const check = crypto.pbkdf2Sync(password, salt, iterations, hash.length / 2, digest).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export class SuperAdminController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const admin = await prisma.systemAdmin.findUnique({ where: { email } });
      if (!admin || !admin.isActive || !verifyPassword(password, admin.passwordHash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      await prisma.systemAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
      const token = issueToken(admin.id);
      return res.json({ success: true, token, admin: { id: admin.id, email: admin.email, name: admin.name } });
    } catch (err) {
      next(err);
    }
  }

  static async listTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', q } = req.query as any;
      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const where: any = q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { domain: { contains: q, mode: 'insensitive' } }] }
        : {};
      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: parseInt(limit, 10),
          include: { _count: { select: { accounts: true, entries: true, books: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.tenant.count({ where }),
      ]);
      return res.json({ success: true, data: tenants, pagination: { total, page: Number(page), limit: Number(limit) } });
    } catch (err) {
      next(err);
    }
  }

  static async createTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, domain, settings, adminEmail, adminName } = req.body as any;
      if (!name) return res.status(400).json({ error: 'Tenant name is required' });

      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name, domain, settings: settings || {} },
        });
        const book = await tx.book.create({ data: { name: 'General Ledger', currency: 'USD', tenantId: tenant.id } });
        let adminUser: any = null;
        if (adminEmail) {
          adminUser = await tx.user.upsert({
            where: { email: adminEmail },
            update: { tenantId: tenant.id, role: UserRole.ADMIN, name: adminName || 'Tenant Admin' },
            create: {
              email: adminEmail,
              firebaseUid: `admin_${tenant.id}`,
              name: adminName || 'Tenant Admin',
              role: UserRole.ADMIN,
              tenantId: tenant.id,
            },
          });
        }
        return { tenant, book, adminUser };
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async listTenantUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params as any;
      const users = await prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
      return res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  static async upsertTenantAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params as any;
      const { email, name } = req.body as any;
      if (!email) return res.status(400).json({ error: 'Admin email is required' });
      const user = await prisma.user.upsert({
        where: { email },
        update: { tenantId, role: UserRole.ADMIN, name: name || undefined },
        create: {
          email,
          firebaseUid: `admin_${tenantId}`,
          name: name || 'Tenant Admin',
          role: UserRole.ADMIN,
          tenantId,
        },
      });
      return res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async setUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as any;
      const { password, mustChange = true } = req.body as { password: string; mustChange?: boolean };
      if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const salt = crypto.randomBytes(16).toString('hex');
      const iterations = 120000;
      const keylen = 32;
      const digest = 'sha256';
      const derived = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
      const passwordHash = `pbkdf2$${iterations}$${digest}$${salt}$${derived}`;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { passwordHash, passwordMustChange: mustChange },
      });
      return res.json({ success: true, data: { id: updated.id, email: updated.email, passwordMustChange: updated.passwordMustChange } });
    } catch (err) {
      next(err);
    }
  }
}

// Helper only used by seed script
export function hashSuperAdminPasswordForSeed(password: string): string {
  return hashPassword(password);
}


