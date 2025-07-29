import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '@/types';
import { AppError } from './errorHandler';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// Create Prisma client function to ensure environment variables are read at runtime
function getPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
}

// Global type declarations for Express
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

// Enhanced tenant ID extractor function
function advancedTenantExtractor(req: Request): string | null {
  // 1. Check for tenant ID in Authorization header (JWT claims)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // In a real implementation, you would decode the JWT and extract tenant ID
      // For now, we'll simulate this
      const token = authHeader.substring(7);
      // This is a mock implementation - replace with actual JWT decoding
      if (token.includes('tenant-')) {
        const tenantId = token.split('tenant-')[1].split('-')[0];
        if (tenantId) return tenantId;
      }
    } catch (error) {
      console.warn('Failed to extract tenant from JWT:', error);
    }
  }

  // 2. Use tenant ID from authenticated user (Firebase custom claims)
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }

  // 3. Check for tenant ID in custom header
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return headerTenantId;
  }

  // 4. Check for tenant ID in subdomain
  if (req.hostname) {
    const subdomain = req.hostname.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
      return subdomain;
    }
  }

  // 5. Check for tenant ID in query parameters (for development/testing)
  const queryTenantId = req.query.tenantId as string;
  if (queryTenantId && process.env.NODE_ENV === 'development') {
    return queryTenantId;
  }

  // 6. Use default tenant for development
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEFAULT_TENANT_ID || 'default';
  }

  return null;
}

// Enhanced tenant validation middleware
export const enhancedTenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip tenant validation for certain paths
    const skipPaths = ['/health', '/api/v1/auth/register', '/api/v1/tenants/create'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const tenantId = advancedTenantExtractor(req);

    if (!tenantId) {
      throw new AppError('Tenant identification required', 400);
    }

    // Validate that the tenant exists in the database
    const prisma = getPrismaClient();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, domain: true, settings: true },
    });

    if (!tenant) {
      throw new AppError('Invalid tenant', 404);
    }

    // Check if user is authorized for this tenant
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      if (req.user.tenantId && req.user.tenantId !== tenantId) {
        throw new AppError('Unauthorized access to tenant', 403);
      }
    }

    // Set enhanced tenant context
    req.tenant = {
      tenantId: tenant.id,
      userId: req.user?.uid,
      role: req.user?.role as any,
      tenantName: tenant.name,
      tenantDomain: tenant.domain,
      tenantSettings: tenant.settings as any,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Store tenant context in async local storage for Prisma middleware
const tenantStorage = new AsyncLocalStorage<TenantContext>();

export const getTenantContext = (): TenantContext | undefined => {
  return tenantStorage.getStore();
};

export const withTenantContext = <T>(context: TenantContext, fn: () => T): T => {
  return tenantStorage.run(context, fn);
};

// Middleware to store tenant context in async local storage
export const tenantContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.tenant) {
    // Store tenant context in async local storage
    tenantStorage.run(req.tenant, () => {
      next();
    });
  } else {
    next();
  }
}; 