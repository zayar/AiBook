/**
 * 🤖 AI COPILOT CONTROLLER
 * 
 * API endpoints for the Financial AI Copilot functionality:
 * - Natural language query processing
 * - Financial health overview
 * - Semantic search
 * - Conversation history
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { FinancialCopilotService } from '../ai/services/FinancialCopilotService';
import { VectorStoreService } from '../ai/services/VectorStoreService';
import { EnhancedFinancialMetricsService } from '../services/enhancedFinancialMetricsService';
import { redisCacheService } from '../services/redisCacheService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const querySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(1000, 'Query too long'),
  sessionId: z.string().optional(),
  context: z.object({
    currentPage: z.string().optional(),
    selectedEntity: z.object({
      type: z.string(),
      id: z.string()
    }).optional(),
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional()
  }).optional()
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  entityTypes: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  amountRange: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  limit: z.number().min(1).max(50).optional()
});

export class AICopilotController {
  private static copilotService = new FinancialCopilotService();
  private static vectorStore = new VectorStoreService();

  /**
   * 🤖 PROCESS NATURAL LANGUAGE QUERY
   * POST /api/v1/ai/copilot/query
   */
  static async processQuery(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = querySchema.parse(req.body);
      
      // Generate session ID if not provided
      const sessionId = validatedData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = {
        query: validatedData.query,
        sessionId,
        tenantId,
        userId: req.user?.uid,
        context: validatedData.context ? {
          currentPage: validatedData.context.currentPage,
          selectedEntity: validatedData.context.selectedEntity,
          timeframe: validatedData.context.timeframe ? {
            start: new Date(validatedData.context.timeframe.start),
            end: new Date(validatedData.context.timeframe.end)
          } : undefined
        } : undefined
      };

      console.log(`🤖 Processing AI query: "${validatedData.query}" for tenant: ${tenantId}`);

      const response = await AICopilotController.copilotService.processQuery(query);

      res.json({
        success: true,
        data: response,
        sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('AI Copilot query error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to process AI query',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 GET FINANCIAL HEALTH OVERVIEW
   * GET /api/v1/ai/copilot/health
   */
  static async getFinancialHealth(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      console.log(`📊 Generating financial health overview for tenant: ${tenantId}`);

      const healthOverview = await AICopilotController.copilotService.getFinancialHealthOverview(tenantId);

      res.json({
        success: true,
        data: healthOverview,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Financial health overview error:', error);
      res.status(500).json({
        error: 'Failed to generate financial health overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔍 SEMANTIC SEARCH
   * POST /api/v1/ai/copilot/search
   */
  static async semanticSearch(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const validatedData = searchSchema.parse(req.body);

      console.log(`🔍 Performing semantic search: "${validatedData.query}" for tenant: ${tenantId}`);

      const filters = {
        entityTypes: validatedData.entityTypes,
        dateRange: validatedData.dateRange ? {
          start: new Date(validatedData.dateRange.start),
          end: new Date(validatedData.dateRange.end)
        } : undefined,
        amountRange: validatedData.amountRange
      };

      const searchResults = await AICopilotController.copilotService.searchFinancialData(
        validatedData.query,
        tenantId,
        filters
      );

      res.json({
        success: true,
        data: searchResults,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Semantic search error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid search parameters',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to perform semantic search',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📜 GET CONVERSATION HISTORY
   * GET /api/v1/ai/copilot/conversations
   */
  static async getConversationHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { sessionId, limit = 10, offset = 0 } = req.query;

      console.log(`📜 Fetching conversation history for tenant: ${tenantId}`);

      const conversations = await prisma.conversationHistory.findMany({
        where: {
          tenantId,
          ...(sessionId && { sessionId: sessionId as string })
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        select: {
          id: true,
          sessionId: true,
          query: true,
          intent: true,
          response: true,
          confidence: true,
          feedback: true,
          executionTime: true,
          createdAt: true
        }
      });

      const totalCount = await prisma.conversationHistory.count({
        where: {
          tenantId,
          ...(sessionId && { sessionId: sessionId as string })
        }
      });

      res.json({
        success: true,
        data: {
          conversations,
          pagination: {
            total: totalCount,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: totalCount > Number(offset) + Number(limit)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Conversation history error:', error);
      res.status(500).json({
        error: 'Failed to fetch conversation history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 👍 PROVIDE FEEDBACK
   * POST /api/v1/ai/copilot/feedback
   */
  static async provideFeedback(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const feedbackSchema = z.object({
        conversationId: z.string(),
        feedback: z.enum(['helpful', 'not_helpful', 'partially_helpful']),
        comment: z.string().optional()
      });

      const validatedData = feedbackSchema.parse(req.body);

      console.log(`👍 Recording feedback for conversation: ${validatedData.conversationId}`);

      await prisma.conversationHistory.update({
        where: {
          id: validatedData.conversationId,
          tenantId // Ensure tenant owns this conversation
        },
        data: {
          feedback: validatedData.feedback,
          ...(validatedData.comment && {
            response: {
              // Merge with existing response data
              ...(await prisma.conversationHistory.findUnique({
                where: { id: validatedData.conversationId }
              }))?.response as any || {},
              userComment: validatedData.comment
            }
          })
        }
      });

      res.json({
        success: true,
        message: 'Feedback recorded successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Feedback recording error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid feedback data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to record feedback',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔄 RETRAIN MODELS
   * POST /api/v1/ai/copilot/retrain
   */
  static async retrainModels(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const retrainSchema = z.object({
        modelTypes: z.array(z.enum(['categorization', 'anomaly_detection', 'cash_flow_prediction'])).optional(),
        forceRetrain: z.boolean().optional()
      });

      const validatedData = retrainSchema.parse(req.body);

      console.log(`🔄 Initiating model retraining for tenant: ${tenantId}`);

      // This would trigger actual model retraining in production
      // For now, just log and return success
      
      const retrainResults = {
        status: 'initiated',
        modelTypes: validatedData.modelTypes || ['categorization', 'anomaly_detection'],
        estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        message: 'Model retraining has been initiated. You will receive a notification when complete.'
      };

      res.json({
        success: true,
        data: retrainResults,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Model retraining error:', error);
      res.status(500).json({
        error: 'Failed to initiate model retraining',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📈 GET AI PERFORMANCE METRICS
   * GET /api/v1/ai/copilot/metrics
   */
  static async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      console.log(`📈 Fetching AI performance metrics for tenant: ${tenantId}`);

      // Get conversation metrics
      const conversationStats = await prisma.conversationHistory.groupBy({
        by: ['intent'],
        where: { tenantId },
        _count: { _all: true },
        _avg: { confidence: true, executionTime: true }
      });

      // Get feedback distribution
      const feedbackStats = await prisma.conversationHistory.groupBy({
        by: ['feedback'],
        where: { 
          tenantId,
          feedback: { not: null }
        },
        _count: { _all: true }
      });

      // Get recent activity
      const recentActivity = await prisma.conversationHistory.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      });

      const metrics = {
        conversationStats,
        feedbackStats,
        recentActivity,
        performanceSummary: {
          averageConfidence: conversationStats.reduce((sum, stat) => sum + (stat._avg.confidence || 0), 0) / conversationStats.length || 0,
          averageResponseTime: conversationStats.reduce((sum, stat) => sum + (stat._avg.executionTime || 0), 0) / conversationStats.length || 0,
          totalConversations: conversationStats.reduce((sum, stat) => sum + stat._count._all, 0),
          userSatisfaction: this.calculateSatisfactionScore(feedbackStats)
        }
      };

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 📊 GET ENHANCED FINANCIAL METRICS
   * GET /api/v1/ai/copilot/metrics/enhanced
   */
  static async getEnhancedFinancialMetrics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { period = 'current_month', force_refresh = 'false' } = req.query;
      const forceRefresh = force_refresh === 'true';

      console.log(`📊 Getting enhanced financial metrics for tenant: ${tenantId}, period: ${period}`);

      const metricsService = new EnhancedFinancialMetricsService(tenantId);

      // Force refresh if requested
      if (forceRefresh) {
        await metricsService.invalidateCache(period as string);
      }

      const startTime = Date.now();
      const metrics = await metricsService.getFinancialMetrics(period as string);
      const executionTime = Date.now() - startTime;

      // Get cache stats for monitoring
      const cacheStats = await redisCacheService.getCacheStats(tenantId);

      res.json({
        success: true,
        data: {
          metrics,
          performance: {
            executionTime,
            fromCache: executionTime < 100, // Likely from cache if very fast
            cacheStats
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Enhanced financial metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch enhanced financial metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 🔄 INVALIDATE FINANCIAL CACHE
   * POST /api/v1/ai/copilot/cache/invalidate
   */
  static async invalidateFinancialCache(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenant?.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      const { pattern } = req.body;

      console.log(`🗑️ Invalidating cache for tenant: ${tenantId}, pattern: ${pattern}`);

      const success = await redisCacheService.invalidateTenantCache(tenantId, pattern);

      res.json({
        success,
        message: success ? 'Cache invalidated successfully' : 'Cache invalidation failed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cache invalidation error:', error);
      res.status(500).json({
        error: 'Failed to invalidate cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper method to calculate satisfaction score
  private static calculateSatisfactionScore(feedbackStats: any[]): number {
    const totalFeedback = feedbackStats.reduce((sum, stat) => sum + stat._count._all, 0);
    if (totalFeedback === 0) return 0;

    const positiveWeight = feedbackStats.find(stat => stat.feedback === 'helpful')?._count._all || 0;
    const partialWeight = (feedbackStats.find(stat => stat.feedback === 'partially_helpful')?._count._all || 0) * 0.5;
    
    return ((positiveWeight + partialWeight) / totalFeedback) * 100;
  }
}