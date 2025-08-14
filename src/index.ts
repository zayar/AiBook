import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { enhancedTenantMiddleware, tenantContextMiddleware } from './middleware/enhancedTenantMiddleware';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { authMiddleware } from './middleware/authMiddleware';
import apiRoutes from './routes';
import superAdminRoutes from './routes/superAdminRoutes';
import { financialEventIntegration } from './services/financialEventIntegration';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and logging middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Tenant-ID',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (before authentication)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    multiTenancy: {
      enabled: true,
      defaultTenant: process.env.DEFAULT_TENANT_ID || 'default',
    },
  });
});

// Super admin routes (outside tenant middleware)
app.use('/superadmin', superAdminRoutes);

// Apply tenant middleware, then tenant context storage, then auth middleware
app.use('/api/v1', tenantMiddleware, tenantContextMiddleware, authMiddleware, apiRoutes);

// Simple dev route to expose items/org quickly without headers if needed
if (process.env.NODE_ENV === 'development') {
  app.get('/api/v1/dev/ping', (req, res) => {
    res.json({ ok: true, tenant: req.tenant?.tenantId || process.env.DEFAULT_TENANT_ID || 'default' });
  });
}

// Development test endpoint (completely separate from API routes)
app.get('/dev/test', (req, res) => {
  res.json({
    message: 'Development API test endpoint',
    status: 'connected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: 'development-mode',
      multiTenancy: 'enabled',
      aiServices: 'available',
      database: 'development-mode'
    }
  });
});

// Simple organization test endpoint
app.get('/dev/organization', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: 'default' }
    });
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: tenant,
      message: 'Direct organization test'
    });
  } catch (error) {
    console.error('Direct organization test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Cashflow Copilot server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏢 Multi-tenancy: Enhanced mode enabled`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  // 🚀 Initialize streaming infrastructure
  try {
    await financialEventIntegration.initialize();
    console.log('✅ Financial event streaming initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize streaming (continuing without streaming):', (error as Error).message);
  }
});

export default app; 