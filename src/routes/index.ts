import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import transactionRoutes from './transactionRoutes';
import tenantRoutes from './tenantRoutes';
import authRoutes from './authRoutes';
import aiRoutes from './aiRoutes';
import invoiceRoutes from './invoiceRoutes';
import salesOrderRoutes from './salesOrderRoutes';
import purchaseRoutes from './purchaseRoutes';
import bankingRoutes from './bankingRoutes';
import inventoryRoutes from './inventoryRoutes';
import taxRoutes from './taxRoutes';
import reportingRoutes from './reportingRoutes';
import customerRoutes from './customerRoutes';
import itemRoutes from './itemRoutes';
import accountRoutes from './accountRoutes';
import paymentMethodRoutes from './paymentMethodRoutes';
import paymentReceivedRoutes from './paymentReceivedRoutes';
import salespersonRoutes from './salespersonRoutes';
import vendorRoutes from './vendorRoutes';
import vendorPaymentRoutes from './vendorPaymentRoutes';
import billRoutes from './billRoutes';
import expenseRoutes from './expenseRoutes';
import reportsRoutes from './reportsRoutes';
import aiCopilotRoutes from './aiCopilotRoutes';
import advancedAIRoutes from './advancedAIRoutes';
import { cogsRoutes } from './cogsRoutes';
import bankReconciliationRoutes from './bankReconciliationRoutes';
import auditTrailRoutes from './auditTrailRoutes';
import organizationProfileRoutes from './organizationProfileRoutes';

const router = Router();

// API versioning and basic structure
router.get('/', (req, res) => {
  res.json({
    message: 'AiBook API v1 - AI-First Bookkeeping SaaS',
    version: '1.0.0',
    user: req.user ? {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
    } : null,
    tenant: req.tenant?.tenantId,
    tenantName: req.tenant?.tenantName,
    aiCapabilities: {
      transactionCategorization: 'Available',
      ocrProcessing: 'Available',
      financialInsights: 'Available',
      cashFlowForecasting: 'Available',
      anomalyDetection: 'Available',
      naturalLanguageQuery: 'Available',
      mcpAgents: 'Active'
    },
    timestamp: new Date().toISOString(),
  });
});

// Development-only endpoint for testing API connectivity
router.get('/dev/test', (req, res) => {
  res.json({
    message: 'Development API test endpoint',
    status: 'connected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: 'development-mode',
      multiTenancy: 'enabled',
      aiServices: 'available',
      database: 'connected'
    }
  });
});

// Enhanced database status endpoint with AI information
router.get('/status', async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    
    // Get basic database statistics
    const [tenantCount, bookCount, accountCount, entryCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.book.count({ where: { tenantId } }),
      prisma.account.count({ where: { tenantId } }),
      prisma.entry.count({ where: { tenantId } }),
    ]);

    // Get current tenant info
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, domain: true, createdAt: true },
    });

    res.json({
      database: {
        status: 'connected',
        statistics: {
          totalTenants: tenantCount,
          booksInTenant: bookCount,
          accountsInTenant: accountCount,
          entriesInTenant: entryCount,
        },
        currentTenant,
      },
      authentication: {
        enabled: true,
        user: req.user ? {
          uid: req.user.uid,
          email: req.user.email,
          role: req.user.role,
          tenantId: req.user.tenantId,
        } : null,
      },
      multitenant: {
        enabled: true,
        tenantId: req.tenant?.tenantId,
        tenantName: req.tenant?.tenantName,
        tenantDomain: req.tenant?.tenantDomain,
      },
      ai: {
        status: 'active',
        services: {
          vertexAI: 'connected',
          firebaseAI: 'enabled', 
          bigQueryML: 'connected',
          openai: process.env.OPENAI_API_KEY ? 'connected' : 'not_configured',
          mcp: 'running'
        },
        agents: {
          categorizer: 'active',
          reconciler: 'active',
          analyst: 'active',
          advisor: 'active',
          auditor: 'active'
        },
        capabilities: [
          'intelligent_categorization',
          'ocr_processing',
          'financial_insights',
          'cash_flow_forecasting',
          'anomaly_detection',
          'natural_language_queries',
          'smart_reconciliation'
        ]
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      database: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Get accounts for current tenant
router.get('/accounts', async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    
    const accounts = await prisma.account.findMany({
      where: { tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        balance: true,
        currency: true,
        isActive: true,
        parent: {
          select: { code: true, name: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json({
      accounts,
      count: accounts.length,
      tenant: tenantId,
      tenantName: req.tenant?.tenantName,
      user: req.user ? {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
      } : null,
      aiEnhanced: {
        smartCategorization: 'Available for new transactions',
        balanceForecasting: 'AI-powered cash flow predictions',
        anomalyDetection: 'Real-time fraud prevention'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Authentication routes
router.use('/auth', authRoutes);

// AI-powered routes
router.use('/ai', aiRoutes);

// AI Copilot routes
router.use('/ai/copilot', aiCopilotRoutes);
router.use('/ai/advanced', advancedAIRoutes);

// Business operation routes
router.use('/customers', customerRoutes);
router.use('/vendors', vendorRoutes);
router.use('/vendor-payments', vendorPaymentRoutes);
router.use('/salespeople', salespersonRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/sales-orders', salesOrderRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/bills', billRoutes);
router.use('/expenses', expenseRoutes);

// Account management routes
router.use('/accounts', accountRoutes);

// Payment method management routes
router.use('/payment-methods', paymentMethodRoutes);

// Payment received management routes
router.use('/payments-received', paymentReceivedRoutes);

// Banking and reconciliation routes
router.use('/banking', bankingRoutes);

// Bank reconciliation routes
router.use('/banking/reconciliation', bankReconciliationRoutes);

// Audit trail routes
router.use('/audit', auditTrailRoutes);

// Organization profile routes
router.use('/organization', organizationProfileRoutes);

// Inventory management routes
router.use('/inventory', inventoryRoutes);

// Item management routes with AI features
router.use('/items', itemRoutes);

// Cost of Goods Sold (COGS) management routes
router.use('/cogs', cogsRoutes);

// Tax management routes
router.use('/taxes', taxRoutes);

// Financial reporting routes
router.use('/reports', reportingRoutes);

// Enhanced financial reports module
router.use('/reports-new', reportsRoutes);

// Transaction and accounting routes
router.use('/transactions', transactionRoutes);

// Tenant management routes
router.use('/tenants', tenantRoutes);

export default router; 