import { Router } from 'express';
import { AIController } from '@/controllers/aiController';
import { requirePermission } from '@/middleware/authMiddleware';

const router = Router();

/**
 * AI SERVICES HEALTH CHECK
 * Test if OpenAI and other AI services are working
 */
router.get('/health', async (req, res) => {
  try {
    const { AIService } = await import('@/services/aiService');
    const aiService = AIService.getInstance();
    
    // Test if OpenAI is configured
    const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;
    const isVertexAIConfigured = !!process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    // Simple test query if OpenAI is available
    let openaiTest = null;
    if (isOpenAIConfigured) {
      try {
        const testResult = await aiService.processNaturalLanguageQuery(
          "What is 2+2?",
          "test"
        );
        openaiTest = { status: 'working', response: testResult.answer };
      } catch (error: any) {
        openaiTest = { status: 'error', error: error?.message || 'Unknown error' };
      }
    }
    
    res.json({
      status: 'healthy',
      services: {
        openai: {
          configured: isOpenAIConfigured,
          test: openaiTest
        },
        vertexai: {
          configured: isVertexAIConfigured
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * AI-POWERED TRANSACTION CATEGORIZATION
 * Automatically categorize transactions using AI
 */
router.post('/categorize-transaction', 
  requirePermission('transaction:create'),
  AIController.categorizeTransaction
);

/**
 * OCR RECEIPT PROCESSING
 * Extract data from receipts and invoices using AI
 */
router.post('/process-receipt',
  AIController.getUploadMiddleware(),
  requirePermission('transaction:create'),
  AIController.processReceipt
);

/**
 * FINANCIAL INSIGHTS GENERATION
 * AI-powered analysis of financial patterns and recommendations
 */
router.get('/insights',
  // Temporarily disabled for testing: requirePermission('account:read'),
  AIController.getFinancialInsights
);

/**
 * CASH FLOW FORECASTING
 * Predictive analytics for future cash flows
 */
router.get('/forecast-cashflow',
  requirePermission('account:read'),
  AIController.forecastCashFlow
);

/**
 * ANOMALY DETECTION
 * Detect unusual transactions and potential fraud
 */
router.get('/detect-anomalies',
  requirePermission('account:read'),
  AIController.detectAnomalies
);

/**
 * MCP AGENT STATUS
 * View AI agents and their capabilities
 */
router.get('/agents',
  requirePermission('account:read'),
  AIController.getAgentStatus
);

/**
 * SMART SUGGESTIONS
 * AI-generated suggestions for business optimization
 */
router.get('/suggestions',
  requirePermission('account:read'),
  AIController.getSmartSuggestions
);

/**
 * NATURAL LANGUAGE QUERY
 * Ask questions about finances in plain English
 */
router.post('/query',
  requirePermission('account:read'),
  AIController.processNaturalLanguageQuery
);

/**
 * AI ASSIST FOR INVOICE CREATION
 * Advanced AI-powered assistance for smart invoice creation
 */
router.post('/invoice-assist',
  requirePermission('transaction:create'),
  AIController.aiAssistInvoiceCreation
);

export default router; 