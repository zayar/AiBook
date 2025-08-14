import { Request, Response, NextFunction } from 'express';
import { FirebaseService } from '../services/firebaseService';

const firebaseService = FirebaseService.getInstance();
import { AppError } from './errorHandler';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip authentication for public paths
    const publicPaths = ['/health', '/api/v1/auth/register', '/api/v1/dev/test'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Initialize Firebase if not already done
    if (!firebaseService.isInitialized()) {
      const initialized = await firebaseService.initialize();
      if (!initialized) {
        console.warn('⚠️ Firebase not initialized, running in development mode');
        
        // Development mode: create mock user with full permissions
        if (process.env.NODE_ENV === 'development') {
          req.user = {
            uid: 'dev-user-123',
            email: 'dev@example.com',
            tenantId: process.env.DEFAULT_TENANT_ID || 'default',
            role: 'ADMIN',
                       permissions: [
             'tenant:create', 'tenant:update', 'tenant:delete', 'tenant:list',
             'user:create', 'user:update', 'user:delete',
             'account:create', 'account:update', 'account:delete', 'account:read',
             'transaction:create', 'transaction:update', 'transaction:delete', 'transaction:read',
             'payment:create', 'payment:update', 'payment:delete', 'payment:read',
             'invoice:create', 'invoice:update', 'invoice:delete', 'invoice:read',
             'customer:create', 'customer:update', 'customer:delete', 'customer:read',
             'item:create', 'item:update', 'item:delete', 'item:read',
             'expense:create', 'expense:update', 'expense:delete', 'expense:read', 'expense:approve',
             'bill:create', 'bill:update', 'bill:delete', 'bill:read',
             'vendor:create', 'vendor:update', 'vendor:delete', 'vendor:read',
             'vendor-payment:create', 'vendor-payment:update', 'vendor-payment:delete', 'vendor-payment:read'
           ]
          };
          return next();
        }
        
        throw new AppError('Authentication service unavailable', 503);
      }
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    // Development mode fallback with full permissions (auto-detect dev mode)
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isDevelopment) {
        console.log('🔧 Development mode: Auto-authenticating request');
        req.user = {
          uid: 'dev-user-123',
          email: 'dev@example.com',
          tenantId: 'default-tenant',
          role: 'ADMIN',
          permissions: [
            'tenant:create', 'tenant:update', 'tenant:delete', 'tenant:list',
            'user:create', 'user:update', 'user:delete',
            'account:create', 'account:update', 'account:delete', 'account:read',
            'transaction:create', 'transaction:update', 'transaction:delete', 'transaction:read',
            'payment:create', 'payment:update', 'payment:delete', 'payment:read',
            'invoice:create', 'invoice:update', 'invoice:delete', 'invoice:read',
            'customer:create', 'customer:update', 'customer:delete', 'customer:read',
            'item:create', 'item:update', 'item:delete', 'item:read',
            'expense:create', 'expense:update', 'expense:delete', 'expense:read', 'expense:approve',
            'bill:create', 'bill:update', 'bill:delete', 'bill:read',
            'vendor:create', 'vendor:update', 'vendor:delete', 'vendor:read',
            'vendor-payment:create', 'vendor-payment:update', 'vendor-payment:delete', 'vendor-payment:read'
          ]
        };
        return next();
      }
      
      throw new AppError('Authorization token required', 401);
    }

    const token = authHeader.substring(7);

    // Verify the Firebase ID token
    try {
      const decodedToken = await firebaseService.verifyIdToken(token);
      if (!decodedToken) {
        throw new Error('Token verification returned null');
      }
      
      // Sync user with database and get updated info
      const dbUser = await firebaseService.syncUserWithDatabase(decodedToken);

      // Set user context
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || dbUser.email,
        tenantId: decodedToken.tenantId || dbUser.tenantId,
        role: decodedToken.role || dbUser.role,
        name: decodedToken.name || dbUser.name,
        permissions: decodedToken.permissions || [],
      };

      return next();
    } catch (tokenError) {
      console.warn('Token verification failed:', tokenError);
      
      // In development mode, fall back to development user instead of throwing error
      if (isDevelopment) {
        console.log('🔧 Development mode: Using fallback auth due to invalid token');
        req.user = {
          uid: 'dev-user-123',
          email: 'dev@example.com',
          tenantId: process.env.DEFAULT_TENANT_ID || 'default',
          role: 'ADMIN',
          permissions: [
            'tenant:create', 'tenant:update', 'tenant:delete', 'tenant:list',
            'user:create', 'user:update', 'user:delete',
            'account:create', 'account:update', 'account:delete', 'account:read',
            'transaction:create', 'transaction:update', 'transaction:delete', 'transaction:read',
            'payment:create', 'payment:update', 'payment:delete', 'payment:read',
            'invoice:create', 'invoice:update', 'invoice:delete', 'invoice:read',
            'customer:create', 'customer:update', 'customer:delete', 'customer:read',
            'item:create', 'item:update', 'item:delete', 'item:read',
            'expense:create', 'expense:update', 'expense:delete', 'expense:read', 'expense:approve',
            'bill:create', 'bill:update', 'bill:delete', 'bill:read',
            'vendor:create', 'vendor:update', 'vendor:delete', 'vendor:read',
            'vendor-payment:create', 'vendor-payment:update', 'vendor-payment:delete', 'vendor-payment:read'
          ]
        };
        return next();
      }
      
      throw new AppError('Invalid or expired token', 401);
    }
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      console.error('Authentication error:', error);
      next(new AppError('Authentication failed', 401));
    }
  }
};

// Middleware to check specific permissions
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required: ${permission}` 
      });
    }

    next();
  };
};

// Middleware to require specific roles
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role || '')) {
      return res.status(403).json({ 
        error: `Insufficient role. Required: ${roles.join(' or ')}` 
      });
    }

    next();
  };
}; 