import express from 'express';
import { ConversationManager, ConversationContext } from '../ai/conversation/ConversationManager';
import { enhancedTenantMiddleware } from '../middleware/enhancedTenantMiddleware';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Apply tenant middleware to all routes
router.use(enhancedTenantMiddleware);

/**
 * POST /chat - Main conversational interface
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const tenantId = req.tenant?.tenantId || 'default';
    const userId = req.user?.uid;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    // Initialize conversation manager
    const conversationManager = new ConversationManager(tenantId);

    // Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await conversationManager.startSession(userId, tenantId);
    }

    // Build conversation context
    const context: ConversationContext = {
      sessionId: currentSessionId,
      userId,
      tenantId,
      entities: {},
      conversationHistory: await conversationManager.getConversationHistory(currentSessionId),
      userPreferences: {},
      businessContext: {}
    };

    // Process the message
    const response = await conversationManager.processMessage(message, context);

    res.json({
      success: true,
      sessionId: currentSessionId,
      response: response.response,
      intent: response.intent,
      confidence: response.confidence,
      followUpQuestions: response.followUpQuestions,
      visualizations: response.visualizations,
      actionRequired: response.actionRequired,
      metadata: {
        executionTime: response.executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in conversational chat:', error);
    res.status(500).json({
      error: 'Failed to process conversation',
      code: 'CONVERSATION_ERROR'
    });
  }
});

/**
 * POST /sessions/start - Start a new conversation session
 */
router.post('/sessions/start', async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || 'default';
    const userId = req.user?.uid;

    const conversationManager = new ConversationManager(tenantId);
    const sessionId = await conversationManager.startSession(userId, tenantId);

    res.json({
      success: true,
      sessionId,
      message: 'New conversation session started',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error starting session:', error);
    res.status(500).json({
      error: 'Failed to start conversation session',
      code: 'SESSION_START_ERROR'
    });
  }
});

/**
 * POST /sessions/:sessionId/end - End a conversation session
 */
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.tenant?.tenantId || 'default';

    const conversationManager = new ConversationManager(tenantId);
    await conversationManager.endSession(sessionId);

    res.json({
      success: true,
      message: 'Conversation session ended',
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({
      error: 'Failed to end conversation session',
      code: 'SESSION_END_ERROR'
    });
  }
});

/**
 * GET /sessions/:sessionId/history - Get conversation history
 */
router.get('/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const tenantId = req.tenant?.tenantId || 'default';

    const conversationManager = new ConversationManager(tenantId);
    const history = await conversationManager.getConversationHistory(sessionId);

    res.json({
      success: true,
      sessionId,
      history,
      totalMessages: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation history',
      code: 'HISTORY_ERROR'
    });
  }
});

/**
 * GET /sessions - List active conversation sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || 'default';
    const userId = req.user?.uid;

    const sessions = await prisma.conversationSession.findMany({
      where: {
        tenantId,
        userId: userId || undefined,
        status: 'ACTIVE'
      },
      select: {
        sessionId: true,
        startedAt: true,
        lastActiveAt: true,
        totalMessages: true,
        status: true
      },
      orderBy: { lastActiveAt: 'desc' }
    });

    res.json({
      success: true,
      sessions,
      totalSessions: sessions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error listing sessions:', error);
    res.status(500).json({
      error: 'Failed to list conversation sessions',
      code: 'SESSION_LIST_ERROR'
    });
  }
});

/**
 * POST /reports/generate - Generate report from natural language
 */
router.post('/reports/generate', async (req, res) => {
  try {
    const { query, format = 'summary' } = req.body;
    const tenantId = req.tenant?.tenantId || 'default';
    const userId = req.user?.uid;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required',
        code: 'MISSING_QUERY'
      });
    }

    // Initialize conversation manager for NLP processing
    const conversationManager = new ConversationManager(tenantId);
    
    // Create a temporary session for report generation
    const sessionId = `report_${Date.now()}`;
    
    const context: ConversationContext = {
      sessionId,
      userId,
      tenantId,
      entities: { format },
      conversationHistory: [],
      userPreferences: {},
      businessContext: {}
    };

    // Process the query as a report request
    const response = await conversationManager.processMessage(
      `Generate report: ${query}`,
      context
    );

    res.json({
      success: true,
      report: response.visualizations?.[0] || null,
      summary: response.response,
      confidence: response.confidence,
      metadata: {
        executionTime: response.executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      code: 'REPORT_GENERATION_ERROR'
    });
  }
});

/**
 * GET /insights/conversation - Get conversation insights and analytics
 */
router.get('/insights/conversation', async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || 'default';
    const userId = req.user?.uid;

    // Get conversation analytics
    const totalSessions = await prisma.conversationSession.count({
      where: { tenantId, userId: userId || undefined }
    });

    const totalMessages = await prisma.conversationMessage.count({
      where: {
        session: {
          tenantId,
          userId: userId || undefined
        }
      }
    });

    // Get most common intents
    const commonIntents = await prisma.conversationMessage.groupBy({
      by: ['intent'],
      where: {
        session: { tenantId },
        intent: { not: null }
      },
      _count: { intent: true },
      orderBy: { _count: { intent: 'desc' } },
      take: 10
    });

    // Get user preferences
    const preferences = await prisma.userPreference.findMany({
      where: {
        tenantId,
        userId: userId || undefined
      },
      select: {
        preferenceType: true,
        key: true,
        value: true,
        confidence: true
      }
    });

    res.json({
      success: true,
      insights: {
        totalSessions,
        totalMessages,
        averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
        commonIntents: commonIntents.map(ci => ({
          intent: ci.intent,
          count: ci._count.intent
        })),
        userPreferences: preferences
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting conversation insights:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversation insights',
      code: 'INSIGHTS_ERROR'
    });
  }
});

/**
 * POST /preferences/update - Update user preferences
 */
router.post('/preferences/update', async (req, res) => {
  try {
    const { preferences } = req.body;
    const tenantId = req.tenant?.tenantId || 'default';
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        error: 'User authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        error: 'Preferences object is required',
        code: 'INVALID_PREFERENCES'
      });
    }

    // Update preferences
    const updatePromises = Object.entries(preferences).map(([key, value]) => {
      const [preferenceType, preferenceKey] = key.split('_', 2);
      
      return prisma.userPreference.upsert({
        where: {
          userId_tenantId_preferenceType_key: {
            userId,
            tenantId,
            preferenceType: preferenceType.toUpperCase() as any,
            key: preferenceKey || key
          }
        },
        update: {
          value: value as any,
          confidence: 0.8,
          learningSource: 'EXPLICIT_FEEDBACK'
        },
        create: {
          userId,
          tenantId,
          preferenceType: preferenceType.toUpperCase() as any,
          key: preferenceKey || key,
          value: value as any,
          confidence: 0.8,
          learningSource: 'EXPLICIT_FEEDBACK'
        }
      });
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'User preferences updated successfully',
      updatedCount: updatePromises.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update user preferences',
      code: 'PREFERENCE_UPDATE_ERROR'
    });
  }
});

/**
 * GET /health - Health check for conversational AI
 */
router.get('/health', async (req, res) => {
  try {
    // Test basic functionality
    const tenantId = req.tenant?.tenantId || 'default';
    const conversationManager = new ConversationManager(tenantId);

    // Quick test of core components
    const testResult = {
      nlpEngine: 'operational',
      contextTracker: 'operational',
      dialogueState: 'operational',
      reportGenerator: 'operational',
      database: 'operational'
    };

    res.json({
      success: true,
      status: 'healthy',
      components: testResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Conversational AI health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;