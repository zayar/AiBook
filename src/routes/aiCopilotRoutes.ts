/**
 * 🤖 AI COPILOT ROUTES
 * 
 * API routes for Financial AI Copilot functionality
 */

import { Router } from 'express';
import { AICopilotController } from '../controllers/aiCopilotController';
import { authMiddleware } from '../middleware/authMiddleware';
import { enhancedTenantMiddleware } from '../middleware/enhancedTenantMiddleware';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(enhancedTenantMiddleware);

/**
 * 🤖 NATURAL LANGUAGE QUERY
 * Process conversational financial queries
 */
router.post('/query', AICopilotController.processQuery);

/**
 * 📊 FINANCIAL HEALTH OVERVIEW
 * Get AI-powered financial health assessment
 */
router.get('/health', AICopilotController.getFinancialHealth);

/**
 * 🔍 SEMANTIC SEARCH
 * Search financial data using natural language
 */
router.post('/search', AICopilotController.semanticSearch);

/**
 * 📜 CONVERSATION HISTORY
 * Get past conversations with the AI copilot
 */
router.get('/conversations', AICopilotController.getConversationHistory);

/**
 * 👍 FEEDBACK
 * Provide feedback on AI responses
 */
router.post('/feedback', AICopilotController.provideFeedback);

/**
 * 🔄 RETRAIN MODELS
 * Initiate retraining of AI models (admin only)
 */
router.post('/retrain', AICopilotController.retrainModels);

/**
 * 📈 PERFORMANCE METRICS
 * Get AI copilot performance metrics (admin only)
 */
router.get('/metrics', AICopilotController.getPerformanceMetrics);

/**
 * 📊 ENHANCED FINANCIAL METRICS
 * Get cached financial metrics with Redis acceleration
 */
router.get('/metrics/enhanced', AICopilotController.getEnhancedFinancialMetrics);

/**
 * 🔄 CACHE MANAGEMENT
 * Invalidate financial data cache
 */
router.post('/cache/invalidate', AICopilotController.invalidateFinancialCache);

export default router;