import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EnhancedFinancialCopilot } from '../ai/services/EnhancedFinancialCopilot';
import { FinancialEventProcessor } from '../ai/events/FinancialEventProcessor';
import { AIOrchestrator } from '../ai/orchestration/AIOrchestrator';
import { FinancialAutomationEngine } from '../ai/automation/FinancialAutomationEngine';
import { enhancedTenantMiddleware } from '../middleware/enhancedTenantMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Initialize AI services
const aiOrchestrator = new AIOrchestrator();
const copilot = new EnhancedFinancialCopilot();
const eventProcessor = new FinancialEventProcessor();
const automationEngine = new FinancialAutomationEngine();

/**
 * 💬 AI CHAT ENDPOINT
 * Natural language business intelligence queries
 */
router.post('/chat', enhancedTenantMiddleware, async (req, res) => {
  try {
    const { query, userId } = req.body;
    const tenantId = req.tenant?.tenantId;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const response = await copilot.handleBusinessQuery(tenantId, query, userId);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📊 BUSINESS INSIGHTS ENDPOINT
 * Get AI-generated business insights
 */
router.get('/insights', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { timeframe, categories, priority } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const request = {
      tenantId,
      timeframe: timeframe ? JSON.parse(timeframe as string) : undefined,
      categories: categories ? (categories as string).split(',') : undefined,
      priority: priority as string
    };

    const insights = await aiOrchestrator.generateBusinessInsights(request);
    
    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Business insights error:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🏷️ TRANSACTION CATEGORIZATION ENDPOINT
 * Auto-categorize financial transactions
 */
router.post('/categorize', enhancedTenantMiddleware, async (req, res) => {
  try {
    const { transaction } = req.body;
    const tenantId = req.tenant?.tenantId;

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction data is required' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const result = await automationEngine.categorizeTransaction(tenantId, transaction);
    
    res.json({
      success: true,
      categorization: result
    });
  } catch (error) {
    console.error('Transaction categorization error:', error);
    res.status(500).json({ 
      error: 'Failed to categorize transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🎯 CASH FLOW FORECAST ENDPOINT
 * Generate intelligent cash flow predictions
 */
router.get('/forecast/cashflow/:months', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const months = parseInt(req.params.months);

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    if (isNaN(months) || months < 1 || months > 12) {
      return res.status(400).json({ error: 'Months must be between 1 and 12' });
    }

    const forecast = await aiOrchestrator.generateCashFlowForecast(tenantId, months);
    
    res.json({
      success: true,
      forecast
    });
  } catch (error) {
    console.error('Cash flow forecast error:', error);
    res.status(500).json({ 
      error: 'Failed to generate cash flow forecast',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔔 PROACTIVE MONITORING ENDPOINT
 * Get proactive alerts and recommendations
 */
router.get('/monitoring/alerts', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const monitoring = await automationEngine.performProactiveMonitoring(tenantId);
    
    res.json({
      success: true,
      monitoring
    });
  } catch (error) {
    console.error('Proactive monitoring error:', error);
    res.status(500).json({ 
      error: 'Failed to get monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📈 AUTOMATION METRICS ENDPOINT
 * Get automation performance metrics
 */
router.get('/automation/metrics', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { start, end } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const period = {
      start: start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date()
    };

    const metrics = await automationEngine.getAutomationMetrics(tenantId, period);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Automation metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get automation metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📊 AI MODEL PERFORMANCE ENDPOINT
 * Get AI model performance metrics
 */
router.get('/performance', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { modelType, period } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const where: any = { tenantId };
    if (modelType) where.modelType = modelType;
    if (period) {
      const periodDate = new Date(period as string);
      where.period = { gte: periodDate };
    }

    const performance = await prisma.aIModelPerformance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('AI performance metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 🔄 PROCESS EVENT ENDPOINT
 * Manually trigger event processing (for testing/debugging)
 */
router.post('/events/process', enhancedTenantMiddleware, async (req, res) => {
  try {
    const { event } = req.body;
    const tenantId = req.tenant?.tenantId;

    if (!event) {
      return res.status(400).json({ error: 'Event data is required' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    // Ensure event has tenant ID
    event.tenantId = tenantId;
    event.id = event.id || `manual_${Date.now()}`;
    event.timestamp = event.timestamp || new Date();

    const result = await eventProcessor.processEvent(event);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Event processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 📋 BUSINESS INSIGHTS MANAGEMENT
 */
router.get('/insights/list', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { limit = 20, offset = 0, priority, type } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const where: any = { tenantId, isActive: true };
    if (priority) where.priority = priority;
    if (type) where.type = type;

    const insights = await prisma.businessInsight.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.businessInsight.count({ where });
    
    res.json({
      success: true,
      insights,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('Insights list error:', error);
    res.status(500).json({ 
      error: 'Failed to get insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ✅ MARK INSIGHT AS VIEWED
 */
router.patch('/insights/:id/viewed', enhancedTenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const insight = await prisma.businessInsight.update({
      where: { 
        id,
        tenantId // Ensure tenant ownership
      },
      data: {
        viewed: true,
        viewedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      insight
    });
  } catch (error) {
    console.error('Mark insight viewed error:', error);
    res.status(500).json({ 
      error: 'Failed to mark insight as viewed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 💬 CONVERSATION HISTORY ENDPOINT
 */
router.get('/conversations', enhancedTenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId;
    const { userId, limit = 50 } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const where: any = { tenantId };
    if (userId) where.userId = userId;

    const conversations = await prisma.conversationHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Conversation history error:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;