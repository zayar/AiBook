import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '@/types';
import { AppError } from './errorHandler';

// Extend Express Request type to include tenant context and user
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      user?: {
        uid: string;
        email?: string;
        name?: string;
        tenantId?: string;
        role?: string;
        permissions?: string[];
      };
    }
  }
}

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract tenant ID from various sources
    let tenantId: string | undefined;

    // 1. Check for tenant ID in header
    tenantId = req.headers['x-tenant-id'] as string;

    // 2. Check for tenant ID in subdomain
    if (!tenantId && req.hostname) {
      const subdomain = req.hostname.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenantId = subdomain;
      }
    }

    // 3. Check for tenant ID in user context (from Firebase auth)
    if (!tenantId && req.user?.tenantId) {
      tenantId = req.user.tenantId;
    }

    // 4. Use default tenant for development
    if (!tenantId && process.env.NODE_ENV === 'development') {
      tenantId = process.env.DEFAULT_TENANT_ID || 'default';
    }

    if (!tenantId) {
      throw new AppError('Tenant ID is required', 400);
    }

    // Set tenant context
    req.tenant = {
      tenantId,
      userId: req.user?.uid,
      role: req.user?.role as any,
    };

    next();
  } catch (error) {
    next(error);
  }
}; 