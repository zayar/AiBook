import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { enhancedTenantMiddleware, tenantContextMiddleware } from './middleware/enhancedTenantMiddleware';
import { authMiddleware } from './middleware/authMiddleware';
import apiRoutes from './routes';

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

// Apply authentication, then enhanced tenant middleware, then tenant context storage
app.use('/api/v1', authMiddleware, enhancedTenantMiddleware, tenantContextMiddleware, apiRoutes);

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
app.listen(PORT, () => {
  console.log(`🚀 AiBook server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏢 Multi-tenancy: Enhanced mode enabled`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app; 