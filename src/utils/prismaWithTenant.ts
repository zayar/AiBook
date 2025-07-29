import { PrismaClient, Prisma } from '@prisma/client';
import { getTenantContext } from '@/middleware/enhancedTenantMiddleware';

// Models that should have tenant filtering
const TENANT_MODELS = [
  'tenant',
  'book', 
  'account',
  'entry',
  'user',
  'transactionCategory'
];

// Custom tenant-aware Prisma middleware
function tenantMiddleware(params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>): Promise<any> {
  const tenantContext = getTenantContext();
  
  // Skip if no tenant context or if this is a tenant model query for tenant validation
  if (!tenantContext || params.model === 'Tenant') {
    return next(params);
  }

  // Only apply to models that have tenantId
  if (!TENANT_MODELS.includes(params.model?.toLowerCase() || '')) {
    return next(params);
  }

  // Skip if explicitly ignored
  if (params.args?.ignoreMultitenancy) {
    delete params.args.ignoreMultitenancy;
    return next(params);
  }

  const tenantId = tenantContext.tenantId;

  // Add tenant filter to where clauses
  if (params.action === 'findFirst' || 
      params.action === 'findMany' || 
      params.action === 'findUnique' || 
      params.action === 'count' ||
      params.action === 'aggregate' ||
      params.action === 'groupBy') {
    
    params.args = params.args || {};
    params.args.where = params.args.where || {};
    
    // Add tenantId to where clause if not already present
    if (!params.args.where.tenantId) {
      params.args.where.tenantId = tenantId;
    }
  }

  // Add tenant to create operations
  if (params.action === 'create') {
    params.args = params.args || {};
    params.args.data = params.args.data || {};
    
    // Add tenantId to create data if not already present
    if (!params.args.data.tenantId) {
      params.args.data.tenantId = tenantId;
    }
  }

  // Add tenant to createMany operations
  if (params.action === 'createMany') {
    params.args = params.args || {};
    
    if (Array.isArray(params.args.data)) {
      params.args.data = params.args.data.map((item: any) => ({
        ...item,
        tenantId: item.tenantId || tenantId
      }));
    } else if (params.args.data) {
      params.args.data.tenantId = params.args.data.tenantId || tenantId;
    }
  }

  // Add tenant filter to update operations
  if (params.action === 'update' || 
      params.action === 'updateMany' ||
      params.action === 'delete' ||
      params.action === 'deleteMany' ||
      params.action === 'upsert') {
    
    params.args = params.args || {};
    params.args.where = params.args.where || {};
    
    // Add tenantId to where clause if not already present
    if (!params.args.where.tenantId) {
      params.args.where.tenantId = tenantId;
    }
  }

  return next(params);
}

// Create enhanced Prisma client with multi-tenancy support
const createPrismaWithTenant = () => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Add our custom tenant middleware
  prisma.$use(tenantMiddleware);

  return prisma;
};

// Global Prisma instance with tenant filtering
declare global {
  // eslint-disable-next-line no-var
  var tenantAwarePrisma: PrismaClient | undefined;
}

const tenantAwarePrisma = globalThis.tenantAwarePrisma || createPrismaWithTenant();

if (process.env.NODE_ENV !== 'production') {
  globalThis.tenantAwarePrisma = tenantAwarePrisma;
}

export default tenantAwarePrisma; 